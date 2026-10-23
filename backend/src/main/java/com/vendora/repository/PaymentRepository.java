package com.vendora.repository;

import com.vendora.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    boolean existsByTransactionRefIgnoreCase(String transactionRef);
    List<Payment> findByInvoice_InvoiceIdOrderByPaymentDateDesc(Long invoiceId);
    List<Payment> findByInvoice_Vendor_VendorIdOrderByPaymentDateDesc(Long vendorId);
    List<Payment> findAllByOrderByPaymentDateDesc();
}
