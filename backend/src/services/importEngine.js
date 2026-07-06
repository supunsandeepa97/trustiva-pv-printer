const fs   = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const crypto = require('crypto');
const { convertToWords } = require('./amountWords');
const { generateVoucherNumber } = require('../utils/numberGenerator');

// Known QuickBooks Desktop column names for auto-mapping
const QB_COLUMN_MAP = {
  voucher_no:   ['num', 'number', 'trans #', 'check number', 'cheque no', 'ref no', 'reference no', 'chk no', 'check #'],
  date:         ['date', 'trans date', 'payment date', 'check date'],
  payee_name:   ['vendor name', 'vendor', 'name', 'payee', 'paid to', 'payee name', 'party name'],
  amount:       ['amount', 'total', 'debit amount', 'payment amount', 'credit amount', 'original amount'],
  description:  ['memo', 'description', 'notes', 'particulars', 'narration', 'details'],
  bank_name:    ['bank', 'bank account', 'bank name', 'bank account name'],
  cheque_no:    ['check number', 'cheque no', 'cheque number', 'chq no', 'ref', 'reference'],
  account_name: ['account', 'account name', 'ledger', 'gl account', 'account title'],
  currency:     ['currency', 'curr', 'ccy'],
  prepared_by:  ['prepared by', 'entered by', 'created by', 'entered by name'],
};

// ─── Delimiter detection ─────────────────────────────────────
function detectDelimiter(rawText) {
  const sample = rawText.split('\n').slice(0, 3).join('\n');
  const tabCount   = (sample.match(/\t/g)   || []).length;
  const commaCount = (sample.match(/,/g)    || []).length;
  if (tabCount >= commaCount) return '\t';
  return ',';
}

// ─── RFC4180-style delimited text parser ─────────────────────
// A plain line.split(delim) breaks on quoted fields like "Smith, John",1500.00 —
// it shifts every column after the quoted comma. This walks the raw text
// character-by-character so quoted delimiters/newlines are treated as data.
function parseDelimitedText(text, delim) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') { inQuotes = true; }
    else if (char === delim) { row.push(field); field = ''; }
    else if (char === '\r') { /* skip, \n below ends the row */ }
    else if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else { field += char; }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }

  return rows;
}

// ─── Skip QuickBooks header metadata rows ────────────────────
function skipHeaderRows(rows) {
  const knownCols = new Set([
    'date','vendor name','vendor','name','amount','memo','check number',
    'account','account name','num','payee','reference','chk no','narration',
    'particulars','description','currency','bank',
  ]);

  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i];
    if (!row || !row.length) continue;
    const matches = row.filter(cell =>
      knownCols.has(String(cell || '').toLowerCase().trim())
    ).length;
    if (matches >= 2) {
      return { headerRowIndex: i, headers: row.map(c => String(c || '').trim()), dataRows: rows.slice(i + 1) };
    }
  }
  return { headerRowIndex: 0, headers: rows[0]?.map(c => String(c || '').trim()) || [], dataRows: rows.slice(1) };
}

// ─── Parse uploaded file ─────────────────────────────────────
function parseFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.xlsx' || ext === '.xls') {
    const wb    = xlsx.readFile(filePath, { cellDates: true });
    const ws    = wb.Sheets[wb.SheetNames[0]];
    const raw   = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const { headers, dataRows } = skipHeaderRows(raw);
    return { headers, rows: dataRows.filter(r => r.some(c => c !== '' && c != null)) };
  }

  // CSV / TXT
  const rawText  = fs.readFileSync(filePath, 'utf-8').replace(/^﻿/, ''); // strip BOM
  const delim    = ext === '.txt' ? '\t' : detectDelimiter(rawText);
  const parsed   = parseDelimitedText(rawText, delim).map(r => r.map(c => c.trim()));
  const { headers, dataRows } = skipHeaderRows(parsed.filter(r => r.length > 1));
  return { headers, rows: dataRows.filter(r => r.some(c => c !== '')) };
}

