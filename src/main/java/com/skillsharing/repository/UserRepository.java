package com.skillsharing.repository;

import com.skillsharing.model.User;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Repository
public class UserRepository {
    private final Map<Long, User> users = new ConcurrentHashMap<>();
    private final AtomicLong idCounter = new AtomicLong(1);
    
    public User save(User user) {
        if (user.getId() == null) {
            user.setId(idCounter.getAndIncrement());
        }
        users.put(user.getId(), user);
        return user;
    }
    
    public Optional<User> findById(Long id) {
        return Optional.ofNullable(users.get(id));
    }
    
    public Optional<User> findByUsername(String username) {
        return users.values().stream()
                .filter(user -> user.getUsername() != null && user.getUsername().equals(username))
                .findFirst();
    }
    
    public Optional<User> findByEmail(String email) {
        return users.values().stream()
                .filter(user -> user.getEmail() != null && user.getEmail().equals(email))
                .findFirst();
    }

    public Optional<User> findByGoogleId(String googleId) {
        return users.values().stream()
                .filter(user -> user.getGoogleId() != null && user.getGoogleId().equals(googleId))
                .findFirst();
    }
    
    public List<User> findAll() {
        return new ArrayList<>(users.values());
    }
    
    public List<User> searchBySkill(String skillName) {
        return users.values().stream()
                .filter(user -> user.getOfferedSkills().stream()
                        .anyMatch(skill -> skill.getName().toLowerCase()
                                .contains(skillName.toLowerCase())))
                .collect(Collectors.toList());
    }
    
    public void deleteById(Long id) {
        users.remove(id);
    }
}
