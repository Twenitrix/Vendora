package com.vendora.repository;

import com.vendora.entity.PerformanceReview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PerformanceReviewRepository extends JpaRepository<PerformanceReview, Long> {
    List<PerformanceReview> findByVendor_VendorIdOrderByReviewDateDesc(Long vendorId);
    List<PerformanceReview> findAllByOrderByReviewDateDesc();
    boolean existsByPurchaseOrder_PoIdAndReviewedBy_UserId(Long poId, Long userId);
}
