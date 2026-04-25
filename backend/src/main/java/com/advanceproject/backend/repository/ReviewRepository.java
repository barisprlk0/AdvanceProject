package com.advanceproject.backend.repository;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.advanceproject.backend.entity.Review;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Integer> {
    List<Review> findByProductStoreOwnerId(Integer ownerId);
    Page<Review> findByUserId(Integer userId, Pageable pageable);
    List<Review> findByUserId(Integer userId);
    Page<Review> findByProductStoreOwnerId(Integer ownerId, Pageable pageable);
    Page<Review> findByProductId(Integer productId, Pageable pageable);
}
