package com.skillsharing.repository;

import com.skillsharing.model.Skill;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Repository
public class SkillRepository {
    private final Map<Long, Skill> skills = new ConcurrentHashMap<>();
    private final AtomicLong idCounter = new AtomicLong(1);
    
    public Skill save(Skill skill) {
        if (skill.getId() == null) {
            skill.setId(idCounter.getAndIncrement());
        }
        skills.put(skill.getId(), skill);
        return skill;
    }
    
    public Optional<Skill> findById(Long id) {
        return Optional.ofNullable(skills.get(id));
    }
    
    public List<Skill> findAll() {
        return new ArrayList<>(skills.values());
    }
    
    public List<Skill> findByCategory(String category) {
        return skills.values().stream()
                .filter(skill -> skill.getCategory().equalsIgnoreCase(category))
                .collect(Collectors.toList());
    }
    
    public List<Skill> searchByName(String name) {
        return skills.values().stream()
                .filter(skill -> skill.getName().toLowerCase().contains(name.toLowerCase()))
                .collect(Collectors.toList());
    }
}
