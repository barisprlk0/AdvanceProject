package com.advanceproject.backend.controller;

import com.advanceproject.backend.entity.Review;
import com.advanceproject.backend.entity.User;
import com.advanceproject.backend.service.ProductService;
import com.advanceproject.backend.service.ReviewService;
import com.advanceproject.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewService reviewService;
    private final UserService userService;
    private final ProductService productService;

    @Autowired
    public ReviewController(ReviewService reviewService, UserService userService, ProductService productService) {
        this.reviewService = reviewService;
        this.userService = userService;
        this.productService = productService;
    }

    @PostMapping
    public ResponseEntity<Review> createReview(@RequestBody Review review, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!"INDIVIDUAL".equalsIgnoreCase(user.getRoleType())) {
            return ResponseEntity.status(403).build();
        }

        if (review.getProduct() == null || review.getProduct().getId() == null) {
            return ResponseEntity.badRequest().build();
        }

        review.setUser(user);
        review.setProduct(productService.getProductById(review.getProduct().getId())
                .orElseThrow(() -> new RuntimeException("Product not found")));
        if (review.getHelpfulnessVotes() == null) {
            review.setHelpfulnessVotes(0);
        }

        return ResponseEntity.ok(reviewService.createReview(review));
    }

    @GetMapping
    public ResponseEntity<Page<Review>> getAllReviews(
            Pageable pageable,
            Authentication authentication,
            @RequestParam(required = false) Integer productId
    ) {
        if (productId != null) {
            return ResponseEntity.ok(reviewService.getReviewsByProductId(productId, pageable));
        }

        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if ("CORPORATE".equalsIgnoreCase(user.getRoleType())) {
            return ResponseEntity.ok(reviewService.getReviewsByOwnerId(user.getId(), pageable));
        } else if ("INDIVIDUAL".equalsIgnoreCase(user.getRoleType())) {
            return ResponseEntity.ok(reviewService.getReviewsByUserId(user.getId(), pageable));
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

    @PatchMapping("/{id}")
    public ResponseEntity<Review> patchReview(@PathVariable Integer id, @RequestBody Review review, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Review existingReview = reviewService.getReviewById(id)
                .orElseThrow(() -> new RuntimeException("Review not found"));

        if (!"ADMIN".equalsIgnoreCase(user.getRoleType()) &&
            !"CORPORATE".equalsIgnoreCase(user.getRoleType()) &&
            !existingReview.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        if ("CORPORATE".equalsIgnoreCase(user.getRoleType()) &&
            !existingReview.getProduct().getStore().getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(reviewService.patchReview(id, review));
    }

    @PostMapping("/{id}/vote")
    public ResponseEntity<?> voteHelpful(@PathVariable Integer id, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).build();
        }

        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        try {
            return ResponseEntity.ok(reviewService.voteHelpful(id, user));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        }
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
