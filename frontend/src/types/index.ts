export type UserRole =
  | 'SYSTEM_ADMIN'
  | 'PROCUREMENT_ADMIN'
  | 'PROCUREMENT_MANAGER'
  | 'FINANCE'
  | 'EMPLOYEE'
  | 'VENDOR';

export interface UserDto {
  userId: number;
  name: string;
  email: string;
  phone?: string;
  roleId: number;
  roleName: UserRole;
  status: string;
  vendorId?: number | null;
  vendorCompanyName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: UserDto;
}

export interface DemoAccount {
  role: UserRole;
  name: string;
  email: string;
  password: string;
  badge: string;
}

export interface RoleDto {
  roleId: number;
  roleName: UserRole;
  description: string;
  createdAt: string;
}

export interface CategoryDto {
  categoryId: number;
  categoryName: string;
  description: string;
  status: string;
  vendorCount: number;
  totalSpend: number;
}

export interface VendorDto {
  vendorId: number;
  vendorCode: string;
  companyName: string;
  businessRegNo: string;
  taxId: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  registrationDate: string;
  approvalStatus: 'APPROVED' | 'PENDING' | 'REJECTED' | 'SUSPENDED' | 'UNDER_REVIEW';
  approvalRemarks?: string;
  categoryId: number;
  categoryName: string;
  managedByUserId?: number;
  managedByName?: string;
  vendorUserId?: number;
  averageRating?: number | null;
  activeContractsCount: number;
  totalOrdersCount: number;
  totalSpend: number;
  createdAt: string;
  updatedAt: string;
}

export interface VendorDocumentDto {
  documentId: number;
  vendorId: number;
  vendorName: string;
  vendorCode: string;
  documentType: string;
  originalFileName: string;
  fileUrl: string;
  uploadedAt: string;
  expiryDate?: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  verificationRemarks?: string;
  verifiedById?: number;
  verifiedByName?: string;
  verifiedAt?: string;
  expiringSoon: boolean;
  expired: boolean;
}

export interface ContractDto {
  contractId: number;
  contractNumber: string;
  vendorId: number;
  vendorName: string;
  vendorCode: string;
  title: string;
  startDate: string;
  endDate: string;
  contractValue: number;
  terms: string;
  documentUrl?: string;
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
  daysRemaining: number;
  expiringSoon: boolean;
  createdAt: string;
}

export interface PurchaseOrderItemDto {
  poItemId?: number;
  poId?: number;
  itemName: string;
  description?: string;
  quantity: number;
  receivedQuantity?: number;
  unitPrice: number;
  taxAmount?: number;
  lineTotal?: number;
}

export interface PurchaseOrderDto {
  poId: number;
  poNumber: string;
  vendorId: number;
  vendorName: string;
  vendorCode: string;
  createdById: number;
  createdByName: string;
  approvedById?: number;
  approvedByName?: string;
  orderDate: string;
  expectedDeliveryDate: string;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  invoicedAmount: number;
  remainingOrderLimit: number;
  status: string;
  remarks?: string;
  requisitionId?: number;
  items: PurchaseOrderItemDto[];
  createdAt: string;
}

export interface RequisitionDto {
  requisitionId: number;
  requisitionNumber: string;
  title: string;
  description?: string;
  department: string;
  priority: string;
  neededBy: string;
  categoryId: number;
  categoryName: string;
  preferredVendorId?: number;
  preferredVendorName?: string;
  requestedById: number;
  requestedByName: string;
  approvedById?: number;
  approvedByName?: string;
  estimatedAmount: number;
  status: string;
  remarks?: string;
  generatedPoId?: number;
  items: PurchaseOrderItemDto[];
  createdAt: string;
}

export interface InvoiceDto {
  invoiceId: number;
  vendorId: number;
  vendorName: string;
  vendorCode: string;
  poId: number;
  poNumber: string;
  poTotalAmount: number;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingBalance: number;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvalRemarks?: string;
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  documentUrl?: string;
  verifiedByName?: string;
  overdue: boolean;
  createdAt: string;
}

export interface PaymentDto {
  paymentId: number;
  invoiceId: number;
  invoiceNumber: string;
  poId: number;
  poNumber: string;
  vendorId: number;
  vendorName: string;
  paidById: number;
  paidByName: string;
  paymentDate: string;
  amount: number;
  invoiceTotal: number;
  remainingInvoiceBalance: number;
  paymentMethod: string;
  transactionRef: string;
  status: string;
  remarks?: string;
  createdAt: string;
}

export interface PerformanceReviewDto {
  reviewId: number;
  vendorId: number;
  vendorName: string;
  vendorCategory?: string;
  reviewedById: number;
  reviewedByName: string;
  poId: number;
  poNumber: string;
  qualityScore: number;
  deliveryScore: number;
  communicationScore: number;
  complianceScore: number;
  overallScore: number;
  comments?: string;
  reviewDate: string;
  createdAt: string;
}

export interface CommunicationDto {
  communicationId: number;
  vendorId: number;
  vendorName: string;
  senderId: number;
  senderName: string;
  senderRole: string;
  subject: string;
  message: string;
  sentAt: string;
  status: string;
}

export interface NotificationDto {
  notificationId: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  referenceId?: number;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLogDto {
  auditId: number;
  actorId?: number;
  actorEmail: string;
  actorRole: string;
  module: string;
  action: string;
  entityType: string;
  entityId?: number;
  details: string;
  ipAddress: string;
  createdAt: string;
}

export interface DashboardSummaryDto {
  totalVendors: number;
  approvedVendors: number;
  pendingVendorApprovals: number;
  activeContracts: number;
  contractsNearingExpiry: number;
  activePurchaseOrders: number;
  pendingPoApprovals: number;
  pendingRequisitions: number;
  pendingDocuments: number;
  pendingInvoices: number;
  overdueInvoices: number;
  totalSpendYtd: number;
  outstandingPayables: number;
  averageVendorRating: number;
  monthlySpendTrend: { month: string; spend: number }[];
  categoryDistribution: { name: string; vendors: number; spend: number }[];
  topPerformingVendors: {
    vendorId: number;
    companyName: string;
    categoryName: string;
    rating: number;
    totalSpend: number;
  }[];
  recentPurchaseOrders: PurchaseOrderDto[];
  expiringContracts: ContractDto[];
  recentActivity: AuditLogDto[];
}
