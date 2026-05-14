const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
  'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function chunkToWords(n: number): string {
  if (n === 0) return '';
  if (n < 20)  return ONES[n];
  if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? ' ' + ONES[n % 10] : ''}`;
  return `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ' ' + chunkToWords(n % 100) : ''}`;
}

export function convertToWords(amount: number): string {
  if (isNaN(amount) || amount < 0) return 'Invalid Amount';

  const fixed    = amount.toFixed(2);
  const [rupStr, centsStr] = fixed.split('.');
  const rupees   = parseInt(rupStr, 10);
  const cents    = parseInt(centsStr, 10);

  const groups = [
    { divisor: 1_000_000_000, label: 'Billion' },
    { divisor: 1_000_000,     label: 'Million' },
    { divisor: 1_000,         label: 'Thousand' },
    { divisor: 1,             label: '' },
  ];

  let remaining = rupees;
  const parts: string[] = [];
  for (const { divisor, label } of groups) {
    const chunk = Math.floor(remaining / divisor);
    remaining   = remaining % divisor;
    if (chunk > 0) parts.push(`${chunkToWords(chunk)}${label ? ' ' + label : ''}`);
  }

  const rupeePart = rupees === 0 ? 'Zero' : parts.join(' ');
  const centsPart = cents > 0 ? ` and ${chunkToWords(cents)} Cents` : '';
  return `Rupees ${rupeePart}${centsPart} Only`;
}
