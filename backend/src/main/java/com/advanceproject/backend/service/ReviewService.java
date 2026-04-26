package com.advanceproject.backend.service;

import com.advanceproject.backend.entity.Review;
import com.advanceproject.backend.entity.User;
import com.advanceproject.backend.entity.AuditLog;
import com.advanceproject.backend.repository.AuditLogRepository;
import com.advanceproject.backend.repository.ReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final AuditLogRepository auditLogRepository;

    @Autowired
    public ReviewService(ReviewRepository reviewRepository, AuditLogRepository auditLogRepository) {
        this.reviewRepository = reviewRepository;
        this.auditLogRepository = auditLogRepository;
    }

    public Review createReview(Review review) {
        return reviewRepository.save(review);
    }

    public Optional<Review> getReviewById(Integer id) {
        return reviewRepository.findById(id);
    }

    public List<Review> getAllReviews() {
        return reviewRepository.findAll();
    }

    public List<Review> getReviewsByOwnerId(Integer ownerId) {
        return reviewRepository.findByProductStoreOwnerId(ownerId);
    }

    public List<Review> getReviewsByUserId(Integer userId) {
        return reviewRepository.findByUserId(userId);
    }

    public Page<Review> getAllReviews(Pageable pageable) {
        return reviewRepository.findAll(pageable);
    }

    public Page<Review> getReviewsByOwnerId(Integer ownerId, Pageable pageable) {
        return reviewRepository.findByProductStoreOwnerId(ownerId, pageable);
    }

    public Page<Review> getReviewsByUserId(Integer userId, Pageable pageable) {
        return reviewRepository.findByUserId(userId, pageable);
    }

    public Page<Review> getReviewsByProductId(Integer productId, Pageable pageable) {
        return reviewRepository.findByProductId(productId, pageable);
    }

    public Review patchReview(Integer id, Review partialReview) {
        return reviewRepository.findById(id).map(review -> {
            if (partialReview.getStarRating() != null) review.setStarRating(partialReview.getStarRating());
            if (partialReview.getHelpfulnessVotes() != null) review.setHelpfulnessVotes(partialReview.getHelpfulnessVotes());
            if (partialReview.getSentiment() != null) review.setSentiment(partialReview.getSentiment());
            if (partialReview.getProduct() != null) review.setProduct(partialReview.getProduct());
            if (partialReview.getUser() != null) review.setUser(partialReview.getUser());
            return reviewRepository.save(review);
        }).orElseThrow(() -> new RuntimeException("Review not found"));
    }

    public Review updateReview(Integer id, Review updatedReview) {
        return reviewRepository.findById(id).map(review -> {
            review.setStarRating(updatedReview.getStarRating());
            review.setHelpfulnessVotes(updatedReview.getHelpfulnessVotes());
            review.setSentiment(updatedReview.getSentiment());
            review.setProduct(updatedReview.getProduct());
            review.setUser(updatedReview.getUser());
            return reviewRepository.save(review);
        }).orElseThrow(() -> new RuntimeException("Review not found"));
    }

    public Review voteHelpful(Integer id, User voter) {
        String action = "REVIEW_HELPFUL_VOTE";
        String details = "reviewId=" + id;

        boolean alreadyVoted = auditLogRepository.existsByUser_IdAndActionAndDetails(voter.getId(), action, details);
        if (alreadyVoted) {
            throw new IllegalStateException("Bu yorumu daha once faydali buldunuz.");
        }

        return reviewRepository.findById(id).map(review -> {
            review.setHelpfulnessVotes((review.getHelpfulnessVotes() != null ? review.getHelpfulnessVotes() : 0) + 1);

            Review updated = reviewRepository.save(review);

            AuditLog log = new AuditLog();
            log.setUser(voter);
            log.setAction(action);
            log.setDetails(details);
            log.setTimestamp(LocalDateTime.now());
            auditLogRepository.save(log);

            return updated;
        }).orElseThrow(() -> new RuntimeException("Review not found"));
    }

    public void deleteReview(Integer id) {
        reviewRepository.deleteById(id);
    }
}
