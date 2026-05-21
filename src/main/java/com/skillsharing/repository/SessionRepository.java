package com.skillsharing.repository;

import com.skillsharing.model.Session;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Repository
public class SessionRepository {
    private final Map<Long, Session> sessions = new ConcurrentHashMap<>();
    private final AtomicLong idCounter = new AtomicLong(1);
    
    public Session save(Session session) {
        if (session.getId() == null) {
            session.setId(idCounter.getAndIncrement());
        }
        sessions.put(session.getId(), session);
        return session;
    }
    
    public Optional<Session> findById(Long id) {
        return Optional.ofNullable(sessions.get(id));
    }
    
    public List<Session> findAll() {
        return new ArrayList<>(sessions.values());
    }
    
    public List<Session> findByTeacherId(Long teacherId) {
        return sessions.values().stream()
                .filter(session -> session.getTeacherId().equals(teacherId))
                .collect(Collectors.toList());
    }
    
    public List<Session> findByLearnerId(Long learnerId) {
        return sessions.values().stream()
                .filter(session -> session.getLearnerId().equals(learnerId))
                .collect(Collectors.toList());
    }

    public void deleteById(Long id) {
        sessions.remove(id);
    }

    public List<Session> findByStatus(String status) {
        return sessions.values().stream()
                .filter(session -> status.equals(session.getStatus()))
                .collect(Collectors.toList());
    }
}
