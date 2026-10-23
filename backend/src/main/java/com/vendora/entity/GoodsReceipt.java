package com.vendora.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "goods_receipts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GoodsReceipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "receipt_id")
    private Long receiptId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "po_id", nullable = false)
    private PurchaseOrder purchaseOrder;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "received_by", nullable = false)
    private User receivedBy;

    @Column(name = "received_date", nullable = false)
    private LocalDate receivedDate;

    @Column(name = "delivery_note_ref", length = 100)
    private String deliveryNoteRef;

    @Column(name = "condition_status", nullable = false, length = 40)
    private String conditionStatus;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (receivedDate == null) receivedDate = LocalDate.now();
        if (conditionStatus == null) conditionStatus = "ACCEPTED";
    }
}
