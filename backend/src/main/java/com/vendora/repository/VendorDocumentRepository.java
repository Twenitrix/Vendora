package com.vendora.repository;

import com.vendora.entity.VendorDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VendorDocumentRepository extends JpaRepository<VendorDocument, Long> {
    List<VendorDocument> findByVendor_VendorIdOrderByUploadedAtDesc(Long vendorId);
    List<VendorDocument> findAllByOrderByUploadedAtDesc();
}
