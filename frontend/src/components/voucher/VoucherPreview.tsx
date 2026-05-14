'use client';
import type { PaymentVoucher, Company, VoucherTemplate } from '@/types';
import VoucherA5 from './VoucherA5';
import { forwardRef } from 'react';

interface VoucherPreviewProps {
  voucher:  PaymentVoucher;
  company:  Company;
  template?: VoucherTemplate;
}

const VoucherPreview = forwardRef<HTMLDivElement, VoucherPreviewProps>(function VoucherPreview(
  { voucher, company, template },
  ref
) {
  return (
    <div
      className="flex items-center justify-center"
      style={{ minHeight: '350px', background: 'repeating-linear-gradient(45deg, #f8fafc, #f8fafc 10px, #f1f5f9 10px, #f1f5f9 20px)', borderRadius: '12px', padding: '24px' }}
    >
      <div style={{ transform: 'scale(0.82)', transformOrigin: 'top center', boxShadow: '0 8px 40px rgba(0,0,0,0.15)', borderRadius: '4px' }}>
        <VoucherA5 ref={ref} voucher={voucher} company={company} template={template} />
      </div>
    </div>
  );
});

export default VoucherPreview;
