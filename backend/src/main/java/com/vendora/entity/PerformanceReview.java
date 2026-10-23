package com.vendora.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "performance_reviews")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PerformanceReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "review_id")
    private Long reviewId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "vendor_id", nullable = false)
    private Vendor vendor;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "reviewed_by", nullable = false)
    private User reviewedBy;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "po_id", nullable = false)
    private PurchaseOrder purchaseOrder;

    @Column(name = "quality_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal qualityScore;

    @Column(name = "delivery_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal deliveryScore;

    @Column(name = "communication_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal communicationScore;

    @Column(name = "compliance_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal complianceScore;

    @Column(name = "overall_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal overallScore;

    @Column(name = "comments", columnDefinition = "TEXT")
    private String comments;

    @Column(name = "review_date", nullable = false)
    private LocalDate reviewDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (reviewDate == null) reviewDate = LocalDate.now();
    }
}
