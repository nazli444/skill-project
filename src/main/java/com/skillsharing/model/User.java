package com.skillsharing.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    private Long id;
    private String username;
    private String email;
    private String password;
    private String fullName;
    private String bio;
    private String location;
    private List<Skill> offeredSkills = new ArrayList<>();
    private List<Skill> wantedSkills = new ArrayList<>();
    private List<String> availability = new ArrayList<>();
    private Double rating = 0.0;
    private Integer totalReviews = 0;

    // Google OAuth fields
    private String googleId;
    private String googleEmail;
    private String googleAccessToken;
    private String googleRefreshToken;
    private Long googleTokenExpiry;

    // Google Calendar specific tokens
    private String googleCalendarToken;
    private Long googleCalendarTokenExpiry;
}
