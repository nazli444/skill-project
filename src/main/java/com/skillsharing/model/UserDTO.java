package com.skillsharing.model;

import java.util.List;

public class UserDTO {
    private Long id;
    private String username;
    private String fullName;
    private String bio;
    private String location;
    private List<Skill> offeredSkills;
    private List<Skill> wantedSkills;
    private List<String> availability;
    private double rating;
    private int totalReviews;

    public UserDTO() {}

    public UserDTO(User user) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.fullName = user.getFullName();
        this.bio = user.getBio();
        this.location = user.getLocation();
        this.offeredSkills = user.getOfferedSkills();
        this.wantedSkills = user.getWantedSkills();
        this.availability = user.getAvailability();
        this.rating = user.getRating();
        this.totalReviews = user.getTotalReviews();
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public List<Skill> getOfferedSkills() { return offeredSkills; }
    public void setOfferedSkills(List<Skill> offeredSkills) { this.offeredSkills = offeredSkills; }

    public List<Skill> getWantedSkills() { return wantedSkills; }
    public void setWantedSkills(List<Skill> wantedSkills) { this.wantedSkills = wantedSkills; }

    public List<String> getAvailability() { return availability; }
    public void setAvailability(List<String> availability) { this.availability = availability; }

    public double getRating() { return rating; }
    public void setRating(double rating) { this.rating = rating; }

    public int getTotalReviews() { return totalReviews; }
    public void setTotalReviews(int totalReviews) { this.totalReviews = totalReviews; }
}
