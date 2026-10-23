package com.vendora.repository;

import com.vendora.entity.Vendor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VendorRepository extends JpaRepository<Vendor, Long> {
    Optional<Vendor> findByVendorCodeIgnoreCase(String vendorCode);
    boolean existsByVendorCodeIgnoreCase(String vendorCode);
    Optional<Vendor> findByVendorUser_UserId(Long userId);
    Optional<Vendor> findByEmailIgnoreCase(String email);
    long countByCategory_CategoryId(Long categoryId);
    long countByApprovalStatus(String approvalStatus);
    List<Vendor> findAllByOrderByCreatedAtDesc();
}
