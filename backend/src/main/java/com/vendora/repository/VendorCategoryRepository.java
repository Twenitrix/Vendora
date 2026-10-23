package com.vendora.repository;

import com.vendora.entity.VendorCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VendorCategoryRepository extends JpaRepository<VendorCategory, Long> {
    Optional<VendorCategory> findByCategoryNameIgnoreCase(String categoryName);
    boolean existsByCategoryNameIgnoreCase(String categoryName);
}
