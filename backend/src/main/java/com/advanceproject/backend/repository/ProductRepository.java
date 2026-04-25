package com.advanceproject.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.advanceproject.backend.entity.Product;

@Repository
public interface ProductRepository extends JpaRepository<Product, Integer> {
    Page<Product> findByStoreOwnerId(Integer ownerId, Pageable pageable);

    Page<Product> findByCategoryNameIgnoreCase(String category, Pageable pageable);

    Page<Product> findByStoreOwnerIdAndCategoryNameIgnoreCase(Integer ownerId, String category, Pageable pageable);

    @Query("""
            select p from Product p
            left join p.store s
            left join s.owner o
            left join p.category c
            where (:ownerId is null or o.id = :ownerId)
              and (:category is null or lower(c.name) = :category)
              and (
                lower(coalesce(p.name, '')) like concat('%', :search, '%')
                or lower(coalesce(p.description, '')) like concat('%', :search, '%')
                or lower(coalesce(p.sku, '')) like concat('%', :search, '%')
              )
            """)
    Page<Product> searchProducts(
            @Param("search") String search,
            @Param("category") String category,
            @Param("ownerId") Integer ownerId,
            Pageable pageable
    );
}
