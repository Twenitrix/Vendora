package com.vendora.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class ApiDtos {

    // --- AUTH & USER ---
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoginRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Valid email is required")
        private String email;

        @NotBlank(message = "Password is required")
        private String password;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuthResponse {
        private String token;
        private UserDto user;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserDto {
        private Long userId;
        private String name;
        private String email;
        private String phone;
        private Long roleId;
        private String roleName;
        private String status;
        private Long vendorId;
        private String vendorCompanyName;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserCreateRequest {
        @NotBlank(message = "Name is required")
        private String name;

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;

        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        private String password;

        private String phone;

        @NotNull(message = "Role ID is required")
        private Long roleId;

        private String status;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserUpdateRequest {
        @NotBlank(message = "Name is required")
        private String name;
        private String phone;
        private Long roleId;
        private String status;
        private String password;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoleDto {
        private Long roleId;
        private String roleName;
        private String description;
        private LocalDateTime createdAt;
    }

    // --- CATEGORY ---
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryDto {
        private Long categoryId;
        private String categoryName;
        private String description;
        private String status;
        private long vendorCount;
        private BigDecimal totalSpend;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryRequest {
        @NotBlank(message = "Category name is required")
        private String categoryName;
        private String description;
        private String status;
    }

    // --- VENDOR ---
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VendorDto {
        private Long vendorId;
        private String vendorCode;
        private String companyName;
        private String businessRegNo;
        private String taxId;
        private String contactPerson;
        private String email;
        private String phone;
        private String address;
        private String city;
        private String state;
        private String country;
        private LocalDate registrationDate;
        private String approvalStatus;
        private String approvalRemarks;
        private Long categoryId;
        private String categoryName;
        private Long managedByUserId;
        private String managedByName;
        private Long vendorUserId;
        private Double averageRating;
        private long activeContractsCount;
        private long totalOrdersCount;
        private BigDecimal totalSpend;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VendorRequest {
        private String vendorCode;

        @NotBlank(message = "Company name is required")
        private String companyName;

        @NotBlank(message = "Business registration number is required")
        private String businessRegNo;

        @NotBlank(message = "Tax ID is required")
        private String taxId;

        @NotBlank(message = "Contact person is required")
        private String contactPerson;

        @NotBlank(message = "Email is required")
        @Email(message = "Valid email is required")
        private String email;

        @NotBlank(message = "Phone is required")
        private String phone;

        @NotBlank(message = "Address is required")
        private String address;

        @NotBlank(message = "City is required")
        private String city;

        @NotBlank(message = "State is required")
        private String state;

        @NotBlank(message = "Country is required")
        private String country;

        @NotNull(message = "Category is required")
        private Long categoryId;

        private Long managedByUserId;
        private Long vendorUserId;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApprovalDecisionRequest {
        @NotBlank(message = "Status/Action is required")
        private String status;
        private String remarks;
    }

    // --- DOCUMENT ---
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VendorDocumentDto {
        private Long documentId;
        private Long vendorId;
        private String vendorName;
        private String vendorCode;
        private String documentType;
        private String originalFileName;
        private String fileUrl;
        private LocalDateTime uploadedAt;
        private LocalDate expiryDate;
        private String verificationStatus;
        private String verificationRemarks;
        private Long verifiedById;
        private String verifiedByName;
        private LocalDateTime verifiedAt;
        private boolean expiringSoon;
        private boolean expired;
    }

    // --- CONTRACT ---
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ContractDto {
        private Long contractId;
        private String contractNumber;
        private Long vendorId;
        private String vendorName;
        private String vendorCode;
        private String title;
        private LocalDate startDate;
        private LocalDate endDate;
        private BigDecimal contractValue;
        private String terms;
        private String documentUrl;
        private String status;
        private long daysRemaining;
        private boolean expiringSoon;
        private LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ContractRequest {
        @NotNull(message = "Vendor is required")
        private Long vendorId;

        @NotBlank(message = "Contract title is required")
        private String title;

        @NotNull(message = "Start date is required")
        private LocalDate startDate;

        @NotNull(message = "End date is required")
        private LocalDate endDate;

        @NotNull(message = "Contract value is required")
        @DecimalMin(value = "0.01", message = "Contract value must be positive")
        private BigDecimal contractValue;

        @NotBlank(message = "Contract terms are required")
        private String terms;

        private String documentUrl;
        private String status;
    }

    // --- PURCHASE ORDER & ITEMS ---
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PurchaseOrderItemDto {
        private Long poItemId;
        private Long poId;
        private String itemName;
        private String description;
        private Integer quantity;
        private Integer receivedQuantity;
        private BigDecimal unitPrice;
        private BigDecimal taxAmount;
        private BigDecimal lineTotal;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PurchaseOrderItemRequest {
        @NotBlank(message = "Item name is required")
        private String itemName;

        private String description;

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        private Integer quantity;

        @NotNull(message = "Unit price is required")
        @DecimalMin(value = "0.01", message = "Unit price must be greater than zero")
        private BigDecimal unitPrice;

        @DecimalMin(value = "0.00", message = "Tax cannot be negative")
        private BigDecimal taxAmount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PurchaseOrderDto {
        private Long poId;
        private String poNumber;
        private Long vendorId;
        private String vendorName;
        private String vendorCode;
        private Long createdById;
        private String createdByName;
        private Long approvedById;
        private String approvedByName;
        private LocalDate orderDate;
        private LocalDate expectedDeliveryDate;
        private BigDecimal subtotalAmount;
        private BigDecimal taxAmount;
        private BigDecimal totalAmount;
        private BigDecimal invoicedAmount;
        private BigDecimal remainingOrderLimit;
        private String status;
        private String remarks;
        private Long requisitionId;
        private List<PurchaseOrderItemDto> items;
        private LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PurchaseOrderRequest {
        @NotNull(message = "Vendor is required")
        private Long vendorId;

        private LocalDate orderDate;

        @NotNull(message = "Expected delivery date is required")
        private LocalDate expectedDeliveryDate;

        private String remarks;
        private Long requisitionId;

        @NotEmpty(message = "At least one purchase order item is required")
        @Valid
        private List<PurchaseOrderItemRequest> items;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GoodsReceiptRequest {
        private String deliveryNoteRef;
        private String conditionStatus;
        private String remarks;
        private Map<Long, Integer> receivedItemQuantities;
    }

    // --- PURCHASE REQUISITION (S2P Workflow) ---
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RequisitionDto {
        private Long requisitionId;
        private String requisitionNumber;
        private String title;
        private String description;
        private String department;
        private String priority;
        private LocalDate neededBy;
        private Long categoryId;
        private String categoryName;
        private Long preferredVendorId;
        private String preferredVendorName;
        private Long requestedById;
        private String requestedByName;
        private Long approvedById;
        private String approvedByName;
        private BigDecimal estimatedAmount;
        private String status;
        private String remarks;
        private Long generatedPoId;
        private List<PurchaseOrderItemDto> items;
        private LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RequisitionRequest {
        @NotBlank(message = "Title is required")
        private String title;
        private String description;
        @NotBlank(message = "Department is required")
        private String department;
        private String priority;
        @NotNull(message = "Needed by date is required")
        private LocalDate neededBy;
        @NotNull(message = "Category is required")
        private Long categoryId;
        private Long preferredVendorId;
        @NotEmpty(message = "At least one item is required")
        @Valid
        private List<PurchaseOrderItemRequest> items;
    }

    // --- INVOICE ---
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InvoiceDto {
        private Long invoiceId;
        private Long vendorId;
        private String vendorName;
        private String vendorCode;
        private Long poId;
        private String poNumber;
        private BigDecimal poTotalAmount;
        private String invoiceNumber;
        private LocalDate invoiceDate;
        private LocalDate dueDate;
        private BigDecimal subtotal;
        private BigDecimal taxAmount;
        private BigDecimal totalAmount;
        private BigDecimal paidAmount;
        private BigDecimal outstandingBalance;
        private String approvalStatus;
        private String approvalRemarks;
        private String paymentStatus;
        private String documentUrl;
        private String verifiedByName;
        private boolean overdue;
        private LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InvoiceRequest {
        @NotNull(message = "Vendor ID is required")
        private Long vendorId;

        @NotNull(message = "Purchase Order ID is required")
        private Long poId;

        @NotBlank(message = "Invoice number is required")
        private String invoiceNumber;

        @NotNull(message = "Invoice date is required")
        private LocalDate invoiceDate;

        @NotNull(message = "Due date is required")
        private LocalDate dueDate;

        @NotNull(message = "Subtotal is required")
        @DecimalMin(value = "0.01", message = "Subtotal must be greater than zero")
        private BigDecimal subtotal;

        @NotNull(message = "Tax amount is required")
        @DecimalMin(value = "0.00", message = "Tax amount cannot be negative")
        private BigDecimal taxAmount;

        private String documentUrl;
    }

    // --- PAYMENT ---
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentDto {
        private Long paymentId;
        private Long invoiceId;
        private String invoiceNumber;
        private Long poId;
        private String poNumber;
        private Long vendorId;
        private String vendorName;
        private Long paidById;
        private String paidByName;
        private LocalDateTime paymentDate;
        private BigDecimal amount;
        private BigDecimal invoiceTotal;
        private BigDecimal remainingInvoiceBalance;
        private String paymentMethod;
        private String transactionRef;
        private String status;
        private String remarks;
        private LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentRequest {
        @NotNull(message = "Invoice ID is required")
        private Long invoiceId;

        @NotNull(message = "Payment amount is required")
        @DecimalMin(value = "0.01", message = "Payment amount must be greater than zero")
        private BigDecimal amount;

        @NotBlank(message = "Payment method is required")
        private String paymentMethod;

        @NotBlank(message = "Transaction reference is required")
        private String transactionRef;

        private String remarks;
    }

    // --- PERFORMANCE REVIEW ---
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PerformanceReviewDto {
        private Long reviewId;
        private Long vendorId;
        private String vendorName;
        private String vendorCategory;
        private Long reviewedById;
        private String reviewedByName;
        private Long poId;
        private String poNumber;
        private BigDecimal qualityScore;
        private BigDecimal deliveryScore;
        private BigDecimal communicationScore;
        private BigDecimal complianceScore;
        private BigDecimal overallScore;
        private String comments;
        private LocalDate reviewDate;
        private LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PerformanceReviewRequest {
        @NotNull(message = "Vendor ID is required")
        private Long vendorId;

        @NotNull(message = "Purchase Order ID is required")
        private Long poId;

        @NotNull(message = "Quality score is required")
        @DecimalMin(value = "1.0", message = "Score must be between 1 and 5")
        @DecimalMax(value = "5.0", message = "Score must be between 1 and 5")
        private BigDecimal qualityScore;

        @NotNull(message = "Delivery score is required")
        @DecimalMin(value = "1.0", message = "Score must be between 1 and 5")
        @DecimalMax(value = "5.0", message = "Score must be between 1 and 5")
        private BigDecimal deliveryScore;

        @NotNull(message = "Communication score is required")
        @DecimalMin(value = "1.0", message = "Score must be between 1 and 5")
        @DecimalMax(value = "5.0", message = "Score must be between 1 and 5")
        private BigDecimal communicationScore;

        @NotNull(message = "Compliance score is required")
        @DecimalMin(value = "1.0", message = "Score must be between 1 and 5")
        @DecimalMax(value = "5.0", message = "Score must be between 1 and 5")
        private BigDecimal complianceScore;

        private String comments;
        private LocalDate reviewDate;
    }

    // --- COMMUNICATION ---
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CommunicationDto {
        private Long communicationId;
        private Long vendorId;
        private String vendorName;
        private Long senderId;
        private String senderName;
        private String senderRole;
        private String subject;
        private String message;
        private LocalDateTime sentAt;
        private String status;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CommunicationRequest {
        @NotNull(message = "Vendor ID is required")
        private Long vendorId;

        @NotBlank(message = "Subject is required")
        private String subject;

        @NotBlank(message = "Message body is required")
        private String message;
    }

    // --- NOTIFICATION ---
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NotificationDto {
        private Long notificationId;
        private Long userId;
        private String title;
        private String message;
        private String type;
        private Long referenceId;
        private Boolean isRead;
        private LocalDateTime createdAt;
    }

    // --- AUDIT LOG ---
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuditLogDto {
        private Long auditId;
        private Long actorId;
        private String actorEmail;
        private String actorRole;
        private String module;
        private String action;
        private String entityType;
        private Long entityId;
        private String details;
        private String ipAddress;
        private LocalDateTime createdAt;
    }

    // --- DASHBOARD & ANALYTICS ---
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardSummaryDto {
        private long totalVendors;
        private long approvedVendors;
        private long pendingVendorApprovals;
        private long activeContracts;
        private long contractsNearingExpiry;
        private long activePurchaseOrders;
        private long pendingPoApprovals;
        private long pendingRequisitions;
        private long pendingDocuments;
        private long pendingInvoices;
        private long overdueInvoices;
        private BigDecimal totalSpendYtd;
        private BigDecimal outstandingPayables;
        private Double averageVendorRating;
        private List<Map<String, Object>> monthlySpendTrend;
        private List<Map<String, Object>> categoryDistribution;
        private List<Map<String, Object>> topPerformingVendors;
        private List<PurchaseOrderDto> recentPurchaseOrders;
        private List<ContractDto> expiringContracts;
        private List<AuditLogDto> recentActivity;
    }
}
