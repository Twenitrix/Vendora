package com.vendora.config;

import com.vendora.entity.*;
import com.vendora.repository.*;
import com.vendora.service.AuditService;
import com.vendora.service.FileStorageService;
import com.vendora.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final VendorCategoryRepository categoryRepository;
    private final VendorRepository vendorRepository;
    private final VendorDocumentRepository documentRepository;
    private final ContractRepository contractRepository;
    private final PurchaseOrderRepository poRepository;
    private final PurchaseRequisitionRepository requisitionRepository;
    private final GoodsReceiptRepository goodsReceiptRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final PerformanceReviewRepository reviewRepository;
    private final CommunicationRepository communicationRepository;
    private final PasswordEncoder passwordEncoder;
    private final FileStorageService fileStorageService;
    private final NotificationService notificationService;
    private final AuditService auditService;

    @Override
    @Transactional
    public void run(String... args) {
        if (roleRepository.count() > 0) {
            log.info("Vendora database already seeded ({} roles, {} users, {} vendors).",
                    roleRepository.count(), userRepository.count(), vendorRepository.count());
            return;
        }

        log.info("Initializing Vendora Enterprise seed data...");

        // 1. ROLES
        Role sysAdminRole = roleRepository.save(Role.builder().roleName("SYSTEM_ADMIN").description("Enterprise System Governance, User & Role Administration, and Audit Control").build());
        Role procAdminRole = roleRepository.save(Role.builder().roleName("PROCUREMENT_ADMIN").description("Vendor Onboarding, Compliance Document Verification, Contracts, and Order Operations").build());
        Role procManagerRole = roleRepository.save(Role.builder().roleName("PROCUREMENT_MANAGER").description("Procurement Approvals, Vendor Performance Reviews, and Spend Oversight").build());
        Role financeRole = roleRepository.save(Role.builder().roleName("FINANCE").description("Invoice Verification, Payment Disbursements, and Financial Treasury Reporting").build());
        Role employeeRole = roleRepository.save(Role.builder().roleName("EMPLOYEE").description("Internal Requisition Creation, Order Tracking, and Vendor Communication").build());
        Role vendorRole = roleRepository.save(Role.builder().roleName("VENDOR").description("External Supplier Self-Service Portal for Compliance, Orders, Invoices, and Messaging").build());

        String defaultPwd = passwordEncoder.encode("Vendora@2026");

        // 2. USERS
        User sysAdmin = userRepository.save(User.builder().name("Marcus Vance").email("admin@vendora.io").password(defaultPwd).phone("+1 (415) 890-1100").role(sysAdminRole).status("ACTIVE").build());
        User procAdmin = userRepository.save(User.builder().name("Elena Rostova").email("procurement@vendora.io").password(defaultPwd).phone("+1 (415) 890-1120").role(procAdminRole).status("ACTIVE").build());
        User procManager = userRepository.save(User.builder().name("David Sterling").email("manager@vendora.io").password(defaultPwd).phone("+1 (415) 890-1140").role(procManagerRole).status("ACTIVE").build());
        User financeUser = userRepository.save(User.builder().name("Sophia Chen").email("finance@vendora.io").password(defaultPwd).phone("+1 (415) 890-1160").role(financeRole).status("ACTIVE").build());
        User employeeUser = userRepository.save(User.builder().name("Liam O'Connor").email("employee@vendora.io").password(defaultPwd).phone("+1 (415) 890-1180").role(employeeRole).status("ACTIVE").build());
        User vendorUser1 = userRepository.save(User.builder().name("Apex Cloud Portal").email("portal@apexcloud.io").password(defaultPwd).phone("+1 (650) 442-8800").role(vendorRole).status("ACTIVE").build());
        User vendorUser2 = userRepository.save(User.builder().name("NovaTech Supplier Hub").email("portal@novatech.io").password(defaultPwd).phone("+1 (312) 774-9200").role(vendorRole).status("ACTIVE").build());

        // 3. VENDOR CATEGORIES
        VendorCategory catCloud = categoryRepository.save(VendorCategory.builder().categoryName("Cloud & Enterprise Software").description("SaaS subscriptions, cloud infrastructure, cybersecurity, and enterprise licensing").status("ACTIVE").build());
        VendorCategory catHardware = categoryRepository.save(VendorCategory.builder().categoryName("IT Hardware & Precision Equipment").description("Workstations, data center servers, networking gear, and industrial sensors").status("ACTIVE").build());
        VendorCategory catLogistics = categoryRepository.save(VendorCategory.builder().categoryName("Global Logistics & Freight").description("Supply chain warehousing, cold-chain transport, and international customs brokerage").status("ACTIVE").build());
        VendorCategory catFacilities = categoryRepository.save(VendorCategory.builder().categoryName("Facilities & Smart Workplace").description("Corporate real estate maintenance, HVAC automation, and workplace security").status("ACTIVE").build());
        VendorCategory catConsulting = categoryRepository.save(VendorCategory.builder().categoryName("Strategic Advisory & Legal").description("Compliance auditing, legal counsel, tax advisory, and technical staff augmentation").status("ACTIVE").build());

        // 4. VENDORS
        Vendor vApex = vendorRepository.save(Vendor.builder()
                .vendorCode("VND-1001")
                .companyName("Apex Cloud Systems Inc.")
                .businessRegNo("US-DE-8849201")
                .taxId("EIN-94-3829104")
                .contactPerson("arthur.pendleton@apexcloud.io")
                .email("portal@apexcloud.io")
                .phone("+1 (650) 442-8800")
                .address("450 Mission Street, Suite 2400")
                .city("San Francisco")
                .state("CA")
                .country("United States")
                .registrationDate(LocalDate.now().minusMonths(8))
                .approvalStatus("APPROVED")
                .approvalRemarks("SOC2 Type II and ISO 27001 verified. Approved as Tier-1 Cloud Partner.")
                .category(catCloud)
                .managedBy(procAdmin)
                .vendorUser(vendorUser1)
                .build());

        Vendor vNova = vendorRepository.save(Vendor.builder()
                .vendorCode("VND-1002")
                .companyName("NovaTech Industrial Hardware")
                .businessRegNo("US-IL-5539102")
                .taxId("EIN-36-9182736")
                .contactPerson("Claire Vance-Kerr")
                .email("portal@novatech.io")
                .phone("+1 (312) 774-9200")
                .address("233 S Wacker Drive, Floor 18")
                .city("Chicago")
                .state("IL")
                .country("United States")
                .registrationDate(LocalDate.now().minusMonths(6))
                .approvalStatus("APPROVED")
                .approvalRemarks("ISO 9001 hardware manufacturer verified by Procurement Admin.")
                .category(catHardware)
                .managedBy(procAdmin)
                .vendorUser(vendorUser2)
                .build());

        Vendor vMeridian = vendorRepository.save(Vendor.builder()
                .vendorCode("VND-1003")
                .companyName("Meridian Global Logistics")
                .businessRegNo("US-NY-3310948")
                .taxId("EIN-13-7748291")
                .contactPerson("Henrik Lindqvist")
                .email("ops@meridianfreight.com")
                .phone("+1 (212) 609-4100")
                .address("175 Greenwich Street")
                .city("New York")
                .state("NY")
                .country("United States")
                .registrationDate(LocalDate.now().minusMonths(5))
                .approvalStatus("APPROVED")
                .approvalRemarks("Customs and C-TPAT freight credentials validated.")
                .category(catLogistics)
                .managedBy(procManager)
                .build());

        Vendor vHelios = vendorRepository.save(Vendor.builder()
                .vendorCode("VND-1004")
                .companyName("Helios Smart Facilities Group")
                .businessRegNo("US-TX-7720194")
                .taxId("EIN-75-4491023")
                .contactPerson("Mateo Alvarez")
                .email("contracts@heliosfacilities.io")
                .phone("+1 (512) 390-7710")
                .address("600 Congress Ave")
                .city("Austin")
                .state("TX")
                .country("United States")
                .registrationDate(LocalDate.now().minusDays(14))
                .approvalStatus("PENDING")
                .approvalRemarks("Awaiting final insurance certificate verification.")
                .category(catFacilities)
                .managedBy(procAdmin)
                .build());

        Vendor vAegis = vendorRepository.save(Vendor.builder()
                .vendorCode("VND-1005")
                .companyName("Aegis Cyber & Advisory LLP")
                .businessRegNo("US-MA-9920144")
                .taxId("EIN-04-6629182")
                .contactPerson("Dr. Evelyn Harper")
                .email("counsel@aegisadvisory.io")
                .phone("+1 (617) 502-3300")
                .address("200 Clarendon Street")
                .city("Boston")
                .state("MA")
                .country("United States")
                .registrationDate(LocalDate.now().minusDays(6))
                .approvalStatus("PENDING")
                .approvalRemarks("New strategic advisory onboarding application.")
                .category(catConsulting)
                .managedBy(procManager)
                .build());

        // 5. VENDOR DOCUMENTS
        String doc1File = fileStorageService.createSeedDocumentIfAbsent("apex-soc2-2026.pdf", "APEX CLOUD SYSTEMS - SOC2 TYPE II COMPLIANCE CERTIFICATE");
        documentRepository.save(VendorDocument.builder()
                .vendor(vApex)
                .documentType("SOC2 Type II Compliance")
                .originalFileName("apex-soc2-2026.pdf")
                .fileUrl("/api/v1/files/download/" + doc1File)
                .uploadedAt(LocalDateTime.now().minusMonths(4))
                .expiryDate(LocalDate.now().plusMonths(8))
                .verificationStatus("VERIFIED")
                .verificationRemarks("Verified against AICPA auditor registry.")
                .verifiedBy(procAdmin)
                .verifiedAt(LocalDateTime.now().minusMonths(4).plusDays(1))
                .build());

        String doc2File = fileStorageService.createSeedDocumentIfAbsent("apex-w9-tax.pdf", "APEX CLOUD SYSTEMS - IRS FORM W-9 TIN VERIFICATION");
        documentRepository.save(VendorDocument.builder()
                .vendor(vApex)
                .documentType("Tax Registration (W-9)")
                .originalFileName("apex-w9-tax.pdf")
                .fileUrl("/api/v1/files/download/" + doc2File)
                .uploadedAt(LocalDateTime.now().minusMonths(6))
                .expiryDate(LocalDate.now().plusDays(18)) // Expiring soon alert!
                .verificationStatus("VERIFIED")
                .verificationRemarks("TIN matched IRS records.")
                .verifiedBy(procAdmin)
                .verifiedAt(LocalDateTime.now().minusMonths(6).plusDays(2))
                .build());

        String doc3File = fileStorageService.createSeedDocumentIfAbsent("novatech-iso9001.pdf", "NOVATECH INDUSTRIAL - ISO 9001 QUALITY MANAGEMENT CERTIFICATE");
        documentRepository.save(VendorDocument.builder()
                .vendor(vNova)
                .documentType("ISO 9001 Certification")
                .originalFileName("novatech-iso9001.pdf")
                .fileUrl("/api/v1/files/download/" + doc3File)
                .uploadedAt(LocalDateTime.now().minusMonths(3))
                .expiryDate(LocalDate.now().plusMonths(11))
                .verificationStatus("VERIFIED")
                .verificationRemarks("Quality management certificate validated.")
                .verifiedBy(procAdmin)
                .verifiedAt(LocalDateTime.now().minusMonths(3).plusDays(1))
                .build());

        String doc4File = fileStorageService.createSeedDocumentIfAbsent("helios-liability-ins.pdf", "HELIOS FACILITIES - COMMERCIAL LIABILITY INSURANCE");
        documentRepository.save(VendorDocument.builder()
                .vendor(vHelios)
                .documentType("Commercial Liability Insurance")
                .originalFileName("helios-liability-ins.pdf")
                .fileUrl("/api/v1/files/download/" + doc4File)
                .uploadedAt(LocalDateTime.now().minusDays(5))
                .expiryDate(LocalDate.now().plusMonths(12))
                .verificationStatus("PENDING")
                .verificationRemarks("In compliance review queue.")
                .build());

        String doc5File = fileStorageService.createSeedDocumentIfAbsent("aegis-incorporation.pdf", "AEGIS ADVISORY LLP - CERTIFICATE OF GOOD STANDING");
        documentRepository.save(VendorDocument.builder()
                .vendor(vAegis)
                .documentType("Certificate of Incorporation")
                .originalFileName("aegis-incorporation.pdf")
                .fileUrl("/api/v1/files/download/" + doc5File)
                .uploadedAt(LocalDateTime.now().minusDays(3))
                .expiryDate(LocalDate.now().plusMonths(24))
                .verificationStatus("PENDING")
                .build());

        // 6. CONTRACTS
        String ctr1File = fileStorageService.createSeedDocumentIfAbsent("CTR-2026-101.pdf", "ENTERPRISE CLOUD INFRASTRUCTURE MSA - APEX CLOUD SYSTEMS");
        contractRepository.save(Contract.builder()
                .vendor(vApex)
                .contractNumber("CTR-2026-101")
                .title("Enterprise Multi-Region Cloud Infrastructure & Kubernetes MSA")
                .startDate(LocalDate.now().minusMonths(6))
                .endDate(LocalDate.now().plusMonths(6))
                .contractValue(new BigDecimal("480000.00"))
                .terms("99.99% uptime SLA, Net-30 billing cycle, dedicated TAM support, annual SOC2 renewal mandatory.")
                .documentUrl("/api/v1/files/download/" + ctr1File)
                .status("ACTIVE")
                .build());

        String ctr2File = fileStorageService.createSeedDocumentIfAbsent("CTR-2026-102.pdf", "HARDWARE SUPPLY FRAMEWORK AGREEMENT - NOVATECH INDUSTRIAL");
        contractRepository.save(Contract.builder()
                .vendor(vNova)
                .contractNumber("CTR-2026-102")
                .title("Global Data Center Rack & Blade Server Supply Agreement")
                .startDate(LocalDate.now().minusMonths(11))
                .endDate(LocalDate.now().plusDays(19)) // Expiring within 30 days!
                .contractValue(new BigDecimal("350000.00"))
                .terms("3-year next-business-day hardware replacement warranty, FOB destination, Net-30 payment terms.")
                .documentUrl("/api/v1/files/download/" + ctr2File)
                .status("ACTIVE")
                .build());

        String ctr3File = fileStorageService.createSeedDocumentIfAbsent("CTR-2026-103.pdf", "GLOBAL FREIGHT FORWARDING RETAINER - MERIDIAN LOGISTICS");
        contractRepository.save(Contract.builder()
                .vendor(vMeridian)
                .contractNumber("CTR-2026-103")
                .title("North American & EMEA Priority Freight & Customs Retainer")
                .startDate(LocalDate.now().minusMonths(4))
                .endDate(LocalDate.now().plusMonths(8))
                .contractValue(new BigDecimal("210000.00"))
                .terms("Guaranteed container allocation, real-time GPS telemetry, fixed fuel surcharge cap at 8%.")
                .documentUrl("/api/v1/files/download/" + ctr3File)
                .status("ACTIVE")
                .build());

        // 7. PURCHASE REQUISITIONS
        PurchaseRequisition req1 = PurchaseRequisition.builder()
                .requisitionNumber("REQ-2026-1001")
                .title("Q4 AI Compute Cluster Expansion")
                .description("High-memory GPU compute nodes and NVMe storage arrays for internal ML workloads")
                .department("Platform Engineering")
                .priority("HIGH")
                .neededBy(LocalDate.now().plusDays(21))
                .category(catHardware)
                .preferredVendor(vNova)
                .requestedBy(employeeUser)
                .estimatedAmount(new BigDecimal("69120.00"))
                .status("PENDING_APPROVAL")
                .remarks("Urgent capacity requirement for Q4 product release")
                .build();
        req1.setItems(List.of(
                PurchaseRequisitionItem.builder().requisition(req1).itemName("NovaBlade H100 Server Node").description("8x GPU Rackmount Server").quantity(2).estimatedUnitPrice(new BigDecimal("28000.00")).taxAmount(new BigDecimal("4480.00")).lineTotal(new BigDecimal("60480.00")).build(),
                PurchaseRequisitionItem.builder().requisition(req1).itemName("Enterprise NVMe Storage Shelf").description("64TB All-Flash Array").quantity(1).estimatedUnitPrice(new BigDecimal("8000.00")).taxAmount(new BigDecimal("640.00")).lineTotal(new BigDecimal("8640.00")).build()
        ));
        requisitionRepository.save(req1);

        // 8. PURCHASE ORDERS & ITEMS
        // PO 1: Closed & Fully Paid (3 months ago)
        PurchaseOrder po1 = PurchaseOrder.builder()
                .poNumber("PO-2026-2001")
                .vendor(vApex)
                .createdBy(procAdmin)
                .approvedBy(procManager)
                .orderDate(LocalDate.now().minusMonths(3))
                .expectedDeliveryDate(LocalDate.now().minusMonths(3).plusDays(7))
                .subtotalAmount(new BigDecimal("80000.00"))
                .taxAmount(new BigDecimal("6400.00"))
                .totalAmount(new BigDecimal("86400.00"))
                .status("CLOSED")
                .remarks("Annual Enterprise Cloud Kubernetes Platform License & Dedicated Security Cluster")
                .build();
        po1.setItems(List.of(
                PurchaseOrderItem.builder().purchaseOrder(po1).itemName("Apex Enterprise Kubernetes Control Plane").description("Annual multi-region cluster license (500 nodes)").quantity(1).receivedQuantity(1).unitPrice(new BigDecimal("55000.00")).taxAmount(new BigDecimal("4400.00")).lineTotal(new BigDecimal("59400.00")).build(),
                PurchaseOrderItem.builder().purchaseOrder(po1).itemName("Zero-Trust Cloud WAF & DDoS Shield").description("Managed edge security suite").quantity(5).receivedQuantity(5).unitPrice(new BigDecimal("5000.00")).taxAmount(new BigDecimal("2000.00")).lineTotal(new BigDecimal("27000.00")).build()
        ));
        po1 = poRepository.save(po1);

        // PO 2: Delivered, Partially Paid (2 months ago)
        PurchaseOrder po2 = PurchaseOrder.builder()
                .poNumber("PO-2026-2002")
                .vendor(vNova)
                .createdBy(employeeUser)
                .approvedBy(procManager)
                .orderDate(LocalDate.now().minusMonths(2))
                .expectedDeliveryDate(LocalDate.now().minusMonths(2).plusDays(14))
                .subtotalAmount(new BigDecimal("62000.00"))
                .taxAmount(new BigDecimal("4960.00"))
                .totalAmount(new BigDecimal("66960.00"))
                .status("DELIVERED")
                .remarks("Core Data Center Rack Upgrade & Developer Workstations")
                .build();
        po2.setItems(List.of(
                PurchaseOrderItem.builder().purchaseOrder(po2).itemName("NovaRack 42U Smart Enclosure").description("Dual PDU redundant cooling rack").quantity(4).receivedQuantity(4).unitPrice(new BigDecimal("8000.00")).taxAmount(new BigDecimal("2560.00")).lineTotal(new BigDecimal("34560.00")).build(),
                PurchaseOrderItem.builder().purchaseOrder(po2).itemName("NovaPro Precision Workstation Z9").description("128GB RAM, Xeon W-3400").quantity(10).receivedQuantity(10).unitPrice(new BigDecimal("3000.00")).taxAmount(new BigDecimal("2400.00")).lineTotal(new BigDecimal("32400.00")).build()
        ));
        po2 = poRepository.save(po2);

        // PO 3: Delivered, Invoice Pending Approval (1 month ago)
        PurchaseOrder po3 = PurchaseOrder.builder()
                .poNumber("PO-2026-2003")
                .vendor(vMeridian)
                .createdBy(procAdmin)
                .approvedBy(procManager)
                .orderDate(LocalDate.now().minusMonths(1))
                .expectedDeliveryDate(LocalDate.now().minusMonths(1).plusDays(10))
                .subtotalAmount(new BigDecimal("35000.00"))
                .taxAmount(new BigDecimal("2800.00"))
                .totalAmount(new BigDecimal("37800.00"))
                .status("DELIVERED")
                .remarks("EMEA Distribution Hub Air-Freight & Customs Clearance Batch #14")
                .build();
        po3.setItems(List.of(
                PurchaseOrderItem.builder().purchaseOrder(po3).itemName("Priority Air-Freight Charter (FRA -> JFK)").description("Temperature-controlled pallet transport").quantity(5).receivedQuantity(5).unitPrice(new BigDecimal("6000.00")).taxAmount(new BigDecimal("2400.00")).lineTotal(new BigDecimal("32400.00")).build(),
                PurchaseOrderItem.builder().purchaseOrder(po3).itemName("Bonded Customs Brokerage & Tariff Handling").description("Full manifest clearance").quantity(1).receivedQuantity(1).unitPrice(new BigDecimal("5000.00")).taxAmount(new BigDecimal("400.00")).lineTotal(new BigDecimal("5400.00")).build()
        ));
        po3 = poRepository.save(po3);

        // PO 4: Approved & In Fulfillment (Current month)
        PurchaseOrder po4 = PurchaseOrder.builder()
                .poNumber("PO-2026-2004")
                .vendor(vApex)
                .createdBy(employeeUser)
                .approvedBy(procManager)
                .orderDate(LocalDate.now().minusDays(8))
                .expectedDeliveryDate(LocalDate.now().plusDays(12))
                .subtotalAmount(new BigDecimal("44000.00"))
                .taxAmount(new BigDecimal("3520.00"))
                .totalAmount(new BigDecimal("47520.00"))
                .status("APPROVED")
                .remarks("Enterprise Observability & SIEM Log Retention Add-On")
                .build();
        po4.setItems(List.of(
                PurchaseOrderItem.builder().purchaseOrder(po4).itemName("Apex Telemetry & SIEM Ingestion Pack").description("100TB/month high-speed log indexing").quantity(4).receivedQuantity(0).unitPrice(new BigDecimal("11000.00")).taxAmount(new BigDecimal("3520.00")).lineTotal(new BigDecimal("47520.00")).build()
        ));
        po4 = poRepository.save(po4);

        // PO 5: Pending Approval (Current month)
        PurchaseOrder po5 = PurchaseOrder.builder()
                .poNumber("PO-2026-2005")
                .vendor(vNova)
                .createdBy(procAdmin)
                .orderDate(LocalDate.now().minusDays(2))
                .expectedDeliveryDate(LocalDate.now().plusDays(18))
                .subtotalAmount(new BigDecimal("29000.00"))
                .taxAmount(new BigDecimal("2320.00"))
                .totalAmount(new BigDecimal("31320.00"))
                .status("PENDING_APPROVAL")
                .remarks("Branch Office Core Fiber Switches & Wi-Fi 7 Access Points")
                .build();
        po5.setItems(List.of(
                PurchaseOrderItem.builder().purchaseOrder(po5).itemName("NovaSwitch 48-Port 100GbE Spine Switch").description("Layer-3 managed optical switch").quantity(2).receivedQuantity(0).unitPrice(new BigDecimal("11500.00")).taxAmount(new BigDecimal("1840.00")).lineTotal(new BigDecimal("24840.00")).build(),
                PurchaseOrderItem.builder().purchaseOrder(po5).itemName("Enterprise Wi-Fi 7 Tri-Band AP").description("Indoor high-density access point").quantity(10).receivedQuantity(0).unitPrice(new BigDecimal("600.00")).taxAmount(new BigDecimal("480.00")).lineTotal(new BigDecimal("6480.00")).build()
        ));
        po5 = poRepository.save(po5);

        // 9. INVOICES & PAYMENTS
        String inv1File = fileStorageService.createSeedDocumentIfAbsent("INV-APEX-9001.pdf", "INVOICE INV-APEX-9001 - $86,400.00 - PAID IN FULL");
        Invoice inv1 = invoiceRepository.save(Invoice.builder()
                .vendor(vApex)
                .purchaseOrder(po1)
                .invoiceNumber("INV-APEX-9001")
                .invoiceDate(LocalDate.now().minusMonths(3).plusDays(8))
                .dueDate(LocalDate.now().minusMonths(2).plusDays(8))
                .subtotal(new BigDecimal("80000.00"))
                .taxAmount(new BigDecimal("6400.00"))
                .totalAmount(new BigDecimal("86400.00"))
                .paidAmount(new BigDecimal("86400.00"))
                .approvalStatus("APPROVED")
                .approvalRemarks("3-way match verified against PO-2026-2001 and license activation.")
                .paymentStatus("PAID")
                .documentUrl("/api/v1/files/download/" + inv1File)
                .verifiedBy(financeUser)
                .build());

        paymentRepository.save(Payment.builder()
                .invoice(inv1)
                .paidBy(financeUser)
                .paymentDate(LocalDateTime.now().minusMonths(2).plusDays(2))
                .amount(new BigDecimal("86400.00"))
                .paymentMethod("WIRE_TRANSFER")
                .transactionRef("TXN-ACH-2026-88410")
                .status("COMPLETED")
                .remarks("Full settlement via JPMorgan Corporate Treasury Wire")
                .build());

        String inv2File = fileStorageService.createSeedDocumentIfAbsent("INV-NOVA-9002.pdf", "INVOICE INV-NOVA-9002 - $66,960.00 - PARTIALLY PAID");
        Invoice inv2 = invoiceRepository.save(Invoice.builder()
                .vendor(vNova)
                .purchaseOrder(po2)
                .invoiceNumber("INV-NOVA-9002")
                .invoiceDate(LocalDate.now().minusMonths(1).minusDays(10))
                .dueDate(LocalDate.now().minusDays(4)) // Overdue remaining balance!
                .subtotal(new BigDecimal("62000.00"))
                .taxAmount(new BigDecimal("4960.00"))
                .totalAmount(new BigDecimal("66960.00"))
                .paidAmount(new BigDecimal("35000.00"))
                .approvalStatus("APPROVED")
                .approvalRemarks("Verified against Goods Receipt GRN-PO-2026-2002. Approved for milestone settlement.")
                .paymentStatus("PARTIALLY_PAID")
                .documentUrl("/api/v1/files/download/" + inv2File)
                .verifiedBy(financeUser)
                .build());

        paymentRepository.save(Payment.builder()
                .invoice(inv2)
                .paidBy(financeUser)
                .paymentDate(LocalDateTime.now().minusDays(20))
                .amount(new BigDecimal("35000.00"))
                .paymentMethod("ACH_TRANSFER")
                .transactionRef("TXN-ACH-2026-88925")
                .status("COMPLETED")
                .remarks("First milestone installment (remaining balance: $31,960.00)")
                .build());

        String inv3File = fileStorageService.createSeedDocumentIfAbsent("INV-MER-9003.pdf", "INVOICE INV-MER-9003 - $37,800.00 - PENDING FINANCE VERIFICATION");
        invoiceRepository.save(Invoice.builder()
                .vendor(vMeridian)
                .purchaseOrder(po3)
                .invoiceNumber("INV-MER-9003")
                .invoiceDate(LocalDate.now().minusDays(6))
                .dueDate(LocalDate.now().plusDays(24))
                .subtotal(new BigDecimal("35000.00"))
                .taxAmount(new BigDecimal("2800.00"))
                .totalAmount(new BigDecimal("37800.00"))
                .paidAmount(BigDecimal.ZERO)
                .approvalStatus("PENDING")
                .paymentStatus("UNPAID")
                .documentUrl("/api/v1/files/download/" + inv3File)
                .build());

        // 10. PERFORMANCE REVIEWS
        reviewRepository.save(PerformanceReview.builder()
                .vendor(vApex)
                .reviewedBy(procManager)
                .purchaseOrder(po1)
                .qualityScore(new BigDecimal("4.90"))
                .deliveryScore(new BigDecimal("5.00"))
                .communicationScore(new BigDecimal("4.80"))
                .complianceScore(new BigDecimal("5.00"))
                .overallScore(new BigDecimal("4.93"))
                .comments("Zero-downtime cluster provisioning and exemplary security compliance documentation.")
                .reviewDate(LocalDate.now().minusMonths(2))
                .build());

        reviewRepository.save(PerformanceReview.builder()
                .vendor(vNova)
                .reviewedBy(procManager)
                .purchaseOrder(po2)
                .qualityScore(new BigDecimal("4.70"))
                .deliveryScore(new BigDecimal("4.40"))
                .communicationScore(new BigDecimal("4.60"))
                .complianceScore(new BigDecimal("4.80"))
                .overallScore(new BigDecimal("4.63"))
                .comments("Hardware build quality is outstanding; minor 1-day freight delay at Chicago hub.")
                .reviewDate(LocalDate.now().minusMonths(1))
                .build());

        reviewRepository.save(PerformanceReview.builder()
                .vendor(vMeridian)
                .reviewedBy(procAdmin)
                .purchaseOrder(po3)
                .qualityScore(new BigDecimal("4.50"))
                .deliveryScore(new BigDecimal("4.60"))
                .communicationScore(new BigDecimal("4.40"))
                .complianceScore(new BigDecimal("4.70"))
                .overallScore(new BigDecimal("4.55"))
                .comments("Smooth customs clearance across Frankfurt and JFK terminals.")
                .reviewDate(LocalDate.now().minusDays(10))
                .build());

        // 11. COMMUNICATIONS
        communicationRepository.save(Communication.builder()
                .vendor(vApex)
                .sender(procAdmin)
                .subject("Upcoming W-9 Tax Document Renewal Reminder")
                .message("Hi Arthur, our compliance engine flagged that your W-9 Tax Registration expires in 18 days. Please upload the renewed copy via the Vendor Portal.")
                .sentAt(LocalDateTime.now().minusDays(3))
                .status("READ")
                .build());

        communicationRepository.save(Communication.builder()
                .vendor(vApex)
                .sender(vendorUser1)
                .subject("Re: Upcoming W-9 Tax Document Renewal Reminder")
                .message("Thank you Elena. Our tax department is finalizing the signed 2026 W-9 form and we will upload it to the compliance portal by Friday.")
                .sentAt(LocalDateTime.now().minusDays(2))
                .status("SENT")
                .build());

        communicationRepository.save(Communication.builder()
                .vendor(vNova)
                .sender(financeUser)
                .subject("Installment Settlement Confirmation — INV-NOVA-9002")
                .message("Hello Claire, confirming that $35,000.00 (Ref: TXN-ACH-2026-88925) has been disbursed. The remaining $31,960.00 balance is scheduled for this week's payment run.")
                .sentAt(LocalDateTime.now().minusDays(1))
                .status("SENT")
                .build());

        // 12. NOTIFICATIONS
        notificationService.notifyUser(sysAdmin, "Vendora Governance Active", "All 13 core ER entities and role security policies are active and verified.", "SYSTEM", 1L);
        notificationService.notifyUser(procAdmin, "2 Vendors Pending Onboarding Approval", "Helios Smart Facilities Group and Aegis Cyber & Advisory LLP await compliance verification.", "VENDOR", vHelios.getVendorId());
        notificationService.notifyUser(procManager, "Purchase Order PO-2026-2005 Awaiting Approval", "PO-2026-2005 ($31,320.00) for NovaTech Industrial Hardware requires manager sign-off.", "PURCHASE_ORDER", po5.getPoId());
        notificationService.notifyUser(financeUser, "Invoice INV-MER-9003 Pending Verification", "Meridian Global Logistics submitted INV-MER-9003 ($37,800.00) against PO-2026-2003.", "INVOICE", 3L);
        notificationService.notifyUser(employeeUser, "PO-2026-2004 Approved", "Your order PO-2026-2004 with Apex Cloud Systems has been approved by David Sterling.", "PURCHASE_ORDER", po4.getPoId());
        notificationService.notifyUser(vendorUser1, "New Purchase Order Issued: PO-2026-2004", "Vendora issued PO-2026-2004 ($47,520.00). Please review delivery schedule in your portal.", "PURCHASE_ORDER", po4.getPoId());
        notificationService.notifyUser(vendorUser2, "Contract CTR-2026-102 Approaching Renewal", "Your Master Supply Agreement CTR-2026-102 expires in 19 days.", "CONTRACT", 2L);

        // 13. AUDIT LOGS
        auditService.log(sysAdmin, "System", "BOOTSTRAP", "Platform", 1L, "Initialized Vendora Enterprise RBAC and 13 core relational entities");
        auditService.log(procAdmin, "Vendor", "APPROVAL_APPROVED", "Vendor", vApex.getVendorId(), "Approved Tier-1 vendor Apex Cloud Systems Inc. (VND-1001)");
        auditService.log(procAdmin, "Document", "VERIFY_VERIFIED", "VendorDocument", 1L, "Verified SOC2 Type II Compliance certificate for Apex Cloud Systems Inc.");
        auditService.log(procManager, "PurchaseOrder", "STATUS_APPROVED", "PurchaseOrder", po4.getPoId(), "Approved Purchase Order PO-2026-2004 ($47,520.00)");
        auditService.log(financeUser, "Invoice", "APPROVAL_APPROVED", "Invoice", inv2.getInvoiceId(), "Verified Invoice INV-NOVA-9002 ($66,960.00) against PO-2026-2002");
        auditService.log(financeUser, "Payment", "RECORD_PAYMENT", "Payment", 2L, "Recorded ACH installment TXN-ACH-2026-88925 ($35,000.00) for INV-NOVA-9002");

        log.info("Vendora Enterprise seed data loaded successfully.");
    }
}
