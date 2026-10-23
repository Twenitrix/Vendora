package com.vendora.repository;

import com.vendora.entity.Contract;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContractRepository extends JpaRepository<Contract, Long> {
    List<Contract> findByVendor_VendorIdOrderByCreatedAtDesc(Long vendorId);
    List<Contract> findAllByOrderByCreatedAtDesc();
    long countByStatus(String status);
}
