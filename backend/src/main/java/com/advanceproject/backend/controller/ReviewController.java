package com.advanceproject.backend.controller;

import com.advanceproject.backend.entity.Review;
import com.advanceproject.backend.entity.User;
import com.advanceproject.backend.service.ReviewService;
import com.advanceproject.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewService reviewService;
    private final UserService userService;

    @Autowired
    public ReviewController(ReviewService reviewService, UserService userService) {
        this.reviewService = reviewService;
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<Review> createReview(@RequestBody Review review) {
        return ResponseEntity.ok(reviewService.createReview(review));
    }

    @GetMapping
    public ResponseEntity<Page<Review>> getAllReviews(Pageable pageable, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if ("CORPORATE".equalsIgnoreCase(user.getRoleType())) {
            return ResponseEntity.ok(reviewService.getReviewsByOwnerId(user.getId(), pageable));
        }

        return ResponseEntity.ok(reviewService.getAllReviews(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Review> getReviewById(@PathVariable Integer id) {
        return reviewService.getReviewById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Review> updateReview(@PathVariable Integer id, @RequestBody Review review, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Review existingReview = reviewService.getReviewById(id)
                .orElseThrow(() -> new RuntimeException("Review not found"));

        if (!"ADMIN".equalsIgnoreCase(user.getRoleType()) && 
            !existingReview.getProduct().getStore().getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(reviewService.updateReview(id, review));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReview(@PathVariable Integer id, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Review existingReview = reviewService.getReviewById(id)
                .orElseThrow(() -> new RuntimeException("Review not found"));

        if (!"ADMIN".equalsIgnoreCase(user.getRoleType()) && 
            !existingReview.getProduct().getStore().getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        reviewService.deleteReview(id);
        return ResponseEntity.noContent().build();
    }
}