// ─── Auto-map columns ────────────────────────────────────────
function autoMapColumns(headers) {
  const mapping = {};
  const normalized = headers.map(h => h.toLowerCase().trim());

  for (const [field, aliases] of Object.entries(QB_COLUMN_MAP)) {
    for (let idx = 0; idx < normalized.length; idx++) {
      if (aliases.includes(normalized[idx])) {
        mapping[field] = idx;
        break;
      }
    }
    if (!(field in mapping)) {
      // Partial match fallback
      for (let idx = 0; idx < normalized.length; idx++) {
        const h = normalized[idx];
        if (aliases.some(a => h.includes(a) || a.includes(h))) {
          mapping[field] = idx;
          break;
        }
      }
    }
  }
  return mapping;
}

// ─── Date parsing ────────────────────────────────────────────
function parseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (s === '') return null;

  // Handle Excel numeric date
  if (!isNaN(s) && s.length < 6) {
    const d = xlsx.SSF.parse_date_code(parseFloat(s));
    if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
  }

  const formats = [
    { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, fn: m => `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}` }, // MM/DD/YYYY
    { regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/,   fn: m => `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}` }, // MM-DD-YYYY
    { regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/,   fn: m => `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}` }, // YYYY-MM-DD
    { regex: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, fn: m => `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}` }, // DD.MM.YYYY
    { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/,  fn: m => `20${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}` }, // M/D/YY
  ];

  for (const { regex, fn } of formats) {
    const m = s.match(regex);
    if (m) {
      const iso = fn(m);
      if (!isNaN(Date.parse(iso))) return iso;
    }
  }

  // Fallback: try native Date parse
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return null;
}

