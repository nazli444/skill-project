package com.skillsharing.repository;

import com.skillsharing.model.SessionRequest;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Repository
public class SessionRequestRepository {
    private final Map<Long, SessionRequest> sessionRequests = new ConcurrentHashMap<>();
    private final AtomicLong idCounter = new AtomicLong(1);

    public SessionRequest save(SessionRequest sessionRequest) {
        if (sessionRequest.getId() == null) {
            sessionRequest.setId(idCounter.getAndIncrement());
        }
        if (sessionRequest.getCreatedAt() == null) {
            sessionRequest.setCreatedAt(java.time.OffsetDateTime.now());
        }
        sessionRequest.setUpdatedAt(java.time.OffsetDateTime.now());
        sessionRequests.put(sessionRequest.getId(), sessionRequest);
        return sessionRequest;
    }

    public Optional<SessionRequest> findById(Long id) {
        return Optional.ofNullable(sessionRequests.get(id));
    }

    public List<SessionRequest> findAll() {
        return new ArrayList<>(sessionRequests.values());
    }

    public List<SessionRequest> findByTeacherId(Long teacherId) {
        return sessionRequests.values().stream()
                .filter(request -> request.getTeacherId().equals(teacherId))
                .collect(Collectors.toList());
    }

    public List<SessionRequest> findByLearnerId(Long learnerId) {
        return sessionRequests.values().stream()
                .filter(request -> request.getLearnerId().equals(learnerId))
                .collect(Collectors.toList());
    }

    public List<SessionRequest> findByTeacherIdAndStatus(Long teacherId, String status) {
        return sessionRequests.values().stream()
                .filter(request -> request.getTeacherId().equals(teacherId) && request.getStatus().equals(status))
                .collect(Collectors.toList());
    }

    public List<SessionRequest> findByLearnerIdAndStatus(Long learnerId, String status) {
        return sessionRequests.values().stream()
                .filter(request -> request.getLearnerId().equals(learnerId) && request.getStatus().equals(status))
                .collect(Collectors.toList());
    }
}
