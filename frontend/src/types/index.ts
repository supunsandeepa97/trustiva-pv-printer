export type Role = 'super_admin' | 'finance_manager' | 'finance_user' | 'viewer';
export type VoucherStatus = 'draft' | 'pending' | 'printed' | 'cancelled';
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type PaperSize = 'A5_portrait' | 'A5_landscape' | 'custom';

export interface User {
  id: string;
  company_id: string;
  company_name: string;
  name: string;
  email: string;
  role: Role;
  is_active?: boolean;
  is_platform_admin?: boolean;
  approval_status?: 'pending' | 'approved' | 'rejected';
  created_at?: string;
}

export interface Company {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  tax_number?: string;
  logo_url?: string;
  watermark_url?: string;
  settings?: Record<string, string>;
  is_active?: boolean;
  created_at?: string;
}

export interface PlatformCompany {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  user_count: number;
  voucher_count: number;
  total_amount: number;
  last_activity?: string;
}

export interface TemplateConfig {
  visible_fields: string[];
  styles: {
    headerBg: string;
    titleColor: string;
    accentColor: string;
    fontSize?: number;
  };
  signature_labels: {
    left: string;
    center: string;
    right: string;
  };
  footer_text?: string;
  show_watermark?: boolean;
  watermark_text?: string;
}

export interface VoucherTemplate {
  id: string;
  company_id: string;
  name: string;
  config: TemplateConfig;
  paper_size: PaperSize;
  is_default: boolean;
  created_at?: string;
}

export interface ImportRecord {
  id: string;
  company_id: string;
  created_by?: string;
  created_by_name?: string;
  filename: string;
  format: 'xlsx' | 'csv' | 'txt';
  total_rows: number;
  imported_rows: number;
  duplicate_count: number;
  error_count: number;
  status: ImportStatus;
  mapping_template?: Record<string, unknown>;
  created_at: string;
}

export interface PaymentVoucher {
  id: string;
  company_id: string;
  import_id?: string;
  template_id?: string;
  template_name?: string;
  template_config?: TemplateConfig;
  paper_size?: PaperSize;
  voucher_no: string;
  date: string;
  payee_name: string;
  amount: number;
  amount_words?: string;
  description?: string;
  bank_name?: string;
  cheque_no?: string;
  currency: string;
  account_name?: string;
  prepared_by?: string;
  status: VoucherStatus;
  created_at: string;
  updated_at?: string;
}

export interface PrintLog {
  id: string;
  voucher_id: string;
  printed_by?: string;
  printed_by_name?: string;
  printed_at: string;
  pdf_path?: string;
  copies: number;
}

export interface DashboardStats {
  total: string;
  printed: string;
  pending: string;
  draft: string;
  cancelled: string;
  total_printed_amount: string;
}

export interface DailyChartPoint {
  day: string;
  count: string;
}

export interface MonthlyChartPoint {
  month: string;
  count: string;
  volume: string;
}

export interface PaginatedResponse<T> {
  rows: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ColumnMapping {
  [field: string]: number;
}

export interface ImportPreviewData {
  file: {
    path: string;
    filename: string;
    originalName: string;
    format: string;
    totalRows: number;
  };
  headers: string[];
  previewRows: Record<string, string>[];
  suggestedMapping: ColumnMapping;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}