// ─── Amount parsing ───────────────────────────────────────────
function parseAmount(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const s = String(raw).trim();
  // Handle negative in parentheses: (1,234.56)
  const negative = s.startsWith('(') && s.endsWith(')');
  const cleaned  = s.replace(/[\$LKR,\s()']/gi, '').replace(/[()]/g, '');
  const num      = parseFloat(cleaned);
  if (isNaN(num)) return null;
  return negative ? -Math.abs(num) : num;
}

// ─── Duplicate hash ───────────────────────────────────────────
function computeDuplicateHash(payeeName, amount, date) {
  const key = `${String(payeeName || '').toLowerCase().trim()}|${parseFloat(amount || 0).toFixed(2)}|${date || ''}`;
  return crypto.createHash('md5').update(key).digest('hex');
}

// ─── Apply mapping to rows ────────────────────────────────────
function applyMapping(rows, headers, mapping) {
  return rows.map((row, i) => {
    const obj = { _rowIndex: i + 2 };
    for (const [field, colIdx] of Object.entries(mapping)) {
      obj[field] = row[colIdx] !== undefined ? String(row[colIdx]).trim() : '';
    }
    return obj;
  });
}

// ─── Detect duplicates vs DB ──────────────────────────────────
async function detectDuplicates(mappedRows, companyId, client) {
  const hashes = mappedRows.map(r => {
    const amount = parseAmount(r.amount);
    const date   = parseDate(r.date);
    return computeDuplicateHash(r.payee_name, amount, date);
  });

  const result = await client.query(
    'SELECT duplicate_hash FROM payment_vouchers WHERE company_id = $1 AND duplicate_hash = ANY($2)',
    [companyId, hashes]
  );
  const existingSet = new Set(result.rows.map(r => r.duplicate_hash));

  const newRows  = [];
  const dupRows  = [];
  mappedRows.forEach((row, i) => {
    if (existingSet.has(hashes[i])) {
      dupRows.push({ ...row, _hash: hashes[i] });
    } else {
      newRows.push({ ...row, _hash: hashes[i] });
    }
  });

  return { newRows, duplicateRows: dupRows };
}

// ─── Full import save (transactional) ────────────────────────
async function saveImport({ filePath, filename, format, mappedRows, skipDuplicates, userId, companyId, mappingTemplate }, client) {
  const allHashes = mappedRows.map(r => {
    const amount = parseAmount(r.amount) ?? 0;
    const date   = parseDate(r.date) || new Date().toISOString().split('T')[0];
    return computeDuplicateHash(r.payee_name, amount, date);
  });

  // Detect existing duplicates
  const existingResult = await client.query(
    'SELECT duplicate_hash FROM payment_vouchers WHERE company_id = $1 AND duplicate_hash = ANY($2)',
    [companyId, allHashes]
  );
  const existingSet = new Set(existingResult.rows.map(r => r.duplicate_hash));

  let rows      = mappedRows;
  let dupCount  = 0;
  if (skipDuplicates) {
    const filtered = mappedRows.filter((r, i) => !existingSet.has(allHashes[i]));
    dupCount       = mappedRows.length - filtered.length;
    rows           = filtered;
  }

  // Create import record
  const importResult = await client.query(
    `INSERT INTO imports (company_id, created_by, filename, format, total_rows, imported_rows, duplicate_count, status, mapping_template)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', $8) RETURNING id`,
    [companyId, userId, filename, format, mappedRows.length, rows.length, dupCount, mappingTemplate ? JSON.stringify(mappingTemplate) : null]
  );
  const importId = importResult.rows[0].id;

  // Get default template
  const tmplResult = await client.query(
    'SELECT id FROM voucher_templates WHERE company_id = $1 AND is_default = TRUE LIMIT 1',
    [companyId]
  );
  const defaultTemplateId = tmplResult.rows[0]?.id || null;

  // Batch insert vouchers (100 per batch)
  const BATCH = 100;
  let errorCount = 0;
  let negativeAmountCount = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const values = [];
    const params = [];
    let pIdx = 1;

    for (const row of batch) {
      const amount = parseAmount(row.amount);
      const date   = parseDate(row.date) || new Date().toISOString().split('T')[0];

      // Skip rows that have absolutely no useful data
      if (amount === null && !row.payee_name) { errorCount++; continue; }

      // A payment voucher is money going OUT — a negative/parenthesized amount is a
      // refund/credit, not a payment. convertToWords() renders negatives as the
      // literal "Invalid Amount", so these would print unusable vouchers. Skip and
      // track separately (do NOT abs() — that would silently turn a refund into a
      // payment) so the summary can flag them for manual classification.
      if (amount !== null && amount < 0) { negativeAmountCount++; continue; }

      const effectiveAmount = amount ?? 0;
      const amountWords = convertToWords(effectiveAmount);
      const hash        = computeDuplicateHash(row.payee_name, effectiveAmount, date);
      const voucherNo   = await generateVoucherNumber(companyId, client);

      params.push(
        companyId, importId, defaultTemplateId,
        voucherNo, date, (row.payee_name || '').trim(), effectiveAmount, amountWords,
        row.description || null, row.bank_name || null, row.cheque_no || null,
        row.currency || 'LKR', row.account_name || null, row.prepared_by || null,
        'pending', hash
      );
      values.push(`($${pIdx},$${pIdx+1},$${pIdx+2},$${pIdx+3},$${pIdx+4},$${pIdx+5},$${pIdx+6},$${pIdx+7},$${pIdx+8},$${pIdx+9},$${pIdx+10},$${pIdx+11},$${pIdx+12},$${pIdx+13},$${pIdx+14},$${pIdx+15})`);
      pIdx += 16;
    }

    if (values.length > 0) {
      await client.query(
        `INSERT INTO payment_vouchers
         (company_id,import_id,template_id,voucher_no,date,payee_name,amount,amount_words,description,bank_name,cheque_no,currency,account_name,prepared_by,status,duplicate_hash)
         VALUES ${values.join(',')}`,
        params
      );
    }
  }

  // importedRows counts only rows actually inserted (candidate rows minus skips).
  const importedRows = rows.length - errorCount - negativeAmountCount;

  // The imports record was created with imported_rows = rows.length before the
  // skip counts were known (importId is needed for the voucher FK inside the
  // loop). Reconcile now. There's no negative_amount_count column, so fold the
  // negative-amount skips into the persisted error_count; the broken-out
  // negativeAmountCount is still returned to the API/frontend below.
  await client.query(
    'UPDATE imports SET imported_rows = $1, error_count = $2 WHERE id = $3',
    [importedRows, errorCount + negativeAmountCount, importId]
  );

  return { importId, totalRows: mappedRows.length, importedRows, duplicateCount: dupCount, errorCount, negativeAmountCount };
}

module.exports = {
  parseFile,
  autoMapColumns,
  applyMapping,
  detectDuplicates,
  saveImport,
  parseDate,
  parseAmount,
  computeDuplicateHash,
};
