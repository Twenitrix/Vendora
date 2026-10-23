package com.vendora;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vendora.dto.ApiDtos.*;
import com.vendora.entity.User;
import com.vendora.repository.UserRepository;
import com.vendora.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class VendoraEnterpriseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VendorOperationsService vendorService;

    @Autowired
    private ProcurementFinanceService procurementService;

    @Autowired
    private EnterpriseIntelligenceService intelligenceService;

    @Autowired
    private NotificationService notificationService;

    private String loginAndGetToken(String email, String password) throws Exception {
        LoginRequest req = new LoginRequest(email, password);
        MvcResult res = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();
        AuthResponse auth = objectMapper.readValue(res.getResponse().getContentAsString(), AuthResponse.class);
        return auth.getToken();
    }

    @Test
    @Order(1)
    @DisplayName("1. Authentication & JWT issuance works and never exposes password hashes")
    void testAuthenticationAndProfile() throws Exception {
        String token = loginAndGetToken("admin@vendora.io", "Vendora@2026");
        assertThat(token).isNotBlank();

        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("admin@vendora.io"))
                .andExpect(jsonPath("$.roleName").value("SYSTEM_ADMIN"))
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    @Order(2)
    @DisplayName("2. Role-based authorization blocks VENDOR from approving vendors or viewing audit logs")
    void testRoleBasedAccessControl() throws Exception {
        String vendorToken = loginAndGetToken("portal@apexcloud.io", "Vendora@2026");

        ApprovalDecisionRequest approveReq = new ApprovalDecisionRequest("APPROVED", "Self approve attempt");
        mockMvc.perform(patch("/api/v1/vendors/1/approval")
                        .header("Authorization", "Bearer " + vendorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(approveReq)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/audit-logs")
                        .header("Authorization", "Bearer " + vendorToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(3)
    @Transactional
    @DisplayName("3. Vendor onboarding, unique vendor code validation, and approval workflow")
    void testVendorOnboardingAndApproval() {
        User procAdmin = userRepository.findByEmailIgnoreCase("procurement@vendora.io").orElseThrow();

        VendorRequest req = new VendorRequest(
                "VND-TEST-99",
                "Quantum Silicon Foundry",
                "US-CA-998877",
                "EIN-88-1122334",
                "Dr. Alan Grant",
                "contact@quantumsilicon.io",
                "+1 (408) 555-0199",
                "100 Innovation Way",
                "San Jose",
                "CA",
                "United States",
                1L,
                procAdmin.getUserId(),
                null
        );

        VendorDto created = vendorService.createVendor(req, procAdmin);
        assertThat(created.getVendorId()).isNotNull();
        assertThat(created.getApprovalStatus()).isEqualTo("PENDING");

        // Duplicate vendor code must fail
        assertThatThrownBy(() -> vendorService.createVendor(req, procAdmin))
                .hasMessageContaining("already in use");

        // Approve vendor
        VendorDto approved = vendorService.updateVendorApproval(
                created.getVendorId(),
                new ApprovalDecisionRequest("APPROVED", "Passed full compliance check"),
                procAdmin
        );
        assertThat(approved.getApprovalStatus()).isEqualTo("APPROVED");
    }

    @Test
    @Order(4)
    @Transactional
    @DisplayName("4. Purchase Order calculates line totals and order totals strictly on the backend")
    void testPurchaseOrderCalculationAndLifecycle() {
        User procAdmin = userRepository.findByEmailIgnoreCase("procurement@vendora.io").orElseThrow();
        User procManager = userRepository.findByEmailIgnoreCase("manager@vendora.io").orElseThrow();

        PurchaseOrderRequest poReq = new PurchaseOrderRequest();
        poReq.setVendorId(1L); // Approved vendor
        poReq.setOrderDate(LocalDate.now());
        poReq.setExpectedDeliveryDate(LocalDate.now().plusDays(15));
        poReq.setRemarks("Backend calculation test PO");
        poReq.setItems(List.of(
                new PurchaseOrderItemRequest("Enterprise Node License", "Core subscription", 3, new BigDecimal("1000.00"), new BigDecimal("240.00")),
                new PurchaseOrderItemRequest("Dedicated Support Pack", "24x7 SLA", 2, new BigDecimal("500.00"), new BigDecimal("80.00"))
        ));

        PurchaseOrderDto createdPo = procurementService.createPurchaseOrder(poReq, procAdmin);
        assertThat(createdPo.getSubtotalAmount()).isEqualByComparingTo("4000.00");
        assertThat(createdPo.getTaxAmount()).isEqualByComparingTo("320.00");
        assertThat(createdPo.getTotalAmount()).isEqualByComparingTo("4320.00");
        assertThat(createdPo.getStatus()).isEqualTo("PENDING_APPROVAL");

        // Approve PO
        PurchaseOrderDto approvedPo = procurementService.updatePurchaseOrderStatus(
                createdPo.getPoId(),
                new ApprovalDecisionRequest("APPROVED", "Approved by manager"),
                procManager
        );
        assertThat(approvedPo.getStatus()).isEqualTo("APPROVED");
        assertThat(approvedPo.getApprovedByName()).isEqualTo(procManager.getName());
    }

    @Test
    @Order(5)
    @Transactional
    @DisplayName("5. Invoice validation rejects amounts exceeding PO limit and enforces payment balance & duplicate ref rules")
    void testInvoiceAndPaymentIntegrity() {
        User financeUser = userRepository.findByEmailIgnoreCase("finance@vendora.io").orElseThrow();

        // PO #4 (PO-2026-2004) has total $47,520.00 for vendor #1
        InvoiceRequest excessiveInv = new InvoiceRequest(
                1L, 4L, "INV-EXCESS-001", LocalDate.now(), LocalDate.now().plusDays(30),
                new BigDecimal("50000.00"), new BigDecimal("4000.00"), null
        );

        assertThatThrownBy(() -> procurementService.createInvoice(excessiveInv, financeUser))
                .hasMessageContaining("exceeds remaining Purchase Order limit");

        // Valid invoice within PO limit
        InvoiceRequest validInv = new InvoiceRequest(
                1L, 4L, "INV-VALID-2004", LocalDate.now(), LocalDate.now().plusDays(30),
                new BigDecimal("44000.00"), new BigDecimal("3520.00"), null
        );
        InvoiceDto createdInv = procurementService.createInvoice(validInv, financeUser);
        assertThat(createdInv.getTotalAmount()).isEqualByComparingTo("47520.00");
        assertThat(createdInv.getApprovalStatus()).isEqualTo("PENDING");

        // Cannot pay unapproved invoice
        PaymentRequest earlyPayment = new PaymentRequest(createdInv.getInvoiceId(), new BigDecimal("10000.00"), "WIRE_TRANSFER", "TXN-EARLY-01", "Early");
        assertThatThrownBy(() -> procurementService.recordPayment(earlyPayment, financeUser))
                .hasMessageContaining("only be recorded for APPROVED invoices");

        // Approve invoice
        InvoiceDto approvedInv = procurementService.decideInvoiceApproval(
                createdInv.getInvoiceId(),
                new ApprovalDecisionRequest("APPROVED", "Verified against PO-2026-2004"),
                financeUser
        );
        assertThat(approvedInv.getApprovalStatus()).isEqualTo("APPROVED");

        // Reject overpayment exceeding invoice balance
        PaymentRequest overPay = new PaymentRequest(createdInv.getInvoiceId(), new BigDecimal("60000.00"), "WIRE_TRANSFER", "TXN-OVER-01", "Overpay");
        assertThatThrownBy(() -> procurementService.recordPayment(overPay, financeUser))
                .hasMessageContaining("exceeds outstanding invoice balance");

        // Record valid full payment
        PaymentRequest validPay = new PaymentRequest(createdInv.getInvoiceId(), new BigDecimal("47520.00"), "WIRE_TRANSFER", "TXN-FULL-2004", "Full settlement");
        PaymentDto recordedPay = procurementService.recordPayment(validPay, financeUser);
        assertThat(recordedPay.getStatus()).isEqualTo("COMPLETED");
        assertThat(recordedPay.getRemainingInvoiceBalance()).isEqualByComparingTo("0.00");

        // Duplicate transaction ref rejected
        assertThatThrownBy(() -> procurementService.recordPayment(validPay, financeUser))
                .hasMessageContaining("Duplicate transaction reference");
    }

    @Test
    @Order(6)
    @Transactional
    @DisplayName("6. Performance review calculates overall_score on backend and Notification ownership is strictly enforced")
    void testPerformanceReviewAndNotificationOwnership() {
        User procManager = userRepository.findByEmailIgnoreCase("manager@vendora.io").orElseThrow();
        User employee = userRepository.findByEmailIgnoreCase("employee@vendora.io").orElseThrow();

        PerformanceReviewRequest revReq = new PerformanceReviewRequest(
                1L, 4L,
                new BigDecimal("5.0"),
                new BigDecimal("4.6"),
                new BigDecimal("4.8"),
                new BigDecimal("4.8"),
                "Excellent fulfillment on PO-2026-2004",
                LocalDate.now()
        );
        PerformanceReviewDto review = intelligenceService.createReview(revReq, procManager);
        // (5.0 + 4.6 + 4.8 + 4.8) / 4 = 19.2 / 4 = 4.80
        assertThat(review.getOverallScore()).isEqualByComparingTo("4.80");

        // Notification ownership check: employee cannot mark manager's notification as read
        List<NotificationDto> managerNotifs = notificationService.getUserNotifications(procManager);
        assertThat(managerNotifs).isNotEmpty();
        Long managerNotifId = managerNotifs.get(0).getNotificationId();

        assertThatThrownBy(() -> notificationService.markAsRead(managerNotifId, employee))
                .isInstanceOf(AccessDeniedException.class);
    }
}
