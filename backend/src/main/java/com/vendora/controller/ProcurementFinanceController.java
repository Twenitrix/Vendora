package com.vendora.controller;

import com.vendora.dto.ApiDtos.*;
import com.vendora.entity.User;
import com.vendora.service.ProcurementFinanceService;
import com.vendora.service.SecurityHelper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "03. Procurement & Finance", description = "Requisitions, Purchase Orders, Line Items, Invoices, and Payments")
public class ProcurementFinanceController {

    private final ProcurementFinanceService procurementService;
    private final SecurityHelper securityHelper;

    // --- REQUISITIONS ---
    @GetMapping("/requisitions")
    @Operation(summary = "List internal purchase requisitions")
    public ResponseEntity<List<RequisitionDto>> getRequisitions(@RequestParam(required = false) String status) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(procurementService.getRequisitions(status, currentUser));
    }

    @PostMapping("/requisitions")
    @Operation(summary = "Create an internal purchase requisition")
    public ResponseEntity<RequisitionDto> createRequisition(@Valid @RequestBody RequisitionRequest request) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(procurementService.createRequisition(request, currentUser));
    }

    @PatchMapping("/requisitions/{id}/approval")
    @Operation(summary = "Approve, reject, or return a purchase requisition (auto-generates PO on approval)")
    public ResponseEntity<RequisitionDto> decideRequisition(
            @PathVariable Long id,
            @Valid @RequestBody ApprovalDecisionRequest request) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(procurementService.decideRequisition(id, request, currentUser));
    }

    // --- PURCHASE ORDERS ---
    @GetMapping("/purchase-orders")
    @Operation(summary = "List and filter purchase orders")
    public ResponseEntity<List<PurchaseOrderDto>> getPurchaseOrders(
            @RequestParam(required = false) Long vendorId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(procurementService.getPurchaseOrders(vendorId, status, search, currentUser));
    }

    @GetMapping("/purchase-orders/{id}")
    @Operation(summary = "Get purchase order details and line items by ID")
    public ResponseEntity<PurchaseOrderDto> getPurchaseOrderById(@PathVariable Long id) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(procurementService.getPurchaseOrderById(id, currentUser));
    }

    @PostMapping("/purchase-orders")
    @Operation(summary = "Create a new purchase order with backend-calculated item totals")
    public ResponseEntity<PurchaseOrderDto> createPurchaseOrder(@Valid @RequestBody PurchaseOrderRequest request) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(procurementService.createPurchaseOrder(request, currentUser));
    }

    @PutMapping("/purchase-orders/{id}/items")
    @Operation(summary = "Update line items on a draft/pending purchase order")
    public ResponseEntity<PurchaseOrderDto> updatePurchaseOrderItems(
            @PathVariable Long id,
            @Valid @RequestBody List<PurchaseOrderItemRequest> items) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(procurementService.updatePurchaseOrderItems(id, items, currentUser));
    }

    @PatchMapping("/purchase-orders/{id}/approval")
    @Operation(summary = "Approve, reject, issue, or record delivery on a purchase order")
    public ResponseEntity<PurchaseOrderDto> updatePurchaseOrderApproval(
            @PathVariable Long id,
            @Valid @RequestBody ApprovalDecisionRequest request) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(procurementService.updatePurchaseOrderStatus(id, request, currentUser));
    }

    // --- INVOICES ---
    @GetMapping("/invoices")
    @Operation(summary = "List and filter vendor invoices")
    public ResponseEntity<List<InvoiceDto>> getInvoices(
            @RequestParam(required = false) Long vendorId,
            @RequestParam(required = false) Long poId,
            @RequestParam(required = false) String approvalStatus,
            @RequestParam(required = false) String paymentStatus) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(procurementService.getInvoices(vendorId, poId, approvalStatus, paymentStatus, currentUser));
    }

    @GetMapping("/invoices/{id}")
    @Operation(summary = "Get invoice details by ID")
    public ResponseEntity<InvoiceDto> getInvoiceById(@PathVariable Long id) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(procurementService.getInvoiceById(id, currentUser));
    }

    @PostMapping("/invoices")
    @Operation(summary = "Submit a new invoice validated against Purchase Order limits")
    public ResponseEntity<InvoiceDto> createInvoice(@Valid @RequestBody InvoiceRequest request) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(procurementService.createInvoice(request, currentUser));
    }

    @PatchMapping("/invoices/{id}/approval")
    @Operation(summary = "Approve or reject an invoice with remarks")
    public ResponseEntity<InvoiceDto> decideInvoiceApproval(
            @PathVariable Long id,
            @Valid @RequestBody ApprovalDecisionRequest request) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(procurementService.decideInvoiceApproval(id, request, currentUser));
    }

    // --- PAYMENTS ---
    @GetMapping("/payments")
    @Operation(summary = "List recorded payments")
    public ResponseEntity<List<PaymentDto>> getPayments(@RequestParam(required = false) Long invoiceId) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(procurementService.getPayments(invoiceId, currentUser));
    }

    @GetMapping("/invoices/{id}/payments")
    @Operation(summary = "Get payment history for a specific invoice")
    public ResponseEntity<List<PaymentDto>> getInvoicePayments(@PathVariable Long id) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(procurementService.getPayments(id, currentUser));
    }

    @PostMapping("/payments")
    @Operation(summary = "Record a payment against an approved invoice")
    public ResponseEntity<PaymentDto> recordPayment(@Valid @RequestBody PaymentRequest request) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(procurementService.recordPayment(request, currentUser));
    }
}
