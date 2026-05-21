package com.skillsharing.repository;

import com.skillsharing.model.Review;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Repository
public class ReviewRepository {
    private final Map<Long, Review> reviews = new ConcurrentHashMap<>();
    private final AtomicLong idCounter = new AtomicLong(1);
    
    public Review save(Review review) {
        if (review.getId() == null) {
            review.setId(idCounter.getAndIncrement());
        }
        reviews.put(review.getId(), review);
        return review;
    }
    
    public Optional<Review> findById(Long id) {
        return Optional.ofNullable(reviews.get(id));
    }
    
    public List<Review> findByReviewedUserId(Long userId) {
        return reviews.values().stream()
                .filter(review -> review.getReviewedUserId().equals(userId))
                .collect(Collectors.toList());
    }
    
    public List<Review> findAll() {
        return new ArrayList<>(reviews.values());
    }
}
