package com.vendora.repository;

import com.vendora.entity.PurchaseRequisition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PurchaseRequisitionRepository extends JpaRepository<PurchaseRequisition, Long> {
    List<PurchaseRequisition> findByRequestedBy_UserIdOrderByCreatedAtDesc(Long userId);
    List<PurchaseRequisition> findAllByOrderByCreatedAtDesc();
}
