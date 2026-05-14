'use client';
import React, { forwardRef } from 'react';
import type { PaymentVoucher, Company, VoucherTemplate } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';

interface VoucherA5Props {
  voucher:  PaymentVoucher;
  company:  Company;
  template?: VoucherTemplate;
}

function isVisible(field: string, template?: VoucherTemplate): boolean {
  const fields = template?.config?.visible_fields;
  if (!fields) return true;
  return fields.includes(field);
}

const NAVY  = '#0F172A';
const GRAY  = '#F3F4F6';
const LABEL = '#6B7280';
const BORDER = '1px solid #D1D5DB';

const VoucherA5 = forwardRef<HTMLDivElement, VoucherA5Props>(function VoucherA5(
  { voucher, company, template },
  ref
) {
  const sigLabels = template?.config?.signature_labels || {
    left: 'Prepared by', center: 'Checked by', right: 'Approved by',
  };

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body  { margin: 0; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div
        ref={ref}
        style={{
          width:           '210mm',
          minHeight:       '297mm',
          fontFamily:      "'Arial', sans-serif",
          fontSize:        '10pt',
          color:           '#111',
          backgroundColor: '#fff',
          display:         'flex',
          flexDirection:   'column',
          boxSizing:       'border-box',
          border:          '1px solid #9CA3AF',
        }}
      >
        {/* ── TOP ACCENT BAR ─────────────────────────────────── */}
        <div style={{ height: '5mm', backgroundColor: NAVY, flexShrink: 0 }} />

        {/* ── MAIN CONTENT AREA ──────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8mm 12mm 10mm' }}>

          {/* ── HEADER ───────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6mm' }}>

            {/* Left: logo + company details */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4mm' }}>
              {company.logo_url && (
                <img
                  src={company.logo_url}
                  alt="Logo"
                  style={{ width: '70px', height: '70px', objectFit: 'contain', flexShrink: 0 }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div>
                <div style={{ fontWeight: '800', fontSize: '16pt', color: NAVY, lineHeight: '1.15' }}>
                  {company.name || 'COMPANY NAME'}
                </div>
                {company.address && (
                  <div style={{ fontSize: '8.5pt', color: '#6B7280', marginTop: '2px', maxWidth: '80mm' }}>
                    {company.address}
                  </div>
                )}
                {company.phone && (
                  <div style={{ fontSize: '8.5pt', color: '#6B7280' }}>{company.phone}</div>
                )}
                {company.email && (
                  <div style={{ fontSize: '8.5pt', color: '#6B7280' }}>{company.email}</div>
                )}
              </div>
            </div>

            {/* Right: PAYMENT VOUCHER badge */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{
                backgroundColor: NAVY,
                color:           '#fff',
                fontWeight:      '700',
                fontSize:        '11pt',
                letterSpacing:   '1.5px',
                padding:         '4mm 6mm',
                borderRadius:    '4px',
                display:         'inline-block',
              }}>
                PAYMENT VOUCHER
              </div>
            </div>
          </div>

          {/* ── INFO GRID TABLE ──────────────────────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5mm', border: BORDER }}>
            <tbody>
              {/* Row 1: Bank | Date */}
              <tr>
                <Cell label="Bank"
                  value={isVisible('bank_name', template) ? (voucher.bank_name || '') : ''}
                  w="25%" />
                <Cell label="Payee Name"
                  value={voucher.payee_name}
                  w="35%" bold />
                <Cell label="Date"
                  value={isVisible('date', template) ? formatDate(voucher.date) : ''}
                  w="20%" />
                <Cell label="Voucher No"
                  value={isVisible('voucher_no', template) ? voucher.voucher_no : ''}
                  w="20%" bold />
              </tr>
              {/* Row 2: Cheque No | Currency */}
              <tr>
                <Cell label="Cheque No"
                  value={isVisible('cheque_no', template) ? (voucher.cheque_no || '') : ''} />
                <Cell label="Account"
                  value={isVisible('account_name', template) ? (voucher.account_name || '') : ''} />
                <Cell label="Currency"
                  value={isVisible('currency', template) ? (voucher.currency || 'LKR') : ''}
                  colSpan={2} />
              </tr>
            </tbody>
          </table>

          {/* ── ACCOUNT / DESCRIPTION / AMOUNT TABLE ─────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0' }}>
            <thead>
              <tr>
                {(['Account', 'Description', 'Amount'] as const).map((h, i) => (
                  <th key={h} style={{
                    border:          BORDER,
                    padding:         '2.5mm 3.5mm',
                    fontSize:        '9.5pt',
                    fontWeight:      '700',
                    color:           NAVY,
                    backgroundColor: GRAY,
                    textAlign:       i === 2 ? 'right' : 'left',
                    width:           i === 0 ? '25%' : i === 2 ? '22%' : undefined,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: BORDER, padding: '3mm 3.5mm', height: '38mm', verticalAlign: 'top', fontSize: '10pt' }}>
                  {voucher.account_name || ''}
                </td>
                <td style={{ border: BORDER, padding: '3mm 3.5mm', height: '38mm', verticalAlign: 'top', fontSize: '10pt' }}>
                  {voucher.description || ''}
                </td>
                <td style={{ border: BORDER, padding: '3mm 3.5mm', height: '38mm', verticalAlign: 'top', textAlign: 'right', fontWeight: '600', fontSize: '10pt' }}>
                  {voucher.amount ? formatCurrency(voucher.amount, voucher.currency) : ''}
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── AMOUNT IN WORDS + TOTAL ───────────────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '7mm' }}>
            <tbody>
              <tr>
                <td style={{
                  border:          BORDER,
                  borderTop:       'none',
                  padding:         '3.5mm 3.5mm',
                  backgroundColor: '#F9FAFB',
                  verticalAlign:   'middle',
                }}>
                  {isVisible('amount_words', template) && (
                    <span style={{ fontSize: '9.5pt' }}>
                      <span style={{ fontWeight: '600', color: LABEL }}>Amount In Words: </span>
                      <span style={{ fontStyle: 'italic', color: '#111' }}>{voucher.amount_words || ''}</span>
                    </span>
                  )}
                </td>
                <td style={{
                  border:          BORDER,
                  borderTop:       'none',
                  borderLeft:      'none',
                  padding:         '3.5mm 3.5mm',
                  width:           '22%',
                  textAlign:       'right',
                  fontWeight:      '800',
                  fontSize:        '11pt',
                  color:           NAVY,
                  backgroundColor: '#F9FAFB',
                  whiteSpace:      'nowrap',
                  verticalAlign:   'middle',
                }}>
                  {isVisible('amount', template) && voucher.amount
                    ? formatCurrency(voucher.amount, voucher.currency)
                    : ''}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Spacer */}
          <div style={{ flex: 1, minHeight: '10mm' }} />

          {/* ── SIGNATURE SECTION ────────────────────────────── */}
          {isVisible('signature', template) && (
            <>
              {/* 3 signature boxes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '5mm', marginBottom: '5mm' }}>
                {[sigLabels.left, sigLabels.center, sigLabels.right].map((label, i) => (
                  <div key={i} style={{
                    border:       BORDER,
                    borderRadius: '3px',
                    padding:      '3mm 4mm',
                    textAlign:    'center',
                  }}>
                    <div style={{
                      fontSize:         '8pt',
                      fontWeight:       '700',
                      color:            NAVY,
                      textTransform:    'uppercase',
                      letterSpacing:    '0.5px',
                      borderBottom:     `1px solid #E5E7EB`,
                      paddingBottom:    '2mm',
                      marginBottom:     '2mm',
                    }}>
                      {label}
                    </div>
                    {/* signing space */}
                    <div style={{ height: '22mm' }} />
                    <div style={{ borderTop: '1.5px solid #374151', marginTop: '2mm' }} />
                  </div>
                ))}
              </div>

              {/* Received by box */}
              <div style={{ border: BORDER, borderRadius: '3px', padding: '3mm 4mm' }}>
                <div style={{
                  fontSize:      '8pt',
                  fontWeight:    '700',
                  color:         NAVY,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom:  `1px solid #E5E7EB`,
                  paddingBottom: '2mm',
                  marginBottom:  '3mm',
                }}>
                  Received by
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6mm' }}>
                  {['Name', 'Signature'].map(lbl => (
                    <div key={lbl}>
                      <div style={{ fontSize: '8.5pt', color: LABEL, marginBottom: '16mm' }}>{lbl} :</div>
                      <div style={{ borderBottom: '1.5px solid #374151' }} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

        </div>

        {/* ── FOOTER BAR ─────────────────────────────────────── */}
        <div style={{
          backgroundColor: GRAY,
          borderTop:       BORDER,
          padding:         '2mm 12mm',
          display:         'flex',
          justifyContent:  'space-between',
          alignItems:      'center',
          flexShrink:      0,
        }}>
          <span style={{ fontSize: '7pt', color: LABEL }}>
            Printed: {new Date().toLocaleString('en-GB')}
          </span>
          <span style={{ fontSize: '7pt', color: LABEL }}>Trustiva Print Suite</span>
        </div>
      </div>
    </>
  );
});

/* ─── Info grid cell ─────────────────────────────────────────── */
function Cell({
  label, value, w, bold, colSpan,
}: {
  label: string; value: string; w?: string; bold?: boolean; colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      style={{
        border:        BORDER,
        padding:       '2mm 3mm',
        verticalAlign: 'top',
        width:         w,
      }}
    >
      <div style={{ fontSize: '7.5pt', color: LABEL, marginBottom: '1mm' }}>{label}</div>
      <div style={{ fontSize: '10pt', fontWeight: bold ? '700' : '500', color: '#111' }}>{value || '—'}</div>
    </td>
  );
}

export default VoucherA5;
