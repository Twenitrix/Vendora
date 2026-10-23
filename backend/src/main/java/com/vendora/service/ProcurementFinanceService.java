package com.vendora.service;

import com.vendora.dto.ApiDtos.*;
import com.vendora.entity.*;
import com.vendora.exception.BadRequestException;
import com.vendora.exception.ResourceNotFoundException;
import com.vendora.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProcurementFinanceService {

    private final PurchaseOrderRepository poRepository;
    private final PurchaseOrderItemRepository poItemRepository;
    private final PurchaseRequisitionRepository requisitionRepository;
    private final GoodsReceiptRepository goodsReceiptRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final VendorRepository vendorRepository;
    private final VendorCategoryRepository categoryRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final FileStorageService fileStorageService;
    private final SecurityHelper securityHelper;

    // =========================================================================
    // PURCHASE REQUISITIONS (Internal Employee Requests -> PO Auto Generation)
    // =========================================================================

    @Transactional(readOnly = true)
    public List<RequisitionDto> getRequisitions(String status, User currentUser) {
        if (securityHelper.hasRole(currentUser, "VENDOR")) {
            throw new AccessDeniedException("Vendors cannot access internal purchase requisitions");
        }
        List<PurchaseRequisition> list = securityHelper.hasRole(currentUser, "EMPLOYEE")
                ? requisitionRepository.findByRequestedBy_UserIdOrderByCreatedAtDesc(currentUser.getUserId())
                : requisitionRepository.findAllByOrderByCreatedAtDesc();

        return list.stream()
                .filter(r -> status == null || status.isBlank() || "ALL".equalsIgnoreCase(status) || r.getStatus().equalsIgnoreCase(status))
                .map(this::toRequisitionDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public RequisitionDto createRequisition(RequisitionRequest request, User currentUser) {
        securityHelper.requireRoles(currentUser, "EMPLOYEE", "PROCUREMENT_ADMIN", "PROCUREMENT_MANAGER", "SYSTEM_ADMIN");
        VendorCategory category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        Vendor preferredVendor = null;
        if (request.getPreferredVendorId() != null) {
            preferredVendor = vendorRepository.findById(request.getPreferredVendorId()).orElse(null);
        }

        String reqNumber = "REQ-" + LocalDate.now().getYear() + "-" + (1000 + requisitionRepository.count() + 1);
        PurchaseRequisition req = PurchaseRequisition.builder()
                .requisitionNumber(reqNumber)
                .title(request.getTitle().trim())
                .description(request.getDescription())
                .department(request.getDepartment().trim())
                .priority(request.getPriority() != null ? request.getPriority().toUpperCase() : "MEDIUM")
                .neededBy(request.getNeededBy())
                .category(category)
                .preferredVendor(preferredVendor)
                .requestedBy(currentUser)
                .status("PENDING_APPROVAL")
                .build();

        BigDecimal total = BigDecimal.ZERO;
        List<PurchaseRequisitionItem> items = new ArrayList<>();
        for (PurchaseOrderItemRequest itemReq : request.getItems()) {
            BigDecimal sub = itemReq.getUnitPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            BigDecimal tax = itemReq.getTaxAmount() != null ? itemReq.getTaxAmount() : sub.multiply(new BigDecimal("0.10")).setScale(2, RoundingMode.HALF_UP);
            BigDecimal lineTotal = sub.add(tax).setScale(2, RoundingMode.HALF_UP);
            total = total.add(lineTotal);

            items.add(PurchaseRequisitionItem.builder()
                    .requisition(req)
                    .itemName(itemReq.getItemName().trim())
                    .description(itemReq.getDescription())
                    .quantity(itemReq.getQuantity())
                    .estimatedUnitPrice(itemReq.getUnitPrice().setScale(2, RoundingMode.HALF_UP))
                    .taxAmount(tax)
                    .lineTotal(lineTotal)
                    .build());
        }
        req.setItems(items);
        req.setEstimatedAmount(total);

        PurchaseRequisition saved = requisitionRepository.save(req);
        auditService.log(currentUser, "Requisition", "CREATE", "PurchaseRequisition", saved.getRequisitionId(),
                "Created purchase requisition " + saved.getRequisitionNumber() + " ($" + saved.getEstimatedAmount() + ")");

        notificationService.notifyRole("PROCUREMENT_MANAGER",
                "Purchase Requisition Pending Approval",
                saved.getRequisitionNumber() + " (" + saved.getTitle() + ") submitted by " + currentUser.getName() + ".",
                "REQUISITION", saved.getRequisitionId());

        return toRequisitionDto(saved);
    }

    @Transactional
    public RequisitionDto decideRequisition(Long id, ApprovalDecisionRequest decision, User currentUser) {
        securityHelper.requireRoles(currentUser, "PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN", "SYSTEM_ADMIN");
        PurchaseRequisition req = requisitionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase requisition not found"));

        if (!"PENDING_APPROVAL".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Only PENDING_APPROVAL requisitions can be approved or rejected");
        }

        String status = decision.getStatus().trim().toUpperCase();
        if ("APPROVED".equals(status)) {
            req.setStatus("APPROVED");
            req.setApprovedBy(currentUser);
            req.setRemarks(decision.getRemarks());

            if (req.getPreferredVendor() != null) {
                PurchaseOrderRequest poReq = new PurchaseOrderRequest();
                poReq.setVendorId(req.getPreferredVendor().getVendorId());
                poReq.setOrderDate(LocalDate.now());
                poReq.setExpectedDeliveryDate(req.getNeededBy());
                poReq.setRemarks("Auto-generated from Approved Requisition " + req.getRequisitionNumber());
                poReq.setRequisitionId(req.getRequisitionId());
                poReq.setItems(req.getItems().stream().map(ri -> new PurchaseOrderItemRequest(
                        ri.getItemName(), ri.getDescription(), ri.getQuantity(), ri.getEstimatedUnitPrice(), ri.getTaxAmount()
                )).collect(Collectors.toList()));
                PurchaseOrderDto generatedPo = createPurchaseOrderInternal(poReq, req.getRequestedBy(), currentUser, "APPROVED");
                req.setGeneratedPoId(generatedPo.getPoId());
                req.setStatus("ORDER_CREATED");
            }
        } else if ("REJECTED".equals(status) || "RETURNED".equals(status)) {
            req.setStatus(status);
            req.setRemarks(decision.getRemarks());
        } else {
            throw new BadRequestException("Decision status must be APPROVED, REJECTED, or RETURNED");
        }

        PurchaseRequisition saved = requisitionRepository.save(req);
        auditService.log(currentUser, "Requisition", "DECISION_" + status, "PurchaseRequisition", saved.getRequisitionId(),
                "Requisition " + saved.getRequisitionNumber() + " marked " + saved.getStatus());

        notificationService.notifyUser(saved.getRequestedBy(),
                "Requisition " + saved.getStatus(),
                "Your purchase requisition " + saved.getRequisitionNumber() + " was marked " + saved.getStatus() + ".",
                "REQUISITION", saved.getRequisitionId());

        return toRequisitionDto(saved);
    }

    public RequisitionDto toRequisitionDto(PurchaseRequisition r) {
        List<PurchaseOrderItemDto> itemDtos = r.getItems().stream().map(i -> PurchaseOrderItemDto.builder()
                .poItemId(i.getReqItemId())
                .itemName(i.getItemName())
                .description(i.getDescription())
                .quantity(i.getQuantity())
                .receivedQuantity(0)
                .unitPrice(i.getEstimatedUnitPrice())
                .taxAmount(i.getTaxAmount())
                .lineTotal(i.getLineTotal())
                .build()).collect(Collectors.toList());

        return RequisitionDto.builder()
                .requisitionId(r.getRequisitionId())
                .requisitionNumber(r.getRequisitionNumber())
                .title(r.getTitle())
                .description(r.getDescription())
                .department(r.getDepartment())
                .priority(r.getPriority())
                .neededBy(r.getNeededBy())
                .categoryId(r.getCategory() != null ? r.getCategory().getCategoryId() : null)
                .categoryName(r.getCategory() != null ? r.getCategory().getCategoryName() : null)
                .preferredVendorId(r.getPreferredVendor() != null ? r.getPreferredVendor().getVendorId() : null)
                .preferredVendorName(r.getPreferredVendor() != null ? r.getPreferredVendor().getCompanyName() : null)
                .requestedById(r.getRequestedBy().getUserId())
                .requestedByName(r.getRequestedBy().getName())
                .approvedById(r.getApprovedBy() != null ? r.getApprovedBy().getUserId() : null)
                .approvedByName(r.getApprovedBy() != null ? r.getApprovedBy().getName() : null)
                .estimatedAmount(r.getEstimatedAmount())
                .status(r.getStatus())
                .remarks(r.getRemarks())
                .generatedPoId(r.getGeneratedPoId())
                .items(itemDtos)
                .createdAt(r.getCreatedAt())
                .build();
    }

    // =========================================================================
    // PURCHASE ORDERS & PURCHASE ORDER ITEMS
    // =========================================================================

    @Transactional(readOnly = true)
    public List<PurchaseOrderDto> getPurchaseOrders(Long vendorId, String status, String search, User currentUser) {
        if (vendorId != null) {
            securityHelper.enforceVendorAccess(currentUser, vendorId);
        }

        List<PurchaseOrder> list = (vendorId != null)
                ? poRepository.findByVendor_VendorIdOrderByCreatedAtDesc(vendorId)
                : poRepository.findAllByOrderByCreatedAtDesc();

        if (securityHelper.hasRole(currentUser, "VENDOR")) {
            Optional<Vendor> myVendor = securityHelper.getVendorForUser(currentUser);
            list = list.stream()
                    .filter(po -> myVendor.isPresent() && po.getVendor().getVendorId().equals(myVendor.get().getVendorId()))
                    .collect(Collectors.toList());
        } else if (securityHelper.hasRole(currentUser, "EMPLOYEE")) {
            list = list.stream()
                    .filter(po -> po.getCreatedBy().getUserId().equals(currentUser.getUserId()))
                    .collect(Collectors.toList());
        }

        return list.stream()
                .filter(po -> status == null || status.isBlank() || "ALL".equalsIgnoreCase(status) || po.getStatus().equalsIgnoreCase(status))
                .filter(po -> search == null || search.isBlank() ||
                        po.getPoNumber().toLowerCase().contains(search.toLowerCase()) ||
                        po.getVendor().getCompanyName().toLowerCase().contains(search.toLowerCase()) ||
                        (po.getRemarks() != null && po.getRemarks().toLowerCase().contains(search.toLowerCase())))
                .map(this::toPurchaseOrderDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PurchaseOrderDto getPurchaseOrderById(Long id, User currentUser) {
        PurchaseOrder po = poRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase order not found with ID: " + id));
        securityHelper.enforceVendorAccess(currentUser, po.getVendor().getVendorId());
        return toPurchaseOrderDto(po);
    }

    @Transactional
    public PurchaseOrderDto createPurchaseOrder(PurchaseOrderRequest request, User currentUser) {
        securityHelper.requireRoles(currentUser, "SYSTEM_ADMIN", "PROCUREMENT_ADMIN", "PROCUREMENT_MANAGER", "EMPLOYEE");
        return createPurchaseOrderInternal(request, currentUser, null, "PENDING_APPROVAL");
    }

    private PurchaseOrderDto createPurchaseOrderInternal(PurchaseOrderRequest request, User creator, User approver, String initialStatus) {
        Vendor vendor = vendorRepository.findById(request.getVendorId())
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found"));

        if (!"APPROVED".equalsIgnoreCase(vendor.getApprovalStatus())) {
            throw new BadRequestException("Purchase orders can only be created for APPROVED vendors. Current vendor status: " + vendor.getApprovalStatus());
        }

        LocalDate orderDate = request.getOrderDate() != null ? request.getOrderDate() : LocalDate.now();
        if (request.getExpectedDeliveryDate().isBefore(orderDate)) {
            throw new BadRequestException("Expected delivery date cannot be before order date");
        }

        String poNumber = "PO-" + LocalDate.now().getYear() + "-" + (2000 + poRepository.count() + 1) + "-" + UUID.randomUUID().toString().substring(0, 3).toUpperCase();

        PurchaseOrder po = PurchaseOrder.builder()
                .poNumber(poNumber)
                .vendor(vendor)
                .createdBy(creator)
                .approvedBy(approver)
                .orderDate(orderDate)
                .expectedDeliveryDate(request.getExpectedDeliveryDate())
                .status(initialStatus)
                .remarks(request.getRemarks())
                .requisitionId(request.getRequisitionId())
                .build();

        recalculateAndSetItems(po, request.getItems());

        PurchaseOrder saved = poRepository.save(po);
        auditService.log(creator, "PurchaseOrder", "CREATE", "PurchaseOrder", saved.getPoId(),
                "Created PO " + saved.getPoNumber() + " for " + vendor.getCompanyName() + " totaling $" + saved.getTotalAmount());

        notificationService.notifyRole("PROCUREMENT_MANAGER",
                "Purchase Order Pending Approval",
                "PO " + saved.getPoNumber() + " ($" + saved.getTotalAmount() + ") for " + vendor.getCompanyName() + " awaits approval.",
                "PURCHASE_ORDER", saved.getPoId());

        return toPurchaseOrderDto(saved);
    }

    @Transactional
    public PurchaseOrderDto updatePurchaseOrderItems(Long poId, List<PurchaseOrderItemRequest> itemRequests, User currentUser) {
        securityHelper.requireRoles(currentUser, "SYSTEM_ADMIN", "PROCUREMENT_ADMIN", "PROCUREMENT_MANAGER", "EMPLOYEE");
        PurchaseOrder po = poRepository.findById(poId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase Order not found"));

        if (!List.of("DRAFT", "PENDING_APPROVAL").contains(po.getStatus().toUpperCase())) {
            throw new BadRequestException("Items can only be modified when Purchase Order is in DRAFT or PENDING_APPROVAL state. Current state: " + po.getStatus());
        }
        if (itemRequests == null || itemRequests.isEmpty()) {
            throw new BadRequestException("Purchase Order must contain at least one line item");
        }

        recalculateAndSetItems(po, itemRequests);
        PurchaseOrder saved = poRepository.save(po);

        auditService.log(currentUser, "PurchaseOrder", "UPDATE_ITEMS", "PurchaseOrder", saved.getPoId(),
                "Updated line items on PO " + saved.getPoNumber() + ". New backend total: $" + saved.getTotalAmount());
        return toPurchaseOrderDto(saved);
    }

    private void recalculateAndSetItems(PurchaseOrder po, List<PurchaseOrderItemRequest> itemRequests) {
        if (po.getItems() == null) {
            po.setItems(new ArrayList<>());
        } else {
            po.getItems().clear();
        }

        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal totalTax = BigDecimal.ZERO;

        for (PurchaseOrderItemRequest reqItem : itemRequests) {
            if (reqItem.getQuantity() == null || reqItem.getQuantity() <= 0) {
                throw new BadRequestException("Item quantity must be greater than zero");
            }
            if (reqItem.getUnitPrice() == null || reqItem.getUnitPrice().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BadRequestException("Item unit price must be greater than zero");
            }

            BigDecimal itemSubtotal = reqItem.getUnitPrice()
                    .multiply(BigDecimal.valueOf(reqItem.getQuantity()))
                    .setScale(2, RoundingMode.HALF_UP);

            BigDecimal itemTax = reqItem.getTaxAmount() != null
                    ? reqItem.getTaxAmount().setScale(2, RoundingMode.HALF_UP)
                    : itemSubtotal.multiply(new BigDecimal("0.08")).setScale(2, RoundingMode.HALF_UP);

            if (itemTax.compareTo(BigDecimal.ZERO) < 0) {
                throw new BadRequestException("Item tax amount cannot be negative");
            }

            BigDecimal lineTotal = itemSubtotal.add(itemTax).setScale(2, RoundingMode.HALF_UP);

            subtotal = subtotal.add(itemSubtotal);
            totalTax = totalTax.add(itemTax);

            PurchaseOrderItem entityItem = PurchaseOrderItem.builder()
                    .purchaseOrder(po)
                    .itemName(reqItem.getItemName().trim())
                    .description(reqItem.getDescription())
                    .quantity(reqItem.getQuantity())
                    .receivedQuantity(0)
                    .unitPrice(reqItem.getUnitPrice().setScale(2, RoundingMode.HALF_UP))
                    .taxAmount(itemTax)
                    .lineTotal(lineTotal)
                    .build();
            po.getItems().add(entityItem);
        }

        po.setSubtotalAmount(subtotal.setScale(2, RoundingMode.HALF_UP));
        po.setTaxAmount(totalTax.setScale(2, RoundingMode.HALF_UP));
        po.setTotalAmount(subtotal.add(totalTax).setScale(2, RoundingMode.HALF_UP));
    }

    @Transactional
    public PurchaseOrderDto updatePurchaseOrderStatus(Long poId, ApprovalDecisionRequest decision, User currentUser) {
        PurchaseOrder po = poRepository.findById(poId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase Order not found"));

        String targetStatus = decision.getStatus().trim().toUpperCase();
        String currentStatus = po.getStatus().toUpperCase();

        if ("APPROVED".equals(targetStatus) || "REJECTED".equals(targetStatus)) {
            securityHelper.requireRoles(currentUser, "SYSTEM_ADMIN", "PROCUREMENT_ADMIN", "PROCUREMENT_MANAGER");
            if (!"PENDING_APPROVAL".equals(currentStatus) && !"DRAFT".equals(currentStatus)) {
                throw new BadRequestException("Cannot transition PO from " + currentStatus + " to " + targetStatus);
            }
            po.setApprovedBy(currentUser);
            po.setStatus(targetStatus);
        } else if ("ISSUED".equals(targetStatus) || "IN_FULFILLMENT".equals(targetStatus)) {
            if (securityHelper.hasRole(currentUser, "VENDOR")) {
                securityHelper.enforceVendorAccess(currentUser, po.getVendor().getVendorId());
            } else {
                securityHelper.requireRoles(currentUser, "SYSTEM_ADMIN", "PROCUREMENT_ADMIN", "PROCUREMENT_MANAGER");
            }
            if (!List.of("APPROVED", "ISSUED").contains(currentStatus)) {
                throw new BadRequestException("PO must be APPROVED before fulfillment can begin");
            }
            po.setStatus(targetStatus);
        } else if ("DELIVERED".equals(targetStatus) || "PARTIALLY_DELIVERED".equals(targetStatus)) {
            if (securityHelper.hasRole(currentUser, "VENDOR")) {
                securityHelper.enforceVendorAccess(currentUser, po.getVendor().getVendorId());
            }
            if (!List.of("APPROVED", "ISSUED", "IN_FULFILLMENT", "PARTIALLY_DELIVERED").contains(currentStatus)) {
                throw new BadRequestException("Invalid transition to " + targetStatus + " from " + currentStatus);
            }
            po.setStatus(targetStatus);
            if ("DELIVERED".equals(targetStatus)) {
                for (PurchaseOrderItem item : po.getItems()) {
                    item.setReceivedQuantity(item.getQuantity());
                }
                goodsReceiptRepository.save(GoodsReceipt.builder()
                        .purchaseOrder(po)
                        .receivedBy(currentUser)
                        .receivedDate(LocalDate.now())
                        .deliveryNoteRef("GRN-" + po.getPoNumber())
                        .conditionStatus("ACCEPTED")
                        .remarks(decision.getRemarks() != null ? decision.getRemarks() : "Full delivery verified")
                        .build());
            }
        } else if ("CANCELLED".equals(targetStatus)) {
            securityHelper.requireRoles(currentUser, "SYSTEM_ADMIN", "PROCUREMENT_ADMIN", "PROCUREMENT_MANAGER");
            if (List.of("CLOSED", "DELIVERED").contains(currentStatus)) {
                throw new BadRequestException("Cannot cancel a delivered or closed Purchase Order");
            }
            po.setStatus("CANCELLED");
        } else {
            throw new BadRequestException("Unsupported purchase order status transition: " + targetStatus);
        }

        if (decision.getRemarks() != null && !decision.getRemarks().isBlank()) {
            po.setRemarks(decision.getRemarks());
        }

        PurchaseOrder saved = poRepository.save(po);
        auditService.log(currentUser, "PurchaseOrder", "STATUS_" + targetStatus, "PurchaseOrder", saved.getPoId(),
                "PO " + saved.getPoNumber() + " transitioned from " + currentStatus + " to " + targetStatus);

        notificationService.notifyUser(saved.getCreatedBy(),
                "Purchase Order " + targetStatus,
                "PO " + saved.getPoNumber() + " (" + saved.getVendor().getCompanyName() + ") is now " + targetStatus + ".",
                "PURCHASE_ORDER", saved.getPoId());

        if (saved.getVendor().getVendorUser() != null) {
            notificationService.notifyUser(saved.getVendor().getVendorUser(),
                    "Purchase Order " + saved.getPoNumber() + " " + targetStatus,
                    "Purchase Order " + saved.getPoNumber() + " status is now " + targetStatus + ".",
                    "PURCHASE_ORDER", saved.getPoId());
        }

        return toPurchaseOrderDto(saved);
    }

    public PurchaseOrderDto toPurchaseOrderDto(PurchaseOrder po) {
        List<PurchaseOrderItemDto> itemDtos = po.getItems() == null ? List.of() :
                po.getItems().stream().map(i -> PurchaseOrderItemDto.builder()
                        .poItemId(i.getPoItemId())
                        .poId(po.getPoId())
                        .itemName(i.getItemName())
                        .description(i.getDescription())
                        .quantity(i.getQuantity())
                        .receivedQuantity(i.getReceivedQuantity())
                        .unitPrice(i.getUnitPrice())
                        .taxAmount(i.getTaxAmount())
                        .lineTotal(i.getLineTotal())
                        .build()).collect(Collectors.toList());

        BigDecimal invoicedAmount = invoiceRepository.findByPurchaseOrder_PoIdOrderByCreatedAtDesc(po.getPoId())
                .stream()
                .filter(inv -> !"REJECTED".equalsIgnoreCase(inv.getApprovalStatus()))
                .map(Invoice::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal remainingLimit = po.getTotalAmount().subtract(invoicedAmount).max(BigDecimal.ZERO);

        return PurchaseOrderDto.builder()
                .poId(po.getPoId())
                .poNumber(po.getPoNumber())
                .vendorId(po.getVendor().getVendorId())
                .vendorName(po.getVendor().getCompanyName())
                .vendorCode(po.getVendor().getVendorCode())
                .createdById(po.getCreatedBy().getUserId())
                .createdByName(po.getCreatedBy().getName())
                .approvedById(po.getApprovedBy() != null ? po.getApprovedBy().getUserId() : null)
                .approvedByName(po.getApprovedBy() != null ? po.getApprovedBy().getName() : null)
                .orderDate(po.getOrderDate())
                .expectedDeliveryDate(po.getExpectedDeliveryDate())
                .subtotalAmount(po.getSubtotalAmount())
                .taxAmount(po.getTaxAmount())
                .totalAmount(po.getTotalAmount())
                .invoicedAmount(invoicedAmount)
                .remainingOrderLimit(remainingLimit)
                .status(po.getStatus())
                .remarks(po.getRemarks())
                .requisitionId(po.getRequisitionId())
                .items(itemDtos)
                .createdAt(po.getCreatedAt())
                .build();
    }

    // =========================================================================
    // INVOICES
    // =========================================================================

    @Transactional(readOnly = true)
    public List<InvoiceDto> getInvoices(Long vendorId, Long poId, String approvalStatus, String paymentStatus, User currentUser) {
        if (vendorId != null) {
            securityHelper.enforceVendorAccess(currentUser, vendorId);
        }

        List<Invoice> invoices;
        if (poId != null) {
            invoices = invoiceRepository.findByPurchaseOrder_PoIdOrderByCreatedAtDesc(poId);
        } else if (vendorId != null) {
            invoices = invoiceRepository.findByVendor_VendorIdOrderByCreatedAtDesc(vendorId);
        } else {
            invoices = invoiceRepository.findAllByOrderByCreatedAtDesc();
        }

        if (securityHelper.hasRole(currentUser, "VENDOR")) {
            Optional<Vendor> myVendor = securityHelper.getVendorForUser(currentUser);
            invoices = invoices.stream()
                    .filter(inv -> myVendor.isPresent() && inv.getVendor().getVendorId().equals(myVendor.get().getVendorId()))
                    .collect(Collectors.toList());
        }

        return invoices.stream()
                .filter(inv -> approvalStatus == null || approvalStatus.isBlank() || "ALL".equalsIgnoreCase(approvalStatus) ||
                        inv.getApprovalStatus().equalsIgnoreCase(approvalStatus))
                .filter(inv -> paymentStatus == null || paymentStatus.isBlank() || "ALL".equalsIgnoreCase(paymentStatus) ||
                        inv.getPaymentStatus().equalsIgnoreCase(paymentStatus))
                .map(this::toInvoiceDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public InvoiceDto getInvoiceById(Long id, User currentUser) {
        Invoice inv = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with ID: " + id));
        securityHelper.enforceVendorAccess(currentUser, inv.getVendor().getVendorId());
        return toInvoiceDto(inv);
    }

    @Transactional
    public InvoiceDto createInvoice(InvoiceRequest request, User currentUser) {
        if (securityHelper.hasRole(currentUser, "VENDOR")) {
            securityHelper.enforceVendorAccess(currentUser, request.getVendorId());
        } else {
            securityHelper.requireRoles(currentUser, "SYSTEM_ADMIN", "PROCUREMENT_ADMIN", "FINANCE", "PROCUREMENT_MANAGER");
        }

        if (invoiceRepository.existsByInvoiceNumberIgnoreCase(request.getInvoiceNumber().trim())) {
            throw new BadRequestException("Invoice number '" + request.getInvoiceNumber() + "' already exists");
        }

        Vendor vendor = vendorRepository.findById(request.getVendorId())
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found"));
        PurchaseOrder po = poRepository.findById(request.getPoId())
                .orElseThrow(() -> new ResourceNotFoundException("Purchase Order not found"));

        if (!po.getVendor().getVendorId().equals(vendor.getVendorId())) {
            throw new BadRequestException("Purchase Order " + po.getPoNumber() + " does not belong to vendor " + vendor.getCompanyName());
        }

        if (List.of("DRAFT", "PENDING_APPROVAL", "REJECTED", "CANCELLED").contains(po.getStatus().toUpperCase())) {
            throw new BadRequestException("Cannot submit an invoice against a Purchase Order in status: " + po.getStatus());
        }

        if (request.getDueDate().isBefore(request.getInvoiceDate())) {
            throw new BadRequestException("Invoice due date cannot be earlier than invoice date");
        }

        BigDecimal subtotal = request.getSubtotal().setScale(2, RoundingMode.HALF_UP);
        BigDecimal tax = request.getTaxAmount().setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalAmount = subtotal.add(tax).setScale(2, RoundingMode.HALF_UP);

        BigDecimal existingInvoiced = invoiceRepository.findByPurchaseOrder_PoIdOrderByCreatedAtDesc(po.getPoId())
                .stream()
                .filter(inv -> !"REJECTED".equalsIgnoreCase(inv.getApprovalStatus()))
                .map(Invoice::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (existingInvoiced.add(totalAmount).compareTo(po.getTotalAmount()) > 0) {
            BigDecimal remaining = po.getTotalAmount().subtract(existingInvoiced).max(BigDecimal.ZERO);
            throw new BadRequestException("Invoice total ($" + totalAmount + ") exceeds remaining Purchase Order limit ($" + remaining + " of $" + po.getTotalAmount() + ")");
        }

        String docUrl = request.getDocumentUrl();
        if (docUrl == null || docUrl.isBlank()) {
            String stored = fileStorageService.createSeedDocumentIfAbsent("INV-" + request.getInvoiceNumber().trim() + ".pdf",
                    "COMMERCIAL INVOICE " + request.getInvoiceNumber() + "\nPO: " + po.getPoNumber() + "\nTotal: $" + totalAmount);
            docUrl = "/api/v1/files/download/" + stored;
        }

        Invoice invoice = Invoice.builder()
                .vendor(vendor)
                .purchaseOrder(po)
                .invoiceNumber(request.getInvoiceNumber().trim().toUpperCase())
                .invoiceDate(request.getInvoiceDate())
                .dueDate(request.getDueDate())
                .subtotal(subtotal)
                .taxAmount(tax)
                .totalAmount(totalAmount)
                .paidAmount(BigDecimal.ZERO)
                .approvalStatus("PENDING")
                .paymentStatus("UNPAID")
                .documentUrl(docUrl)
                .build();

        Invoice saved = invoiceRepository.save(invoice);
        auditService.log(currentUser, "Invoice", "SUBMIT", "Invoice", saved.getInvoiceId(),
                "Submitted invoice " + saved.getInvoiceNumber() + " ($" + saved.getTotalAmount() + ") for PO " + po.getPoNumber());

        notificationService.notifyRole("FINANCE",
                "New Invoice Pending Verification",
                "Invoice " + saved.getInvoiceNumber() + " ($" + saved.getTotalAmount() + ") from " + vendor.getCompanyName() + " requires verification.",
                "INVOICE", saved.getInvoiceId());

        return toInvoiceDto(saved);
    }

    @Transactional
    public InvoiceDto decideInvoiceApproval(Long invoiceId, ApprovalDecisionRequest decision, User currentUser) {
        securityHelper.requireRoles(currentUser, "FINANCE", "PROCUREMENT_ADMIN", "SYSTEM_ADMIN");
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));

        if ("PAID".equalsIgnoreCase(invoice.getPaymentStatus())) {
            throw new BadRequestException("Cannot change approval status of a paid invoice");
        }

        String status = decision.getStatus().trim().toUpperCase();
        if (!List.of("APPROVED", "REJECTED").contains(status)) {
            throw new BadRequestException("Invoice approval status must be APPROVED or REJECTED");
        }

        invoice.setApprovalStatus(status);
        invoice.setApprovalRemarks(decision.getRemarks());
        invoice.setVerifiedBy(currentUser);

        Invoice saved = invoiceRepository.save(invoice);
        auditService.log(currentUser, "Invoice", "APPROVAL_" + status, "Invoice", saved.getInvoiceId(),
                "Invoice " + saved.getInvoiceNumber() + " marked " + status +
                        (decision.getRemarks() != null ? " — " + decision.getRemarks() : ""));

        if (saved.getVendor().getVendorUser() != null) {
            notificationService.notifyUser(saved.getVendor().getVendorUser(),
                    "Invoice " + saved.getInvoiceNumber() + " " + status,
                    "Your invoice " + saved.getInvoiceNumber() + " ($" + saved.getTotalAmount() + ") was " + status + ".",
                    "INVOICE", saved.getInvoiceId());
        }
        return toInvoiceDto(saved);
    }

    public InvoiceDto toInvoiceDto(Invoice inv) {
        BigDecimal paid = inv.getPaidAmount() != null ? inv.getPaidAmount() : BigDecimal.ZERO;
        BigDecimal balance = "REJECTED".equalsIgnoreCase(inv.getApprovalStatus())
                ? BigDecimal.ZERO
                : inv.getTotalAmount().subtract(paid).max(BigDecimal.ZERO);

        boolean overdue = !"PAID".equalsIgnoreCase(inv.getPaymentStatus())
                && !"REJECTED".equalsIgnoreCase(inv.getApprovalStatus())
                && inv.getDueDate() != null
                && inv.getDueDate().isBefore(LocalDate.now());

        return InvoiceDto.builder()
                .invoiceId(inv.getInvoiceId())
                .vendorId(inv.getVendor().getVendorId())
                .vendorName(inv.getVendor().getCompanyName())
                .vendorCode(inv.getVendor().getVendorCode())
                .poId(inv.getPurchaseOrder().getPoId())
                .poNumber(inv.getPurchaseOrder().getPoNumber())
                .poTotalAmount(inv.getPurchaseOrder().getTotalAmount())
                .invoiceNumber(inv.getInvoiceNumber())
                .invoiceDate(inv.getInvoiceDate())
                .dueDate(inv.getDueDate())
                .subtotal(inv.getSubtotal())
                .taxAmount(inv.getTaxAmount())
                .totalAmount(inv.getTotalAmount())
                .paidAmount(paid)
                .outstandingBalance(balance)
                .approvalStatus(inv.getApprovalStatus())
                .approvalRemarks(inv.getApprovalRemarks())
                .paymentStatus(inv.getPaymentStatus())
                .documentUrl(inv.getDocumentUrl())
                .verifiedByName(inv.getVerifiedBy() != null ? inv.getVerifiedBy().getName() : null)
                .overdue(overdue)
                .createdAt(inv.getCreatedAt())
                .build();
    }

    // =========================================================================
    // PAYMENTS (With Partial & Full Balance Validation + Transactional Integrity)
    // =========================================================================

    @Transactional(readOnly = true)
    public List<PaymentDto> getPayments(Long invoiceId, User currentUser) {
        List<Payment> list;
        if (invoiceId != null) {
            list = paymentRepository.findByInvoice_InvoiceIdOrderByPaymentDateDesc(invoiceId);
        } else if (securityHelper.hasRole(currentUser, "VENDOR")) {
            Optional<Vendor> myVendor = securityHelper.getVendorForUser(currentUser);
            list = myVendor.map(v -> paymentRepository.findByInvoice_Vendor_VendorIdOrderByPaymentDateDesc(v.getVendorId()))
                    .orElse(List.of());
        } else {
            list = paymentRepository.findAllByOrderByPaymentDateDesc();
        }
        return list.stream().map(this::toPaymentDto).collect(Collectors.toList());
    }

    @Transactional
    public PaymentDto recordPayment(PaymentRequest request, User currentUser) {
        securityHelper.requireRoles(currentUser, "FINANCE", "SYSTEM_ADMIN", "PROCUREMENT_ADMIN");

        if (paymentRepository.existsByTransactionRefIgnoreCase(request.getTransactionRef().trim())) {
            throw new BadRequestException("Duplicate transaction reference '" + request.getTransactionRef() + "'. Payment has already been recorded.");
        }

        Invoice invoice = invoiceRepository.findById(request.getInvoiceId())
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));

        if (!"APPROVED".equalsIgnoreCase(invoice.getApprovalStatus())) {
            throw new BadRequestException("Payments can only be recorded for APPROVED invoices. Current invoice approval status: " + invoice.getApprovalStatus());
        }

        if ("PAID".equalsIgnoreCase(invoice.getPaymentStatus())) {
            throw new BadRequestException("Invoice " + invoice.getInvoiceNumber() + " is already fully paid");
        }

        BigDecimal alreadyPaid = invoice.getPaidAmount() != null ? invoice.getPaidAmount() : BigDecimal.ZERO;
        BigDecimal outstanding = invoice.getTotalAmount().subtract(alreadyPaid).setScale(2, RoundingMode.HALF_UP);
        BigDecimal payAmount = request.getAmount().setScale(2, RoundingMode.HALF_UP);

        if (payAmount.compareTo(outstanding) > 0) {
            throw new BadRequestException("Payment amount ($" + payAmount + ") exceeds outstanding invoice balance ($" + outstanding + ")");
        }

        BigDecimal newPaidAmount = alreadyPaid.add(payAmount).setScale(2, RoundingMode.HALF_UP);
        invoice.setPaidAmount(newPaidAmount);
        if (newPaidAmount.compareTo(invoice.getTotalAmount()) >= 0) {
            invoice.setPaymentStatus("PAID");
        } else {
            invoice.setPaymentStatus("PARTIALLY_PAID");
        }
        invoiceRepository.save(invoice);

        Payment payment = Payment.builder()
                .invoice(invoice)
                .paidBy(currentUser)
                .paymentDate(LocalDateTime.now())
                .amount(payAmount)
                .paymentMethod(request.getPaymentMethod().trim().toUpperCase())
                .transactionRef(request.getTransactionRef().trim().toUpperCase())
                .status("COMPLETED")
                .remarks(request.getRemarks())
                .build();

        Payment saved = paymentRepository.save(payment);

        // Check if PO should transition to CLOSED when fully invoiced and paid
        PurchaseOrder po = invoice.getPurchaseOrder();
        List<Invoice> poInvoices = invoiceRepository.findByPurchaseOrder_PoIdOrderByCreatedAtDesc(po.getPoId());
        BigDecimal totalPaidOnPo = poInvoices.stream()
                .map(inv -> inv.getPaidAmount() != null ? inv.getPaidAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalPaidOnPo.compareTo(po.getTotalAmount()) >= 0) {
            po.setStatus("CLOSED");
            poRepository.save(po);
        }

        auditService.log(currentUser, "Payment", "RECORD_PAYMENT", "Payment", saved.getPaymentId(),
                "Recorded payment " + saved.getTransactionRef() + " ($" + saved.getAmount() + ") for Invoice " + invoice.getInvoiceNumber());

        if (invoice.getVendor().getVendorUser() != null) {
            notificationService.notifyUser(invoice.getVendor().getVendorUser(),
                    "Payment Disbursed: $" + saved.getAmount(),
                    "Payment ref " + saved.getTransactionRef() + " for Invoice " + invoice.getInvoiceNumber() + " has been recorded.",
                    "PAYMENT", saved.getPaymentId());
        }
        notificationService.notifyUser(po.getCreatedBy(),
                "Invoice Payment Recorded",
                "Payment of $" + saved.getAmount() + " recorded against Invoice " + invoice.getInvoiceNumber() + " (PO " + po.getPoNumber() + ").",
                "PAYMENT", saved.getPaymentId());

        return toPaymentDto(saved);
    }

    public PaymentDto toPaymentDto(Payment p) {
        Invoice inv = p.getInvoice();
        BigDecimal remaining = inv.getTotalAmount().subtract(inv.getPaidAmount() != null ? inv.getPaidAmount() : BigDecimal.ZERO).max(BigDecimal.ZERO);
        return PaymentDto.builder()
                .paymentId(p.getPaymentId())
                .invoiceId(inv.getInvoiceId())
                .invoiceNumber(inv.getInvoiceNumber())
                .poId(inv.getPurchaseOrder().getPoId())
                .poNumber(inv.getPurchaseOrder().getPoNumber())
                .vendorId(inv.getVendor().getVendorId())
                .vendorName(inv.getVendor().getCompanyName())
                .paidById(p.getPaidBy().getUserId())
                .paidByName(p.getPaidBy().getName())
                .paymentDate(p.getPaymentDate())
                .amount(p.getAmount())
                .invoiceTotal(inv.getTotalAmount())
                .remainingInvoiceBalance(remaining)
                .paymentMethod(p.getPaymentMethod())
                .transactionRef(p.getTransactionRef())
                .status(p.getStatus())
                .remarks(p.getRemarks())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
