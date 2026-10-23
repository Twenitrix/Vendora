package com.vendora.repository;

import com.vendora.entity.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {
    Optional<PurchaseOrder> findByPoNumber(String poNumber);
    List<PurchaseOrder> findByVendor_VendorIdOrderByCreatedAtDesc(Long vendorId);
    List<PurchaseOrder> findByCreatedBy_UserIdOrderByCreatedAtDesc(Long userId);
    List<PurchaseOrder> findAllByOrderByCreatedAtDesc();
}
