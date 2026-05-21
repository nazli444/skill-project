package com.skillsharing.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Review {
    private Long id;
    private Long sessionId;
    private Long reviewerId;
    private Long reviewedUserId;
    private Integer rating; // 1-5
    private String comment;
    private LocalDateTime createdAt;
}
