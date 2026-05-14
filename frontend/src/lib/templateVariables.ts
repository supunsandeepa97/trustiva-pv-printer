export interface TemplateVariable {
  key: string;
  label: string;
  example: string;
}

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { key: 'company_name',  label: 'Company Name',    example: 'TRUSTIVA (PVT) LTD' },
  { key: 'voucher_no',    label: 'Voucher Number',   example: 'PV-0001' },
  { key: 'date',          label: 'Date',             example: '15/01/2024' },
  { key: 'payee_name',    label: 'Payee Name',       example: 'ABC Supplies Inc.' },
  { key: 'amount',        label: 'Amount',           example: 'LKR 1,234.56' },
  { key: 'amount_words',  label: 'Amount in Words',  example: 'Rupees One Thousand Two Hundred Thirty Four Only' },
  { key: 'description',   label: 'Description/Memo', example: 'Office supplies purchase' },
  { key: 'bank_name',     label: 'Bank Name',        example: 'Commercial Bank' },
  { key: 'cheque_no',     label: 'Cheque No',        example: '001234' },
  { key: 'currency',      label: 'Currency',         example: 'LKR' },
  { key: 'account_name',  label: 'Account Name',     example: '6000 - Supplies' },
  { key: 'prepared_by',   label: 'Prepared By',      example: 'John Silva' },
];

export const VOUCHER_FIELDS = [
  { key: 'logo',          label: 'Company Logo',     group: 'header' },
  { key: 'voucher_no',    label: 'Voucher Number',   group: 'info' },
  { key: 'date',          label: 'Date',             group: 'info' },
  { key: 'payee_name',    label: 'Payee Name',       group: 'info' },
  { key: 'description',   label: 'Description',      group: 'info' },
  { key: 'bank_name',     label: 'Bank Name',        group: 'info' },
  { key: 'cheque_no',     label: 'Cheque No',        group: 'info' },
  { key: 'account_name',  label: 'Account Name',     group: 'info' },
  { key: 'currency',      label: 'Currency',         group: 'info' },
  { key: 'amount',        label: 'Amount',           group: 'amount' },
  { key: 'amount_words',  label: 'Amount in Words',  group: 'amount' },
  { key: 'prepared_by',   label: 'Prepared By',      group: 'info' },
  { key: 'signature',     label: 'Signature Lines',  group: 'signature' },
];
