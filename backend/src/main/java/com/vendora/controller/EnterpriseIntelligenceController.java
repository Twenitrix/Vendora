package com.vendora.controller;

import com.vendora.dto.ApiDtos.*;
import com.vendora.entity.User;
import com.vendora.service.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "04. Intelligence, Relationships & Governance", description = "Dashboard, Analytics, Reviews, Communications, Notifications, Audit Logs, and Users")
public class EnterpriseIntelligenceController {

    private final EnterpriseIntelligenceService intelligenceService;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final VendorOperationsService vendorOperationsService;
    private final SecurityHelper securityHelper;

    // --- DASHBOARD & REPORTS ---
    @GetMapping("/dashboard/summary")
    @Operation(summary = "Get live executive dashboard metrics, trends, and activity")
    public ResponseEntity<DashboardSummaryDto> getDashboardSummary() {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(intelligenceService.getDashboardSummary(currentUser));
    }

    @GetMapping("/reports/spending")
    @Operation(summary = "Get procurement spend analytics by month and category")
    public ResponseEntity<Map<String, Object>> getSpendingReport() {
        User currentUser = securityHelper.getCurrentUser();
        DashboardSummaryDto summary = intelligenceService.getDashboardSummary(currentUser);
        return ResponseEntity.ok(Map.of(
                "totalSpendYtd", summary.getTotalSpendYtd(),
                "outstandingPayables", summary.getOutstandingPayables(),
                "monthlySpendTrend", summary.getMonthlySpendTrend(),
                "categoryDistribution", summary.getCategoryDistribution()
        ));
    }

    @GetMapping("/reports/vendor-performance")
    @Operation(summary = "Get vendor performance rankings and review history")
    public ResponseEntity<List<PerformanceReviewDto>> getVendorPerformanceReport() {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(intelligenceService.getReviews(null, currentUser));
    }

    @GetMapping("/reports/contracts")
    @Operation(summary = "Get contract status and expiration report")
    public ResponseEntity<List<ContractDto>> getContractReport(@RequestParam(required = false) String status) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(vendorOperationsService.getContracts(null, status, currentUser));
    }

    // --- PERFORMANCE REVIEWS ---
    @GetMapping("/reviews")
    @Operation(summary = "List all vendor performance reviews")
    public ResponseEntity<List<PerformanceReviewDto>> getAllReviews(@RequestParam(required = false) Long vendorId) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(intelligenceService.getReviews(vendorId, currentUser));
    }

    @GetMapping("/vendors/{id}/reviews")
    @Operation(summary = "Get performance reviews for a specific vendor")
    public ResponseEntity<List<PerformanceReviewDto>> getVendorReviews(@PathVariable Long id) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(intelligenceService.getReviews(id, currentUser));
    }

    @PostMapping("/vendors/{id}/reviews")
    @Operation(summary = "Submit a performance review for a vendor and purchase order")
    public ResponseEntity<PerformanceReviewDto> createVendorReview(
            @PathVariable Long id,
            @Valid @RequestBody PerformanceReviewRequest request) {
        User currentUser = securityHelper.getCurrentUser();
        request.setVendorId(id);
        return ResponseEntity.ok(intelligenceService.createReview(request, currentUser));
    }

    @PostMapping("/reviews")
    @Operation(summary = "Submit a performance review")
    public ResponseEntity<PerformanceReviewDto> createReview(@Valid @RequestBody PerformanceReviewRequest request) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(intelligenceService.createReview(request, currentUser));
    }

    // --- COMMUNICATIONS ---
    @GetMapping("/communications")
    @Operation(summary = "List vendor communications")
    public ResponseEntity<List<CommunicationDto>> getAllCommunications(
            @RequestParam(required = false) Long vendorId,
            @RequestParam(required = false) String search) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(intelligenceService.getCommunications(vendorId, search, currentUser));
    }

    @GetMapping("/vendors/{id}/communications")
    @Operation(summary = "Get communication history for a specific vendor")
    public ResponseEntity<List<CommunicationDto>> getVendorCommunications(@PathVariable Long id) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(intelligenceService.getCommunications(id, null, currentUser));
    }

    @PostMapping("/vendors/{id}/communications")
    @Operation(summary = "Send a message in a vendor conversation")
    public ResponseEntity<CommunicationDto> sendVendorCommunication(
            @PathVariable Long id,
            @Valid @RequestBody CommunicationRequest request) {
        User currentUser = securityHelper.getCurrentUser();
        request.setVendorId(id);
        return ResponseEntity.ok(intelligenceService.sendCommunication(request, currentUser));
    }

    @PostMapping("/communications")
    @Operation(summary = "Send a communication message")
    public ResponseEntity<CommunicationDto> sendCommunication(@Valid @RequestBody CommunicationRequest request) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(intelligenceService.sendCommunication(request, currentUser));
    }

    @PatchMapping("/communications/{id}/read")
    @Operation(summary = "Mark a communication message as read")
    public ResponseEntity<CommunicationDto> markCommunicationRead(@PathVariable Long id) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(intelligenceService.markCommunicationRead(id, currentUser));
    }

    // --- NOTIFICATIONS ---
    @GetMapping("/notifications")
    @Operation(summary = "Get user-scoped notifications")
    public ResponseEntity<List<NotificationDto>> getNotifications() {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(notificationService.getUserNotifications(currentUser));
    }

    @GetMapping("/notifications/unread-count")
    @Operation(summary = "Get unread notification count for current user")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(Map.of("unreadCount", notificationService.getUnreadCount(currentUser)));
    }

    @PatchMapping("/notifications/{id}/read")
    @Operation(summary = "Mark a single notification as read")
    public ResponseEntity<NotificationDto> markNotificationRead(@PathVariable Long id) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(notificationService.markAsRead(id, currentUser));
    }

    @PatchMapping("/notifications/read-all")
    @Operation(summary = "Mark all notifications as read for current user")
    public ResponseEntity<Map<String, String>> markAllNotificationsRead() {
        User currentUser = securityHelper.getCurrentUser();
        notificationService.markAllAsRead(currentUser);
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }

    // --- AUDIT LOGS ---
    @GetMapping("/audit-logs")
    @Operation(summary = "Get immutable system audit trail")
    public ResponseEntity<List<AuditLogDto>> getAuditLogs(@RequestParam(required = false) String module) {
        User currentUser = securityHelper.getCurrentUser();
        securityHelper.requireRoles(currentUser, "SYSTEM_ADMIN", "PROCUREMENT_ADMIN", "PROCUREMENT_MANAGER", "FINANCE");
        return ResponseEntity.ok(auditService.getAllLogs(module));
    }

    // --- USERS & ROLES ---
    @GetMapping("/users")
    @Operation(summary = "List platform users")
    public ResponseEntity<List<UserDto>> getUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(intelligenceService.getAllUsers(search, role, currentUser));
    }

    @PostMapping("/users")
    @Operation(summary = "Create a new user account")
    public ResponseEntity<UserDto> createUser(@Valid @RequestBody UserCreateRequest request) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(intelligenceService.createUser(request, currentUser));
    }

    @PutMapping("/users/{id}")
    @Operation(summary = "Update user role, status, or profile")
    public ResponseEntity<UserDto> updateUser(@PathVariable Long id, @Valid @RequestBody UserUpdateRequest request) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(intelligenceService.updateUser(id, request, currentUser));
    }

    @GetMapping("/roles")
    @Operation(summary = "List all system roles")
    public ResponseEntity<List<RoleDto>> getRoles() {
        return ResponseEntity.ok(intelligenceService.getAllRoles());
    }
}
