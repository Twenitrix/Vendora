package com.vendora.repository;

import com.vendora.entity.Communication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommunicationRepository extends JpaRepository<Communication, Long> {
    List<Communication> findByVendor_VendorIdOrderBySentAtDesc(Long vendorId);
    List<Communication> findAllByOrderBySentAtDesc();
}
