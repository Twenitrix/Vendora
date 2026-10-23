package com.vendora.repository;

import com.vendora.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    Optional<Invoice> findByInvoiceNumberIgnoreCase(String invoiceNumber);
    boolean existsByInvoiceNumberIgnoreCase(String invoiceNumber);
    List<Invoice> findByVendor_VendorIdOrderByCreatedAtDesc(Long vendorId);
    List<Invoice> findByPurchaseOrder_PoIdOrderByCreatedAtDesc(Long poId);
    List<Invoice> findAllByOrderByCreatedAtDesc();
}
