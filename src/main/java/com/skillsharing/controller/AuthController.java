package com.skillsharing.controller;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.skillsharing.dto.AuthResponse;
import com.skillsharing.dto.LoginRequest;
import com.skillsharing.dto.RegisterRequest;
import com.skillsharing.model.User;
import com.skillsharing.security.JwtUtil;
import com.skillsharing.service.UserService;
import javax.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        // Check if username exists
        if (userService.findByUsername(request.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body("Username already exists");
        }
        
        // Check if email exists
        if (userService.findByEmail(request.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("Email already exists");
        }
        
        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(request.getPassword());
        user.setFullName(request.getFullName());
        user.setBio(request.getBio());
        user.setLocation(request.getLocation());
        
        User savedUser = userService.registerUser(user);
        String token = jwtUtil.generateToken(savedUser.getUsername(), savedUser.getId());
        
        return ResponseEntity.ok(new AuthResponse(token, savedUser.getUsername(), 
                                                  savedUser.getEmail(), savedUser.getId()));
    }
    
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        Optional<User> userOpt = userService.findByUsername(request.getUsername());

        if (!userOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
        }

        String token = jwtUtil.generateToken(user.getUsername(), user.getId());
        return ResponseEntity.ok(new AuthResponse(token, user.getUsername(),
                                                  user.getEmail(), user.getId()));
    }

    @PostMapping("/google-login")
    public ResponseEntity<?> googleLogin(@RequestBody GoogleLoginRequest request) {
        try {
            // Verify the Google ID token and extract user information
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(), JSON_FACTORY)
                    .setAudience(Collections.singletonList("1001273272414-r8edq47mlv5j2b0b75v1db1dkt47rjlj.apps.googleusercontent.com"))
                    .build();

            GoogleIdToken idToken = verifier.verify(request.getIdToken());
            if (idToken == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid Google ID token");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();

            // Extract real user information from Google
            String googleId = payload.getSubject();
            String email = payload.getEmail();
            String name = (String) payload.get("name");
            String givenName = (String) payload.get("given_name");
            String familyName = (String) payload.get("family_name");
            String picture = (String) payload.get("picture");

            // Use given name and family name if available, otherwise use full name
            String fullName = name;
            if (givenName != null && familyName != null) {
                fullName = givenName + " " + familyName;
            }

            System.out.println("Google OAuth successful for: " + email + " (" + fullName + ") with Google ID: " + googleId);

            // Check if user exists with this Google ID
            Optional<User> existingUserOpt = userService.findByGoogleId(googleId);
            User user;

            if (existingUserOpt.isPresent()) {
                // User exists, update their Google tokens and info
                user = existingUserOpt.get();
                System.out.println("Found existing Google user: " + user.getUsername() + " (ID: " + user.getId() + ", has username: " + (user.getUsername() != null && !user.getUsername().trim().isEmpty()) + ")");

                // Update basic Google OAuth info
                user.setGoogleEmail(email);
                user.setGoogleAccessToken(request.getAccessToken());
                user.setGoogleRefreshToken(request.getRefreshToken());
                user.setGoogleTokenExpiry(request.getTokenExpiry());

                // Check if this is a calendar token (has calendar scopes)
                // For now, store the same token - we can differentiate later if needed
                user.setGoogleCalendarToken(request.getAccessToken());
                user.setGoogleCalendarTokenExpiry(request.getTokenExpiry());

                // Update name if it's different (user might have changed their Google profile)
                if (!fullName.equals(user.getFullName())) {
                    user.setFullName(fullName);
                }
                user = userService.updateUser(user);
                System.out.println("Updated existing user: " + user.getUsername());
            } else {
                // Check if user exists with this email
                Optional<User> emailUserOpt = userService.findByEmail(email);
                if (emailUserOpt.isPresent()) {
                    // Link Google account to existing user
                    user = emailUserOpt.get();
                    user.setGoogleId(googleId);
                    user.setGoogleEmail(email);
                    user.setGoogleAccessToken(request.getAccessToken());
                    user.setGoogleRefreshToken(request.getRefreshToken());
                    user.setGoogleTokenExpiry(request.getTokenExpiry());

                    // Set calendar tokens
                    user.setGoogleCalendarToken(request.getAccessToken());
                    user.setGoogleCalendarTokenExpiry(request.getTokenExpiry());

                    // Update name if it's different
                    if (!fullName.equals(user.getFullName())) {
                        user.setFullName(fullName);
                    }
                    user = userService.updateUser(user);
                    System.out.println("Linked Google account to existing user: " + user.getUsername());
                } else {
                    // Create new user with Google information (no username initially)
                    user = new User();
                    // Don't set username initially - user must complete profile
                    user.setUsername(null); // Explicitly set to null for Google users
                    user.setEmail(email);
                    user.setFullName(fullName);
                    user.setGoogleId(googleId);
                    user.setGoogleEmail(email);
                    user.setGoogleAccessToken(request.getAccessToken());
                    user.setGoogleRefreshToken(request.getRefreshToken());
                    user.setGoogleTokenExpiry(request.getTokenExpiry());

                    // Set calendar tokens same as auth tokens for now
                    user.setGoogleCalendarToken(request.getAccessToken());
                    user.setGoogleCalendarTokenExpiry(request.getTokenExpiry());

                    // Generate a random password for the user (they'll use Google login)
                    user.setPassword(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));

                    user = userService.registerUser(user);
                    System.out.println("Created new Google user (no username yet): " + user.getId());
                }
            }

            // For Google OAuth users without username, use a temporary identifier for JWT
            String jwtUsername = user.getUsername();
            if (jwtUsername == null || jwtUsername.trim().isEmpty()) {
                jwtUsername = "google-user-" + user.getId();
            }
            String token = jwtUtil.generateToken(jwtUsername, user.getId());
            return ResponseEntity.ok(new AuthResponse(token, user.getUsername(),
                                                      user.getEmail(), user.getId()));

        } catch (Exception e) {
            System.err.println("Google authentication failed: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Google authentication failed: " + e.getMessage());
        }
    }

    @GetMapping("/check-username")
    public ResponseEntity<?> checkUsernameAvailability(@RequestParam String username) {
        boolean exists = userService.findByUsername(username).isPresent();
        System.out.println("Username availability check for '" + username + "': " + (exists ? "TAKEN" : "AVAILABLE"));
        if (exists) {
            return ResponseEntity.status(409).body("Username already exists");
        }
        return ResponseEntity.ok("Username available");
    }

    public static class GoogleLoginRequest {
        private String idToken;
        private String accessToken;
        private String refreshToken;
        private Long tokenExpiry;

        // Getters and setters
        public String getIdToken() { return idToken; }
        public void setIdToken(String idToken) { this.idToken = idToken; }

        public String getAccessToken() { return accessToken; }
        public void setAccessToken(String accessToken) { this.accessToken = accessToken; }

        public String getRefreshToken() { return refreshToken; }
        public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }

        public Long getTokenExpiry() { return tokenExpiry; }
        public void setTokenExpiry(Long tokenExpiry) { this.tokenExpiry = tokenExpiry; }
    }
}
