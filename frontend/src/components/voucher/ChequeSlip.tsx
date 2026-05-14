'use client';
import React, { forwardRef } from 'react';
import type { PaymentVoucher, Company } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';

interface ChequeSlipProps {
  voucher: PaymentVoucher;
  company: Company;
}

const ChequeSlip = forwardRef<HTMLDivElement, ChequeSlipProps>(function ChequeSlip(
  { voucher, company },
  ref
) {
  return (
    <>
      <style>{`
        @media print {
          @page { size: A5 landscape; margin: 0; }
          body { margin: 0; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div
        ref={ref}
        style={{
          width:           '210mm',
          height:          '148mm',
          padding:         '8mm 12mm',
          fontFamily:      "'Inter', Arial, sans-serif",
          fontSize:        '9pt',
          color:           '#1E293B',
          backgroundColor: '#ffffff',
          display:         'flex',
          flexDirection:   'column',
          boxSizing:       'border-box',
          position:        'relative',
        }}
      >
        {/* Gold top rule */}
        <div style={{ height: '3px', background: 'linear-gradient(90deg,#C9A227,#F0CE35,#C9A227)', marginBottom: '6mm' }} />

        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '5mm' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {company.logo_url && (
              <img src={company.logo_url} alt="logo"
                style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <div>
              <div style={{ fontWeight: '700', fontSize: '11pt', color: '#0F172A', fontFamily: 'Montserrat, Inter, sans-serif' }}>
                {company.name || 'COMPANY NAME'}
              </div>
              {company.address && (
                <div style={{ fontSize: '7pt', color: '#64748B', marginTop: '1px' }}>{company.address}</div>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '7.5pt', color: '#64748B' }}>Cheque No.</div>
            <div style={{ fontWeight: '700', fontSize: '12pt', color: '#C9A227', letterSpacing: '1px' }}>
              {voucher.cheque_no || '—'}
            </div>
            <div style={{ fontSize: '7.5pt', color: '#64748B', marginTop: '2px' }}>{formatDate(voucher.date)}</div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #E2E8F0', marginBottom: '5mm' }} />

        {/* Pay to */}
        <div style={{ marginBottom: '4mm' }}>
          <div style={{ fontSize: '7.5pt', color: '#64748B', marginBottom: '1.5mm', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Pay to the order of
          </div>
          <div style={{
            borderBottom:  '1.5px solid #0F172A',
            paddingBottom: '2mm',
            fontWeight:    '700',
            fontSize:      '13pt',
            color:         '#0F172A',
          }}>
            {voucher.payee_name}
          </div>
        </div>

        {/* Amount row */}
        <div style={{ display: 'flex', gap: '6mm', marginBottom: '4mm', alignItems: 'stretch' }}>
          {/* Amount figures */}
          <div style={{
            border:        '2px solid #C9A227',
            borderRadius:  '6px',
            padding:       '3mm 5mm',
            minWidth:      '50mm',
            textAlign:     'center',
            flexShrink:    0,
          }}>
            <div style={{ fontSize: '7pt', color: '#64748B', marginBottom: '1mm', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</div>
            <div style={{ fontWeight: '800', fontSize: '16pt', color: '#C9A227' }}>
              {formatCurrency(voucher.amount, voucher.currency)}
            </div>
          </div>

          {/* Amount in words */}
          <div style={{ flex: 1, borderBottom: '1px solid #E2E8F0', paddingBottom: '2mm', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{ fontSize: '7pt', color: '#64748B', marginBottom: '1mm', textTransform: 'uppercase', letterSpacing: '0.5px' }}>In words</div>
            <div style={{ fontStyle: 'italic', fontSize: '8.5pt', color: '#334155', lineHeight: '1.4' }}>
              {voucher.amount_words || '—'}
            </div>
          </div>
        </div>

        {/* Bank + description row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm', marginBottom: '4mm' }}>
          <div>
            <div style={{ fontSize: '7pt', color: '#64748B', marginBottom: '1mm' }}>Bank</div>
            <div style={{ fontWeight: '600', fontSize: '9pt', borderBottom: '1px solid #E2E8F0', paddingBottom: '2mm' }}>
              {voucher.bank_name || '—'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '7pt', color: '#64748B', marginBottom: '1mm' }}>Account</div>
            <div style={{ fontWeight: '600', fontSize: '9pt', borderBottom: '1px solid #E2E8F0', paddingBottom: '2mm' }}>
              {voucher.account_name || '—'}
            </div>
          </div>
        </div>

        {voucher.description && (
          <div style={{ marginBottom: '4mm' }}>
            <div style={{ fontSize: '7pt', color: '#64748B', marginBottom: '1mm' }}>Narration</div>
            <div style={{ fontSize: '8pt', color: '#475569', fontStyle: 'italic' }}>{voucher.description}</div>
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Signature row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6mm' }}>
          {['Prepared By', 'Approved By', 'Authorised Signatory'].map(label => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '1.5px solid #334155', marginBottom: '2mm', height: '10mm' }} />
              <div style={{ fontSize: '6.5pt', color: '#64748B' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '3mm', borderTop: '1px solid #F1F5F9', paddingTop: '2mm', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '6pt', color: '#94A3B8' }}>
            Voucher No: {voucher.voucher_no}
          </div>
          <div style={{ fontSize: '6pt', color: '#94A3B8' }}>
            Printed: {new Date().toLocaleString('en-GB')} · Trustiva Print Suite
          </div>
        </div>
      </div>
    </>
  );
});

export default ChequeSlip;
