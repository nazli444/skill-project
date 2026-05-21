package com.skillsharing.service;

import com.skillsharing.model.Skill;
import com.skillsharing.model.User;
import com.skillsharing.repository.SkillRepository;
import com.skillsharing.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {
    
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SkillRepository skillRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;
    
    public User registerUser(User user) {
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }
    
    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }
    
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public Optional<User> findByGoogleId(String googleId) {
        return userRepository.findByGoogleId(googleId);
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }
    
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }
    
    public List<User> searchBySkill(String skillName) {
        return userRepository.searchBySkill(skillName);
    }
    
    public User updateUser(Long id, User updatedUser) {
        Optional<User> existingUser = userRepository.findById(id);
        if (existingUser.isPresent()) {
            User user = existingUser.get();

            // Update only non-null fields (partial update)
            if (updatedUser.getUsername() != null && !updatedUser.getUsername().trim().isEmpty()) {
                // Check if username is already taken by another user
                Optional<User> existingWithUsername = findByUsername(updatedUser.getUsername());
                if (existingWithUsername.isPresent() && !existingWithUsername.get().getId().equals(id)) {
                    throw new RuntimeException("Username already exists");
                }
                user.setUsername(updatedUser.getUsername());
            }
            if (updatedUser.getFullName() != null && !updatedUser.getFullName().trim().isEmpty()) {
                user.setFullName(updatedUser.getFullName());
            }
            if (updatedUser.getBio() != null) {
                user.setBio(updatedUser.getBio());
            }
            if (updatedUser.getLocation() != null) {
                user.setLocation(updatedUser.getLocation());
            }
            if (updatedUser.getAvailability() != null) {
                user.setAvailability(updatedUser.getAvailability());
            }
            if (updatedUser.getPassword() != null && !updatedUser.getPassword().trim().isEmpty()) {
                user.setPassword(passwordEncoder.encode(updatedUser.getPassword()));
            }

            return userRepository.save(user);
        }
        return null;
    }

    public User updateUser(User user) {
        return userRepository.save(user);
    }
    
    public User addOfferedSkill(Long userId, Skill skill) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            // Ensure skill has an ID by saving it through the repository
            Skill savedSkill = skillRepository.save(skill);
            user.getOfferedSkills().add(savedSkill);
            return userRepository.save(user);
        }
        return null;
    }

    public User addWantedSkill(Long userId, Skill skill) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            // Ensure skill has an ID by saving it through the repository
            Skill savedSkill = skillRepository.save(skill);
            user.getWantedSkills().add(savedSkill);
            return userRepository.save(user);
        }
        return null;
    }

    public User removeWantedSkill(Long userId, Long skillId) {
        System.out.println("Removing wanted skill - User ID: " + userId + ", Skill ID: " + skillId);
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            System.out.println("Found user with " + user.getWantedSkills().size() + " wanted skills");
            System.out.println("Skill IDs in wantedSkills:");
            for (Skill s : user.getWantedSkills()) {
                System.out.println("  Skill ID: " + s.getId() + ", Name: " + s.getName());
            }
            boolean removed = user.getWantedSkills().removeIf(skill -> skill.getId().equals(skillId));
            System.out.println("Skill removal result: " + removed + ", remaining skills: " + user.getWantedSkills().size());
            return userRepository.save(user);
        }
        System.out.println("User not found with ID: " + userId);
        return null;
    }

    public User removeOfferedSkill(Long userId, Long skillId) {
        System.out.println("Removing offered skill - User ID: " + userId + ", Skill ID: " + skillId);
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            System.out.println("Found user with " + user.getOfferedSkills().size() + " offered skills");
            System.out.println("Skill IDs in offeredSkills:");
            for (Skill s : user.getOfferedSkills()) {
                System.out.println("  Skill ID: " + s.getId() + ", Name: " + s.getName());
            }
            boolean removed = user.getOfferedSkills().removeIf(skill -> skill.getId().equals(skillId));
            System.out.println("Skill removal result: " + removed + ", remaining skills: " + user.getOfferedSkills().size());
            return userRepository.save(user);
        }
        System.out.println("User not found with ID: " + userId);
        return null;
    }
    
    public void updateUserRating(Long userId, Double newRating) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            int totalReviews = user.getTotalReviews();
            double currentRating = user.getRating();
            double updatedRating = ((currentRating * totalReviews) + newRating) / (totalReviews + 1);
            user.setRating(updatedRating);
            user.setTotalReviews(totalReviews + 1);
            userRepository.save(user);
        }
    }
}
