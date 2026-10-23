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
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VendorOperationsService {

    private final VendorCategoryRepository categoryRepository;
    private final VendorRepository vendorRepository;
    private final VendorDocumentRepository documentRepository;
    private final ContractRepository contractRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PerformanceReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final FileStorageService fileStorageService;
    private final SecurityHelper securityHelper;

    // =========================================================================
    // VENDOR CATEGORIES
    // =========================================================================

    @Transactional(readOnly = true)
    public List<CategoryDto> getAllCategories(String search, String status) {
        return categoryRepository.findAll().stream()
                .filter(c -> status == null || status.isBlank() || "ALL".equalsIgnoreCase(status) || c.getStatus().equalsIgnoreCase(status))
                .filter(c -> search == null || search.isBlank() ||
                        c.getCategoryName().toLowerCase().contains(search.toLowerCase()) ||
                        (c.getDescription() != null && c.getDescription().toLowerCase().contains(search.toLowerCase())))
                .map(this::toCategoryDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public CategoryDto createCategory(CategoryRequest request, User currentUser) {
        securityHelper.requireRoles(currentUser, "SYSTEM_ADMIN", "PROCUREMENT_ADMIN");
        if (categoryRepository.existsByCategoryNameIgnoreCase(request.getCategoryName().trim())) {
            throw new BadRequestException("A vendor category with name '" + request.getCategoryName() + "' already exists");
        }
        VendorCategory category = VendorCategory.builder()
                .categoryName(request.getCategoryName().trim())
                .description(request.getDescription())
                .status(request.getStatus() != null && !request.getStatus().isBlank() ? request.getStatus().toUpperCase() : "ACTIVE")
                .build();
        VendorCategory saved = categoryRepository.save(category);
        auditService.log(currentUser, "Category", "CREATE", "VendorCategory", saved.getCategoryId(),
                "Created vendor category: " + saved.getCategoryName());
        return toCategoryDto(saved);
    }

    @Transactional
    public CategoryDto updateCategory(Long id, CategoryRequest request, User currentUser) {
        securityHelper.requireRoles(currentUser, "SYSTEM_ADMIN", "PROCUREMENT_ADMIN");
        VendorCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor category not found with ID: " + id));

        Optional<VendorCategory> existingByName = categoryRepository.findByCategoryNameIgnoreCase(request.getCategoryName().trim());
        if (existingByName.isPresent() && !existingByName.get().getCategoryId().equals(id)) {
            throw new BadRequestException("Another category with name '" + request.getCategoryName() + "' already exists");
        }

        category.setCategoryName(request.getCategoryName().trim());
        category.setDescription(request.getDescription());
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            category.setStatus(request.getStatus().toUpperCase());
        }
        VendorCategory saved = categoryRepository.save(category);
        auditService.log(currentUser, "Category", "UPDATE", "VendorCategory", saved.getCategoryId(),
                "Updated vendor category: " + saved.getCategoryName() + " (status=" + saved.getStatus() + ")");
        return toCategoryDto(saved);
    }

    @Transactional
    public void deleteCategory(Long id, User currentUser) {
        securityHelper.requireRoles(currentUser, "SYSTEM_ADMIN", "PROCUREMENT_ADMIN");
        VendorCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor category not found"));
        long count = vendorRepository.countByCategory_CategoryId(id);
        if (count > 0) {
            throw new BadRequestException("Cannot delete category '" + category.getCategoryName() + "' because " + count + " vendor(s) are assigned to it. Deactivate it instead.");
        }
        categoryRepository.delete(category);
        auditService.log(currentUser, "Category", "DELETE", "VendorCategory", id,
                "Deleted vendor category: " + category.getCategoryName());
    }

    public CategoryDto toCategoryDto(VendorCategory c) {
        long vendorCount = vendorRepository.countByCategory_CategoryId(c.getCategoryId());
        BigDecimal totalSpend = purchaseOrderRepository.findAll().stream()
                .filter(po -> po.getVendor() != null && po.getVendor().getCategory() != null &&
                        po.getVendor().getCategory().getCategoryId().equals(c.getCategoryId()))
                .filter(po -> !"REJECTED".equalsIgnoreCase(po.getStatus()) && !"CANCELLED".equalsIgnoreCase(po.getStatus()))
                .map(PurchaseOrder::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return CategoryDto.builder()
                .categoryId(c.getCategoryId())
                .categoryName(c.getCategoryName())
                .description(c.getDescription())
                .status(c.getStatus())
                .vendorCount(vendorCount)
                .totalSpend(totalSpend)
                .build();
    }

    // =========================================================================
    // VENDORS
    // =========================================================================

    @Transactional(readOnly = true)
    public List<VendorDto> getAllVendors(String search, String approvalStatus, Long categoryId, User currentUser) {
        List<Vendor> vendors = vendorRepository.findAllByOrderByCreatedAtDesc();

        if (securityHelper.hasRole(currentUser, "VENDOR")) {
            Optional<Vendor> myVendor = securityHelper.getVendorForUser(currentUser);
            vendors = myVendor.map(List::of).orElse(List.of());
        }

        return vendors.stream()
                .filter(v -> approvalStatus == null || approvalStatus.isBlank() || "ALL".equalsIgnoreCase(approvalStatus) ||
                        v.getApprovalStatus().equalsIgnoreCase(approvalStatus))
                .filter(v -> categoryId == null || (v.getCategory() != null && v.getCategory().getCategoryId().equals(categoryId)))
                .filter(v -> search == null || search.isBlank() ||
                        v.getCompanyName().toLowerCase().contains(search.toLowerCase()) ||
                        v.getVendorCode().toLowerCase().contains(search.toLowerCase()) ||
                        v.getContactPerson().toLowerCase().contains(search.toLowerCase()) ||
                        v.getEmail().toLowerCase().contains(search.toLowerCase()) ||
                        v.getCity().toLowerCase().contains(search.toLowerCase()))
                .map(this::toVendorDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public VendorDto getVendorById(Long id, User currentUser) {
        securityHelper.enforceVendorAccess(currentUser, id);
        Vendor vendor = vendorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found with ID: " + id));
        return toVendorDto(vendor);
    }

    @Transactional
    public VendorDto createVendor(VendorRequest request, User currentUser) {
        securityHelper.requireRoles(currentUser, "SYSTEM_ADMIN", "PROCUREMENT_ADMIN", "PROCUREMENT_MANAGER");

        VendorCategory category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Vendor category not found"));
        if (!"ACTIVE".equalsIgnoreCase(category.getStatus())) {
            throw new BadRequestException("Cannot assign vendor to an inactive category: " + category.getCategoryName());
        }

        String vendorCode = request.getVendorCode();
        if (vendorCode == null || vendorCode.isBlank()) {
            vendorCode = "VND-" + (1000 + vendorRepository.count() + 1) + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        } else {
            vendorCode = vendorCode.trim().toUpperCase();
            if (vendorRepository.existsByVendorCodeIgnoreCase(vendorCode)) {
                throw new BadRequestException("Vendor code '" + vendorCode + "' is already in use");
            }
        }

        User managedBy = currentUser;
        if (request.getManagedByUserId() != null) {
            managedBy = userRepository.findById(request.getManagedByUserId()).orElse(currentUser);
        }

        User vendorUser = null;
        if (request.getVendorUserId() != null) {
            vendorUser = userRepository.findById(request.getVendorUserId()).orElse(null);
        }

        Vendor vendor = Vendor.builder()
                .vendorCode(vendorCode)
                .companyName(request.getCompanyName().trim())
                .businessRegNo(request.getBusinessRegNo().trim())
                .taxId(request.getTaxId().trim())
                .contactPerson(request.getContactPerson().trim())
                .email(request.getEmail().trim())
                .phone(request.getPhone().trim())
                .address(request.getAddress().trim())
                .city(request.getCity().trim())
                .state(request.getState().trim())
                .country(request.getCountry().trim())
                .registrationDate(LocalDate.now())
                .approvalStatus("PENDING")
                .category(category)
                .managedBy(managedBy)
                .vendorUser(vendorUser)
                .build();

        Vendor saved = vendorRepository.save(vendor);
        auditService.log(currentUser, "Vendor", "ONBOARD_CREATE", "Vendor", saved.getVendorId(),
                "Registered new vendor " + saved.getCompanyName() + " (" + saved.getVendorCode() + ")");

        notificationService.notifyRole("PROCUREMENT_ADMIN",
                "New Vendor Pending Approval",
                "Vendor " + saved.getCompanyName() + " (" + saved.getVendorCode() + ") was registered and awaits compliance review.",
                "VENDOR", saved.getVendorId());

        return toVendorDto(saved);
    }

    @Transactional
    public VendorDto updateVendor(Long id, VendorRequest request, User currentUser) {
        Vendor vendor = vendorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found with ID: " + id));

        if (securityHelper.hasRole(currentUser, "VENDOR")) {
            securityHelper.enforceVendorAccess(currentUser, id);
        } else {
            securityHelper.requireRoles(currentUser, "SYSTEM_ADMIN", "PROCUREMENT_ADMIN", "PROCUREMENT_MANAGER");
        }

        VendorCategory category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Vendor category not found"));

        vendor.setCompanyName(request.getCompanyName().trim());
        vendor.setBusinessRegNo(request.getBusinessRegNo().trim());
        vendor.setTaxId(request.getTaxId().trim());
        vendor.setContactPerson(request.getContactPerson().trim());
        vendor.setEmail(request.getEmail().trim());
        vendor.setPhone(request.getPhone().trim());
        vendor.setAddress(request.getAddress().trim());
        vendor.setCity(request.getCity().trim());
        vendor.setState(request.getState().trim());
        vendor.setCountry(request.getCountry().trim());
        vendor.setCategory(category);

        if (request.getManagedByUserId() != null && !securityHelper.hasRole(currentUser, "VENDOR")) {
            userRepository.findById(request.getManagedByUserId()).ifPresent(vendor::setManagedBy);
        }

        Vendor saved = vendorRepository.save(vendor);
        auditService.log(currentUser, "Vendor", "UPDATE", "Vendor", saved.getVendorId(),
                "Updated profile details for vendor " + saved.getCompanyName());
        return toVendorDto(saved);
    }

    @Transactional
    public VendorDto updateVendorApproval(Long id, ApprovalDecisionRequest decision, User currentUser) {
        securityHelper.requireRoles(currentUser, "SYSTEM_ADMIN", "PROCUREMENT_ADMIN", "PROCUREMENT_MANAGER");
        Vendor vendor = vendorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found"));

        String newStatus = decision.getStatus().trim().toUpperCase();
        if (!List.of("APPROVED", "REJECTED", "SUSPENDED", "PENDING", "UNDER_REVIEW").contains(newStatus)) {
            throw new BadRequestException("Invalid vendor approval status: " + newStatus);
        }

        vendor.setApprovalStatus(newStatus);
        vendor.setApprovalRemarks(decision.getRemarks());
        Vendor saved = vendorRepository.save(vendor);

        auditService.log(currentUser, "Vendor", "APPROVAL_" + newStatus, "Vendor", saved.getVendorId(),
                "Vendor " + saved.getCompanyName() + " status changed to " + newStatus +
                        (decision.getRemarks() != null ? " — " + decision.getRemarks() : ""));

        if (saved.getVendorUser() != null) {
            notificationService.notifyUser(saved.getVendorUser(),
                    "Vendor Account " + newStatus,
                    "Your vendor account (" + saved.getCompanyName() + ") status has been updated to " + newStatus + ".",
                    "VENDOR", saved.getVendorId());
        }
        if (saved.getManagedBy() != null) {
            notificationService.notifyUser(saved.getManagedBy(),
                    "Vendor " + saved.getCompanyName() + " " + newStatus,
                    "Vendor " + saved.getCompanyName() + " (" + saved.getVendorCode() + ") was marked " + newStatus + " by " + currentUser.getName() + ".",
                    "VENDOR", saved.getVendorId());
        }

        return toVendorDto(saved);
    }

    public VendorDto toVendorDto(Vendor v) {
        List<PerformanceReview> reviews = reviewRepository.findByVendor_VendorIdOrderByReviewDateDesc(v.getVendorId());
        Double avgRating = reviews.isEmpty() ? null :
                reviews.stream()
                        .mapToDouble(r -> r.getOverallScore().doubleValue())
                        .average()
                        .orElse(0.0);
        if (avgRating != null) {
            avgRating = Math.round(avgRating * 100.0) / 100.0;
        }

        long activeContracts = contractRepository.findByVendor_VendorIdOrderByCreatedAtDesc(v.getVendorId())
                .stream()
                .filter(c -> "ACTIVE".equalsIgnoreCase(c.getStatus()))
                .count();

        List<PurchaseOrder> pos = purchaseOrderRepository.findByVendor_VendorIdOrderByCreatedAtDesc(v.getVendorId());
        BigDecimal totalSpend = pos.stream()
                .filter(po -> !"REJECTED".equalsIgnoreCase(po.getStatus()) && !"CANCELLED".equalsIgnoreCase(po.getStatus()))
                .map(PurchaseOrder::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return VendorDto.builder()
                .vendorId(v.getVendorId())
                .vendorCode(v.getVendorCode())
                .companyName(v.getCompanyName())
                .businessRegNo(v.getBusinessRegNo())
                .taxId(v.getTaxId())
                .contactPerson(v.getContactPerson())
                .email(v.getEmail())
                .phone(v.getPhone())
                .address(v.getAddress())
                .city(v.getCity())
                .state(v.getState())
                .country(v.getCountry())
                .registrationDate(v.getRegistrationDate())
                .approvalStatus(v.getApprovalStatus())
                .approvalRemarks(v.getApprovalRemarks())
                .categoryId(v.getCategory() != null ? v.getCategory().getCategoryId() : null)
                .categoryName(v.getCategory() != null ? v.getCategory().getCategoryName() : null)
                .managedByUserId(v.getManagedBy() != null ? v.getManagedBy().getUserId() : null)
                .managedByName(v.getManagedBy() != null ? v.getManagedBy().getName() : null)
                .vendorUserId(v.getVendorUser() != null ? v.getVendorUser().getUserId() : null)
                .averageRating(avgRating)
                .activeContractsCount(activeContracts)
                .totalOrdersCount(pos.size())
                .totalSpend(totalSpend)
                .createdAt(v.getCreatedAt())
                .updatedAt(v.getUpdatedAt())
                .build();
    }

    // =========================================================================
    // VENDOR DOCUMENTS & COMPLIANCE
    // =========================================================================

    @Transactional(readOnly = true)
    public List<VendorDocumentDto> getDocuments(Long vendorId, String verificationStatus, User currentUser) {
        if (vendorId != null) {
            securityHelper.enforceVendorAccess(currentUser, vendorId);
        }
        List<VendorDocument> docs = (vendorId != null)
                ? documentRepository.findByVendor_VendorIdOrderByUploadedAtDesc(vendorId)
                : documentRepository.findAllByOrderByUploadedAtDesc();

        if (securityHelper.hasRole(currentUser, "VENDOR")) {
            Optional<Vendor> myVendor = securityHelper.getVendorForUser(currentUser);
            docs = docs.stream()
                    .filter(d -> myVendor.isPresent() && d.getVendor().getVendorId().equals(myVendor.get().getVendorId()))
                    .collect(Collectors.toList());
        }

        return docs.stream()
                .filter(d -> verificationStatus == null || verificationStatus.isBlank() || "ALL".equalsIgnoreCase(verificationStatus) ||
                        d.getVerificationStatus().equalsIgnoreCase(verificationStatus))
                .map(this::toDocumentDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public VendorDocumentDto uploadVendorDocument(Long vendorId, String documentType, LocalDate expiryDate, MultipartFile file, String fileUrlFallback, User currentUser) {
        securityHelper.enforceVendorAccess(currentUser, vendorId);
        Vendor vendor = vendorRepository.findById(vendorId)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found"));

        if (documentType == null || documentType.isBlank()) {
            throw new BadRequestException("Document type is required");
        }

        String storedFileName;
        String originalName;
        if (file != null && !file.isEmpty()) {
            storedFileName = fileStorageService.storeFile(file, "VND" + vendorId);
            originalName = file.getOriginalFilename();
        } else if (fileUrlFallback != null && !fileUrlFallback.isBlank()) {
            storedFileName = fileStorageService.createSeedDocumentIfAbsent(
                    "VND" + vendorId + "-" + UUID.randomUUID().toString().substring(0, 6) + ".pdf",
                    "Compliance Document for " + vendor.getCompanyName() + " - Type: " + documentType);
            originalName = fileUrlFallback;
        } else {
            throw new BadRequestException("Document file or reference is required");
        }

        VendorDocument doc = VendorDocument.builder()
                .vendor(vendor)
                .documentType(documentType.trim())
                .originalFileName(originalName)
                .fileUrl("/api/v1/files/download/" + storedFileName)
                .uploadedAt(LocalDateTime.now())
                .expiryDate(expiryDate)
                .verificationStatus("PENDING")
                .build();

        VendorDocument saved = documentRepository.save(doc);
        auditService.log(currentUser, "Document", "UPLOAD", "VendorDocument", saved.getDocumentId(),
                "Uploaded " + saved.getDocumentType() + " for vendor " + vendor.getCompanyName());

        notificationService.notifyRole("PROCUREMENT_ADMIN",
                "Compliance Document Uploaded",
                vendor.getCompanyName() + " uploaded a new " + saved.getDocumentType() + " document for verification.",
                "DOCUMENT", saved.getDocumentId());

        return toDocumentDto(saved);
    }

    @Transactional
    public VendorDocumentDto verifyDocument(Long documentId, ApprovalDecisionRequest decision, User currentUser) {
        securityHelper.requireRoles(currentUser, "SYSTEM_ADMIN", "PROCUREMENT_ADMIN", "PROCUREMENT_MANAGER");
        VendorDocument doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor document not found"));

        String status = decision.getStatus().trim().toUpperCase();
        if (!List.of("VERIFIED", "REJECTED", "EXPIRED", "PENDING").contains(status)) {
            throw new BadRequestException("Invalid document verification status: " + status);
        }

        doc.setVerificationStatus(status);
        doc.setVerificationRemarks(decision.getRemarks());
        doc.setVerifiedBy(currentUser);
        doc.setVerifiedAt(LocalDateTime.now());

        VendorDocument saved = documentRepository.save(doc);
        auditService.log(currentUser, "Document", "VERIFY_" + status, "VendorDocument", saved.getDocumentId(),
                "Document " + saved.getDocumentType() + " for " + saved.getVendor().getCompanyName() + " marked " + status);

        if (saved.getVendor().getVendorUser() != null) {
            notificationService.notifyUser(saved.getVendor().getVendorUser(),
                    "Document " + status,
                    "Your compliance document (" + saved.getDocumentType() + ") was marked " + status + ".",
                    "DOCUMENT", saved.getDocumentId());
        }
        return toDocumentDto(saved);
    }

    public VendorDocumentDto toDocumentDto(VendorDocument d) {
        LocalDate now = LocalDate.now();
        boolean expired = d.getExpiryDate() != null && d.getExpiryDate().isBefore(now);
        boolean expiringSoon = d.getExpiryDate() != null && !expired && !d.getExpiryDate().isAfter(now.plusDays(30));

        return VendorDocumentDto.builder()
                .documentId(d.getDocumentId())
                .vendorId(d.getVendor().getVendorId())
                .vendorName(d.getVendor().getCompanyName())
                .vendorCode(d.getVendor().getVendorCode())
                .documentType(d.getDocumentType())
                .originalFileName(d.getOriginalFileName())
                .fileUrl(d.getFileUrl())
                .uploadedAt(d.getUploadedAt())
                .expiryDate(d.getExpiryDate())
                .verificationStatus(expired && !"REJECTED".equalsIgnoreCase(d.getVerificationStatus()) ? "EXPIRED" : d.getVerificationStatus())
                .verificationRemarks(d.getVerificationRemarks())
                .verifiedById(d.getVerifiedBy() != null ? d.getVerifiedBy().getUserId() : null)
                .verifiedByName(d.getVerifiedBy() != null ? d.getVerifiedBy().getName() : null)
                .verifiedAt(d.getVerifiedAt())
                .expiringSoon(expiringSoon)
                .expired(expired)
                .build();
    }

    // =========================================================================
    // CONTRACTS
    // =========================================================================

    @Transactional(readOnly = true)
    public List<ContractDto> getContracts(Long vendorId, String status, User currentUser) {
        if (vendorId != null) {
            securityHelper.enforceVendorAccess(currentUser, vendorId);
        }
        List<Contract> contracts = (vendorId != null)
                ? contractRepository.findByVendor_VendorIdOrderByCreatedAtDesc(vendorId)
                : contractRepository.findAllByOrderByCreatedAtDesc();

        if (securityHelper.hasRole(currentUser, "VENDOR")) {
            Optional<Vendor> myVendor = securityHelper.getVendorForUser(currentUser);
            contracts = contracts.stream()
                    .filter(c -> myVendor.isPresent() && c.getVendor().getVendorId().equals(myVendor.get().getVendorId()))
                    .collect(Collectors.toList());
        }

        return contracts.stream()
                .map(this::toContractDto)
                .filter(c -> {
                    if (status == null || status.isBlank() || "ALL".equalsIgnoreCase(status)) return true;
                    if ("EXPIRING_SOON".equalsIgnoreCase(status)) return c.isExpiringSoon();
                    return c.getStatus().equalsIgnoreCase(status);
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ContractDto getContractById(Long id, User currentUser) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found with ID: " + id));
        securityHelper.enforceVendorAccess(currentUser, contract.getVendor().getVendorId());
        return toContractDto(contract);
    }

    @Transactional
    public ContractDto createContract(ContractRequest request, User currentUser) {
        securityHelper.requireRoles(currentUser, "SYSTEM_ADMIN", "PROCUREMENT_ADMIN", "PROCUREMENT_MANAGER");
        Vendor vendor = vendorRepository.findById(request.getVendorId())
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found"));

        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new BadRequestException("Contract end date cannot be earlier than start date");
        }

        String contractNumber = "CTR-" + LocalDate.now().getYear() + "-" + (100 + contractRepository.count() + 1);
        String docUrl = request.getDocumentUrl();
        if (docUrl == null || docUrl.isBlank()) {
            String stored = fileStorageService.createSeedDocumentIfAbsent(contractNumber + ".pdf",
                    "MASTER SERVICE AGREEMENT " + contractNumber + "\nVendor: " + vendor.getCompanyName() + "\nTerms: " + request.getTerms());
            docUrl = "/api/v1/files/download/" + stored;
        }

        Contract contract = Contract.builder()
                .vendor(vendor)
                .contractNumber(contractNumber)
                .title(request.getTitle().trim())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .contractValue(request.getContractValue())
                .terms(request.getTerms().trim())
                .documentUrl(docUrl)
                .status(request.getStatus() != null && !request.getStatus().isBlank() ? request.getStatus().toUpperCase() : "ACTIVE")
                .build();

        Contract saved = contractRepository.save(contract);
        auditService.log(currentUser, "Contract", "CREATE", "Contract", saved.getContractId(),
                "Created contract " + saved.getContractNumber() + " (" + saved.getTitle() + ") with " + vendor.getCompanyName());

        if (vendor.getVendorUser() != null) {
            notificationService.notifyUser(vendor.getVendorUser(),
                    "New Contract Issued",
                    "Contract '" + saved.getTitle() + "' (" + saved.getContractNumber() + ") has been registered.",
                    "CONTRACT", saved.getContractId());
        }

        return toContractDto(saved);
    }

    @Transactional
    public ContractDto updateContract(Long id, ContractRequest request, User currentUser) {
        securityHelper.requireRoles(currentUser, "SYSTEM_ADMIN", "PROCUREMENT_ADMIN", "PROCUREMENT_MANAGER");
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found"));

        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new BadRequestException("Contract end date cannot be earlier than start date");
        }

        Vendor vendor = vendorRepository.findById(request.getVendorId())
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found"));

        contract.setVendor(vendor);
        contract.setTitle(request.getTitle().trim());
        contract.setStartDate(request.getStartDate());
        contract.setEndDate(request.getEndDate());
        contract.setContractValue(request.getContractValue());
        contract.setTerms(request.getTerms().trim());
        if (request.getDocumentUrl() != null && !request.getDocumentUrl().isBlank()) {
            contract.setDocumentUrl(request.getDocumentUrl());
        }
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            contract.setStatus(request.getStatus().toUpperCase());
        }

        Contract saved = contractRepository.save(contract);
        auditService.log(currentUser, "Contract", "UPDATE", "Contract", saved.getContractId(),
                "Updated contract " + saved.getContractNumber() + " (status=" + saved.getStatus() + ")");
        return toContractDto(saved);
    }

    public ContractDto toContractDto(Contract c) {
        LocalDate now = LocalDate.now();
        long daysRemaining = ChronoUnit.DAYS.between(now, c.getEndDate());
        String effectiveStatus = c.getStatus();
        if ("ACTIVE".equalsIgnoreCase(effectiveStatus) && daysRemaining < 0) {
            effectiveStatus = "EXPIRED";
        }
        boolean expiringSoon = "ACTIVE".equalsIgnoreCase(effectiveStatus) && daysRemaining >= 0 && daysRemaining <= 30;

        return ContractDto.builder()
                .contractId(c.getContractId())
                .contractNumber(c.getContractNumber())
                .vendorId(c.getVendor().getVendorId())
                .vendorName(c.getVendor().getCompanyName())
                .vendorCode(c.getVendor().getVendorCode())
                .title(c.getTitle())
                .startDate(c.getStartDate())
                .endDate(c.getEndDate())
                .contractValue(c.getContractValue())
                .terms(c.getTerms())
                .documentUrl(c.getDocumentUrl())
                .status(effectiveStatus)
                .daysRemaining(daysRemaining)
                .expiringSoon(expiringSoon)
                .createdAt(c.getCreatedAt())
                .build();
    }
}
