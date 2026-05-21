package com.skillsharing.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SessionRequest {
    private Long id;
    private Long learnerId;      // Student requesting the session
    private Long teacherId;      // Teacher being requested
    private Long skillId;        // Skill being requested
    private OffsetDateTime requestedTime;
    private Integer duration;    // in minutes
    private String sessionType;  // virtual, in_person
    private String location;     // for in_person sessions
    private String notes;        // Additional notes from learner
    private String status;       // pending, approved, rejected, cancelled
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private String responseMessage; // Teacher's response message
}
