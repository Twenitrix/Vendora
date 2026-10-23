package com.vendora.repository;

import com.vendora.entity.GoodsReceipt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GoodsReceiptRepository extends JpaRepository<GoodsReceipt, Long> {
    List<GoodsReceipt> findByPurchaseOrder_PoIdOrderByCreatedAtDesc(Long poId);
    List<GoodsReceipt> findAllByOrderByCreatedAtDesc();
}
