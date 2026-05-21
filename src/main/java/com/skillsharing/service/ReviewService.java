package com.skillsharing.service;

import com.skillsharing.model.Review;
import com.skillsharing.repository.ReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ReviewService {
    
    @Autowired
    private ReviewRepository reviewRepository;
    
    @Autowired
    private UserService userService;
    
    public Review createReview(Review review) {
        review.setCreatedAt(LocalDateTime.now());
        Review savedReview = reviewRepository.save(review);
        
        // Update user rating
        userService.updateUserRating(review.getReviewedUserId(), review.getRating().doubleValue());
        
        return savedReview;
    }
    
    public List<Review> getReviewsForUser(Long userId) {
        return reviewRepository.findByReviewedUserId(userId);
    }
    
    public List<Review> getAllReviews() {
        return reviewRepository.findAll();
    }
}
