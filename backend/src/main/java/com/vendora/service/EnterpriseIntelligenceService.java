package com.vendora.service;

import com.vendora.dto.ApiDtos.*;
import com.vendora.entity.*;
import com.vendora.exception.BadRequestException;
import com.vendora.exception.ResourceNotFoundException;
import com.vendora.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EnterpriseIntelligenceService {

    private final PerformanceReviewRepository reviewRepository;
    private final CommunicationRepository communicationRepository;
    private final VendorRepository vendorRepository;
    private final VendorCategoryRepository categoryRepository;
    private final VendorDocumentRepository documentRepository;
    private final ContractRepository contractRepository;
    private final PurchaseOrderRepository poRepository;
    private final PurchaseRequisitionRepository requisitionRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final SecurityHelper securityHelper;
    private final VendorOperationsService vendorOperationsService;
    private final ProcurementFinanceService procurementFinanceService;

    // =========================================================================
    // PERFORMANCE REVIEWS (Formula: Equal 25% Weighting across 4 dimensions)
    // =========================================================================

    @Transactional(readOnly = true)
    public List<PerformanceReviewDto> getReviews(Long vendorId, User currentUser) {
        if (vendorId != null) {
            securityHelper.enforceVendorAccess(currentUser, vendorId);
        }
        List<PerformanceReview> list = (vendorId != null)
                ? reviewRepository.findByVendor_VendorIdOrderByReviewDateDesc(vendorId)
                : reviewRepository.findAllByOrderByReviewDateDesc();

        if (securityHelper.hasRole(currentUser, "VENDOR")) {
            Optional<Vendor> myVendor = securityHelper.getVendorForUser(currentUser);
            list = list.stream()
                    .filter(r -> myVendor.isPresent() && r.getVendor().getVendorId().equals(myVendor.get().getVendorId()))
                    .collect(Collectors.toList());
        }

        return list.stream().map(this::toReviewDto).collect(Collectors.toList());
    }

    @Transactional
    public PerformanceReviewDto createReview(PerformanceReviewRequest request, User currentUser) {
        securityHelper.requireRoles(currentUser, "SYSTEM_ADMIN", "PROCUREMENT_ADMIN", "PROCUREMENT_MANAGER", "FINANCE");

        Vendor vendor = vendorRepository.findById(request.getVendorId())
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found"));
        PurchaseOrder po = poRepository.findById(request.getPoId())
                .orElseThrow(() -> new ResourceNotFoundException("Purchase Order not found"));

        if (!po.getVendor().getVendorId().equals(vendor.getVendorId())) {
            throw new BadRequestException("Purchase Order " + po.getPoNumber() + " does not belong to vendor " + vendor.getCompanyName());
        }

        if (reviewRepository.existsByPurchaseOrder_PoIdAndReviewedBy_UserId(po.getPoId(), currentUser.getUserId())) {
            throw new BadRequestException("You have already submitted a performance review for Purchase Order " + po.getPoNumber());
        }

        // Backend calculation of overall_score = (quality + delivery + communication + compliance) / 4
        BigDecimal sum = request.getQualityScore()
                .add(request.getDeliveryScore())
                .add(request.getCommunicationScore())
                .add(request.getComplianceScore());
        BigDecimal overall = sum.divide(BigDecimal.valueOf(4), 2, RoundingMode.HALF_UP);

        PerformanceReview review = PerformanceReview.builder()
                .vendor(vendor)
                .reviewedBy(currentUser)
                .purchaseOrder(po)
                .qualityScore(request.getQualityScore().setScale(2, RoundingMode.HALF_UP))
                .deliveryScore(request.getDeliveryScore().setScale(2, RoundingMode.HALF_UP))
                .communicationScore(request.getCommunicationScore().setScale(2, RoundingMode.HALF_UP))
                .complianceScore(request.getComplianceScore().setScale(2, RoundingMode.HALF_UP))
                .overallScore(overall)
                .comments(request.getComments())
                .reviewDate(request.getReviewDate() != null ? request.getReviewDate() : LocalDate.now())
                .build();

        PerformanceReview saved = reviewRepository.save(review);
        auditService.log(currentUser, "Performance", "CREATE_REVIEW", "PerformanceReview", saved.getReviewId(),
                "Reviewed vendor " + vendor.getCompanyName() + " on PO " + po.getPoNumber() + " (Overall: " + overall + "/5.00)");

        if (vendor.getVendorUser() != null) {
            notificationService.notifyUser(vendor.getVendorUser(),
                    "New Performance Review Published",
                    "A performance evaluation (" + overall + " / 5.00) was recorded for PO " + po.getPoNumber() + ".",
                    "PERFORMANCE", saved.getReviewId());
        }

        return toReviewDto(saved);
    }

    public PerformanceReviewDto toReviewDto(PerformanceReview r) {
        return PerformanceReviewDto.builder()
                .reviewId(r.getReviewId())
                .vendorId(r.getVendor().getVendorId())
                .vendorName(r.getVendor().getCompanyName())
                .vendorCategory(r.getVendor().getCategory() != null ? r.getVendor().getCategory().getCategoryName() : null)
                .reviewedById(r.getReviewedBy().getUserId())
                .reviewedByName(r.getReviewedBy().getName())
                .poId(r.getPurchaseOrder().getPoId())
                .poNumber(r.getPurchaseOrder().getPoNumber())
                .qualityScore(r.getQualityScore())
                .deliveryScore(r.getDeliveryScore())
                .communicationScore(r.getCommunicationScore())
                .complianceScore(r.getComplianceScore())
                .overallScore(r.getOverallScore())
                .comments(r.getComments())
                .reviewDate(r.getReviewDate())
                .createdAt(r.getCreatedAt())
                .build();
    }

    // =========================================================================
    // COMMUNICATIONS
    // =========================================================================

    @Transactional(readOnly = true)
    public List<CommunicationDto> getCommunications(Long vendorId, String search, User currentUser) {
        if (vendorId != null) {
            securityHelper.enforceVendorAccess(currentUser, vendorId);
        }
        List<Communication> list = (vendorId != null)
                ? communicationRepository.findByVendor_VendorIdOrderBySentAtDesc(vendorId)
                : communicationRepository.findAllByOrderBySentAtDesc();

        if (securityHelper.hasRole(currentUser, "VENDOR")) {
            Optional<Vendor> myVendor = securityHelper.getVendorForUser(currentUser);
            list = list.stream()
                    .filter(c -> myVendor.isPresent() && c.getVendor().getVendorId().equals(myVendor.get().getVendorId()))
                    .collect(Collectors.toList());
        }

        return list.stream()
                .filter(c -> search == null || search.isBlank() ||
                        c.getSubject().toLowerCase().contains(search.toLowerCase()) ||
                        c.getMessage().toLowerCase().contains(search.toLowerCase()) ||
                        c.getVendor().getCompanyName().toLowerCase().contains(search.toLowerCase()))
                .map(this::toCommunicationDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public CommunicationDto sendCommunication(CommunicationRequest request, User currentUser) {
        securityHelper.enforceVendorAccess(currentUser, request.getVendorId());
        Vendor vendor = vendorRepository.findById(request.getVendorId())
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found"));

        Communication comm = Communication.builder()
                .vendor(vendor)
                .sender(currentUser)
                .subject(request.getSubject().trim())
                .message(request.getMessage().trim())
                .sentAt(LocalDateTime.now())
                .status("SENT")
                .build();

        Communication saved = communicationRepository.save(comm);
        auditService.log(currentUser, "Communication", "SEND_MESSAGE", "Communication", saved.getCommunicationId(),
                "Message sent regarding vendor " + vendor.getCompanyName() + ": " + saved.getSubject());

        if (securityHelper.hasRole(currentUser, "VENDOR")) {
            if (vendor.getManagedBy() != null) {
                notificationService.notifyUser(vendor.getManagedBy(),
                        "New Vendor Message: " + vendor.getCompanyName(),
                        saved.getSubject(),
                        "COMMUNICATION", saved.getCommunicationId());
            } else {
                notificationService.notifyRole("PROCUREMENT_ADMIN",
                        "New Vendor Message: " + vendor.getCompanyName(),
                        saved.getSubject(),
                        "COMMUNICATION", saved.getCommunicationId());
            }
        } else if (vendor.getVendorUser() != null) {
            notificationService.notifyUser(vendor.getVendorUser(),
                    "Message from Vendora Procurement",
                    saved.getSubject(),
                    "COMMUNICATION", saved.getCommunicationId());
        }

        return toCommunicationDto(saved);
    }

    @Transactional
    public CommunicationDto markCommunicationRead(Long id, User currentUser) {
        Communication comm = communicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Communication message not found"));
        securityHelper.enforceVendorAccess(currentUser, comm.getVendor().getVendorId());
        comm.setStatus("READ");
        return toCommunicationDto(communicationRepository.save(comm));
    }

    public CommunicationDto toCommunicationDto(Communication c) {
        return CommunicationDto.builder()
                .communicationId(c.getCommunicationId())
                .vendorId(c.getVendor().getVendorId())
                .vendorName(c.getVendor().getCompanyName())
                .senderId(c.getSender().getUserId())
                .senderName(c.getSender().getName())
                .senderRole(c.getSender().getRole() != null ? c.getSender().getRole().getRoleName() : "USER")
                .subject(c.getSubject())
                .message(c.getMessage())
                .sentAt(c.getSentAt())
                .status(c.getStatus())
                .build();
    }

    // =========================================================================
    // USERS & ROLES ADMINISTRATION
    // =========================================================================

    @Transactional(readOnly = true)
    public List<UserDto> getAllUsers(String search, String role, User currentUser) {
        securityHelper.requireRoles(currentUser, "SYSTEM_ADMIN", "PROCUREMENT_ADMIN", "PROCUREMENT_MANAGER");
        return userRepository.findAll().stream()
                .filter(u -> role == null || role.isBlank() || "ALL".equalsIgnoreCase(role) ||
                        (u.getRole() != null && u.getRole().getRoleName().equalsIgnoreCase(role)))
                .filter(u -> search == null || search.isBlank() ||
                        u.getName().toLowerCase().contains(search.toLowerCase()) ||
                        u.getEmail().toLowerCase().contains(search.toLowerCase()))
                .map(securityHelper::toUserDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RoleDto> getAllRoles() {
        return roleRepository.findAll().stream()
                .map(r -> RoleDto.builder()
                        .roleId(r.getRoleId())
                        .roleName(r.getRoleName())
                        .description(r.getDescription())
                        .createdAt(r.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public UserDto createUser(UserCreateRequest request, User currentUser) {
        securityHelper.requireRoles(currentUser, "SYSTEM_ADMIN");
        if (userRepository.existsByEmailIgnoreCase(request.getEmail().trim())) {
            throw new BadRequestException("A user with email '" + request.getEmail() + "' already exists");
        }
        Role role = roleRepository.findById(request.getRoleId())
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));

        User user = User.builder()
                .name(request.getName().trim())
                .email(request.getEmail().trim().toLowerCase())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .role(role)
                .status(request.getStatus() != null && !request.getStatus().isBlank() ? request.getStatus().toUpperCase() : "ACTIVE")
                .build();

        User saved = userRepository.save(user);
        auditService.log(currentUser, "UserAdmin", "CREATE_USER", "User", saved.getUserId(),
                "Created user " + saved.getEmail() + " with role " + role.getRoleName());
        return securityHelper.toUserDto(saved);
    }

    @Transactional
    public UserDto updateUser(Long userId, UserUpdateRequest request, User currentUser) {
        securityHelper.requireRoles(currentUser, "SYSTEM_ADMIN");
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setName(request.getName().trim());
        if (request.getPhone() != null) user.setPhone(request.getPhone());
        if (request.getRoleId() != null) {
            Role role = roleRepository.findById(request.getRoleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Role not found"));
            user.setRole(role);
        }
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            user.setStatus(request.getStatus().toUpperCase());
        }
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        User saved = userRepository.save(user);
        auditService.log(currentUser, "UserAdmin", "UPDATE_USER", "User", saved.getUserId(),
                "Updated user " + saved.getEmail() + " (role=" + saved.getRole().getRoleName() + ", status=" + saved.getStatus() + ")");
        return securityHelper.toUserDto(saved);
    }

    // =========================================================================
    // EXECUTIVE DASHBOARD & ANALYTICS REPORTS
    // =========================================================================

    @Transactional(readOnly = true)
    public DashboardSummaryDto getDashboardSummary(User currentUser) {
        List<VendorDto> vendors = vendorOperationsService.getAllVendors(null, null, null, currentUser);
        List<ContractDto> contracts = vendorOperationsService.getContracts(null, null, currentUser);
        List<PurchaseOrderDto> pos = procurementFinanceService.getPurchaseOrders(null, null, null, currentUser);
        List<InvoiceDto> invoices = procurementFinanceService.getInvoices(null, null, null, null, currentUser);
        List<VendorDocumentDto> docs = vendorOperationsService.getDocuments(null, null, currentUser);
        List<PerformanceReviewDto> reviews = getReviews(null, currentUser);

        long totalVendors = vendors.size();
        long approvedVendors = vendors.stream().filter(v -> "APPROVED".equalsIgnoreCase(v.getApprovalStatus())).count();
        long pendingVendorApprovals = vendors.stream().filter(v -> "PENDING".equalsIgnoreCase(v.getApprovalStatus()) || "UNDER_REVIEW".equalsIgnoreCase(v.getApprovalStatus())).count();

        long activeContracts = contracts.stream().filter(c -> "ACTIVE".equalsIgnoreCase(c.getStatus())).count();
        long expiringContractsCount = contracts.stream().filter(ContractDto::isExpiringSoon).count();

        long activePos = pos.stream().filter(p -> !List.of("CLOSED", "CANCELLED", "REJECTED").contains(p.getStatus().toUpperCase())).count();
        long pendingPoApprovals = pos.stream().filter(p -> "PENDING_APPROVAL".equalsIgnoreCase(p.getStatus())).count();
        long pendingRequisitions = securityHelper.hasRole(currentUser, "VENDOR") ? 0 :
                requisitionRepository.findAll().stream().filter(r -> "PENDING_APPROVAL".equalsIgnoreCase(r.getStatus())).count();
        long pendingDocs = docs.stream().filter(d -> "PENDING".equalsIgnoreCase(d.getVerificationStatus())).count();

        long pendingInvoices = invoices.stream().filter(i -> "PENDING".equalsIgnoreCase(i.getApprovalStatus())).count();
        long overdueInvoices = invoices.stream().filter(InvoiceDto::isOverdue).count();

        BigDecimal totalSpend = pos.stream()
                .filter(p -> !List.of("REJECTED", "CANCELLED").contains(p.getStatus().toUpperCase()))
                .map(PurchaseOrderDto::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal outstandingPayables = invoices.stream()
                .filter(i -> !"REJECTED".equalsIgnoreCase(i.getApprovalStatus()))
                .map(InvoiceDto::getOutstandingBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Double avgRating = reviews.isEmpty() ? 0.0 :
                Math.round(reviews.stream().mapToDouble(r -> r.getOverallScore().doubleValue()).average().orElse(0.0) * 100.0) / 100.0;

        // Monthly Spend Trend (last 6 months based on actual PO orderDate)
        Map<String, BigDecimal> spendByMonth = new LinkedHashMap<>();
        LocalDate now = LocalDate.now();
        for (int i = 5; i >= 0; i--) {
            LocalDate m = now.minusMonths(i);
            String label = m.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + m.getYear();
            spendByMonth.put(label, BigDecimal.ZERO);
        }
        for (PurchaseOrderDto po : pos) {
            if (!List.of("REJECTED", "CANCELLED").contains(po.getStatus().toUpperCase()) && po.getOrderDate() != null) {
                String label = po.getOrderDate().getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + po.getOrderDate().getYear();
                spendByMonth.computeIfPresent(label, (k, v) -> v.add(po.getTotalAmount()));
            }
        }
        List<Map<String, Object>> monthlyTrend = spendByMonth.entrySet().stream()
                .map(e -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("month", e.getKey());
                    m.put("spend", e.getValue());
                    return m;
                }).collect(Collectors.toList());

        // Category Distribution
        List<CategoryDto> categories = vendorOperationsService.getAllCategories(null, null);
        List<Map<String, Object>> categoryDist = categories.stream()
                .map(c -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("name", c.getCategoryName());
                    m.put("vendors", c.getVendorCount());
                    m.put("spend", c.getTotalSpend());
                    return m;
                }).collect(Collectors.toList());

        // Top Performing Vendors
        List<Map<String, Object>> topVendors = vendors.stream()
                .filter(v -> v.getAverageRating() != null)
                .sorted(Comparator.comparing(VendorDto::getAverageRating).reversed())
                .limit(5)
                .map(v -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("vendorId", v.getVendorId());
                    m.put("companyName", v.getCompanyName());
                    m.put("categoryName", v.getCategoryName());
                    m.put("rating", v.getAverageRating());
                    m.put("totalSpend", v.getTotalSpend());
                    return m;
                }).collect(Collectors.toList());

        List<ContractDto> expiringList = contracts.stream()
                .filter(c -> "ACTIVE".equalsIgnoreCase(c.getStatus()))
                .sorted(Comparator.comparingLong(ContractDto::getDaysRemaining))
                .limit(5)
                .collect(Collectors.toList());

        List<AuditLogDto> recentAudit = auditService.getAllLogs(null).stream().limit(8).collect(Collectors.toList());

        return DashboardSummaryDto.builder()
                .totalVendors(totalVendors)
                .approvedVendors(approvedVendors)
                .pendingVendorApprovals(pendingVendorApprovals)
                .activeContracts(activeContracts)
                .contractsNearingExpiry(expiringContractsCount)
                .activePurchaseOrders(activePos)
                .pendingPoApprovals(pendingPoApprovals)
                .pendingRequisitions(pendingRequisitions)
                .pendingDocuments(pendingDocs)
                .pendingInvoices(pendingInvoices)
                .overdueInvoices(overdueInvoices)
                .totalSpendYtd(totalSpend)
                .outstandingPayables(outstandingPayables)
                .averageVendorRating(avgRating)
                .monthlySpendTrend(monthlyTrend)
                .categoryDistribution(categoryDist)
                .topPerformingVendors(topVendors)
                .recentPurchaseOrders(pos.stream().limit(6).collect(Collectors.toList()))
                .expiringContracts(expiringList)
                .recentActivity(recentAudit)
                .build();
    }
}
