package com.vendora.controller;

import com.vendora.dto.ApiDtos.*;
import com.vendora.entity.User;
import com.vendora.service.FileStorageService;
import com.vendora.service.SecurityHelper;
import com.vendora.service.VendorOperationsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "02. Vendor Operations", description = "Vendors, Categories, Compliance Documents, and Contracts")
public class VendorOperationsController {

    private final VendorOperationsService vendorService;
    private final FileStorageService fileStorageService;
    private final SecurityHelper securityHelper;

    // --- CATEGORIES ---
    @GetMapping("/categories")
    @Operation(summary = "List vendor categories with vendor count and spend stats")
    public ResponseEntity<List<CategoryDto>> getCategories(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(vendorService.getAllCategories(search, status));
    }

    @PostMapping("/categories")
    @Operation(summary = "Create a new vendor category")
    public ResponseEntity<CategoryDto> createCategory(@Valid @RequestBody CategoryRequest request) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(vendorService.createCategory(request, currentUser));
    }

    @PutMapping("/categories/{id}")
    @Operation(summary = "Update or deactivate a vendor category")
    public ResponseEntity<CategoryDto> updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryRequest request) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(vendorService.updateCategory(id, request, currentUser));
    }

    @DeleteMapping("/categories/{id}")
    @Operation(summary = "Delete an unused vendor category")
    public ResponseEntity<Map<String, String>> deleteCategory(@PathVariable Long id) {
        User currentUser = securityHelper.getCurrentUser();
        vendorService.deleteCategory(id, currentUser);
        return ResponseEntity.ok(Map.of("message", "Category deleted successfully"));
    }

    // --- VENDORS ---
    @GetMapping("/vendors")
    @Operation(summary = "Search and filter vendors")
    public ResponseEntity<List<VendorDto>> getVendors(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String approvalStatus,
            @RequestParam(required = false) Long categoryId) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(vendorService.getAllVendors(search, approvalStatus, categoryId, currentUser));
    }

    @GetMapping("/vendors/{id}")
    @Operation(summary = "Get vendor profile details by ID")
    public ResponseEntity<VendorDto> getVendorById(@PathVariable Long id) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(vendorService.getVendorById(id, currentUser));
    }

    @PostMapping("/vendors")
    @Operation(summary = "Onboard / create a new vendor")
    public ResponseEntity<VendorDto> createVendor(@Valid @RequestBody VendorRequest request) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(vendorService.createVendor(request, currentUser));
    }

    @PutMapping("/vendors/{id}")
    @Operation(summary = "Update vendor profile details")
    public ResponseEntity<VendorDto> updateVendor(@PathVariable Long id, @Valid @RequestBody VendorRequest request) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(vendorService.updateVendor(id, request, currentUser));
    }

    @PatchMapping("/vendors/{id}/approval")
    @Operation(summary = "Approve, reject, or suspend a vendor with remarks")
    public ResponseEntity<VendorDto> updateVendorApproval(
            @PathVariable Long id,
            @Valid @RequestBody ApprovalDecisionRequest request) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(vendorService.updateVendorApproval(id, request, currentUser));
    }

    // --- DOCUMENTS ---
    @GetMapping("/documents")
    @Operation(summary = "Get all vendor compliance documents across the organization")
    public ResponseEntity<List<VendorDocumentDto>> getAllDocuments(
            @RequestParam(required = false) Long vendorId,
            @RequestParam(required = false) String status) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(vendorService.getDocuments(vendorId, status, currentUser));
    }

    @GetMapping("/vendors/{id}/documents")
    @Operation(summary = "Get compliance documents for a specific vendor")
    public ResponseEntity<List<VendorDocumentDto>> getVendorDocuments(@PathVariable Long id) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(vendorService.getDocuments(id, null, currentUser));
    }

    @PostMapping(value = "/vendors/{id}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload a compliance document file for a vendor")
    public ResponseEntity<VendorDocumentDto> uploadVendorDocumentMultipart(
            @PathVariable Long id,
            @RequestParam("documentType") String documentType,
            @RequestParam(value = "expiryDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expiryDate,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "fileName", required = false) String fileName) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(vendorService.uploadVendorDocument(id, documentType, expiryDate, file, fileName, currentUser));
    }

    @PostMapping(value = "/vendors/{id}/documents/metadata", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Register a vendor compliance document record via JSON")
    public ResponseEntity<VendorDocumentDto> uploadVendorDocumentJson(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload) {
        User currentUser = securityHelper.getCurrentUser();
        String docType = payload.get("documentType");
        LocalDate expiry = payload.get("expiryDate") != null && !payload.get("expiryDate").isBlank()
                ? LocalDate.parse(payload.get("expiryDate")) : null;
        String fileName = payload.getOrDefault("fileName", docType + ".pdf");
        return ResponseEntity.ok(vendorService.uploadVendorDocument(id, docType, expiry, null, fileName, currentUser));
    }

    @PatchMapping("/documents/{id}/verification")
    @Operation(summary = "Verify or reject a vendor compliance document")
    public ResponseEntity<VendorDocumentDto> verifyDocument(
            @PathVariable Long id,
            @Valid @RequestBody ApprovalDecisionRequest request) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(vendorService.verifyDocument(id, request, currentUser));
    }

    @GetMapping("/files/download/{fileName:.+}")
    @Operation(summary = "Authorized download of a private compliance, contract, or invoice document")
    public ResponseEntity<Resource> downloadFile(@PathVariable String fileName) {
        securityHelper.getCurrentUser(); // Ensure authenticated
        Resource resource = fileStorageService.loadAsResource(fileName);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    // --- CONTRACTS ---
    @GetMapping("/contracts")
    @Operation(summary = "List and filter vendor contracts")
    public ResponseEntity<List<ContractDto>> getContracts(
            @RequestParam(required = false) Long vendorId,
            @RequestParam(required = false) String status) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(vendorService.getContracts(vendorId, status, currentUser));
    }

    @GetMapping("/contracts/{id}")
    @Operation(summary = "Get contract details by ID")
    public ResponseEntity<ContractDto> getContractById(@PathVariable Long id) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(vendorService.getContractById(id, currentUser));
    }

    @PostMapping("/contracts")
    @Operation(summary = "Create a new vendor contract")
    public ResponseEntity<ContractDto> createContract(@Valid @RequestBody ContractRequest request) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(vendorService.createContract(request, currentUser));
    }

    @PutMapping("/contracts/{id}")
    @Operation(summary = "Update an existing vendor contract")
    public ResponseEntity<ContractDto> updateContract(@PathVariable Long id, @Valid @RequestBody ContractRequest request) {
        User currentUser = securityHelper.getCurrentUser();
        return ResponseEntity.ok(vendorService.updateContract(id, request, currentUser));
    }
}
