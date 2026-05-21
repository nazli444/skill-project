package com.skillsharing.controller;

import com.skillsharing.model.SessionRequest;
import com.skillsharing.model.User;
import com.skillsharing.service.SessionRequestService;
import com.skillsharing.service.GoogleMeetService;
import com.skillsharing.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/session-requests")
@CrossOrigin(origins = "*")
public class SessionRequestController {

    @Autowired
    private SessionRequestService sessionRequestService;

    @Autowired
    private GoogleMeetService googleMeetService;

    @Autowired
    private UserService userService;

    @PostMapping
    public ResponseEntity<SessionRequest> createSessionRequest(@RequestBody SessionRequest sessionRequest) {
        SessionRequest createdRequest = sessionRequestService.createSessionRequest(sessionRequest);
        return ResponseEntity.ok(createdRequest);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getSessionRequest(@PathVariable Long id) {
        return sessionRequestService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public ResponseEntity<List<SessionRequest>> getAllSessionRequests() {
        return ResponseEntity.ok(sessionRequestService.getAllSessionRequests());
    }

    @GetMapping("/teacher/{teacherId}")
    public ResponseEntity<List<SessionRequest>> getRequestsByTeacher(@PathVariable Long teacherId) {
        return ResponseEntity.ok(sessionRequestService.getSessionRequestsByTeacher(teacherId));
    }

    @GetMapping("/learner/{learnerId}")
    public ResponseEntity<List<SessionRequest>> getRequestsByLearner(@PathVariable Long learnerId) {
        return ResponseEntity.ok(sessionRequestService.getSessionRequestsByLearner(learnerId));
    }

    @GetMapping("/teacher/{teacherId}/pending")
    public ResponseEntity<List<SessionRequest>> getPendingRequestsByTeacher(@PathVariable Long teacherId) {
        return ResponseEntity.ok(sessionRequestService.getPendingRequestsByTeacher(teacherId));
    }

    @PostMapping("/{requestId}/approve")
    public ResponseEntity<?> approveRequest(@PathVariable Long requestId, @RequestParam(required = false) String message) {
        System.out.println("Received approve request for ID: " + requestId + ", message: " + message);

        SessionRequest updated = sessionRequestService.approveSessionRequest(requestId, message);
        if (updated != null) {
            System.out.println("Request approved successfully");
            return ResponseEntity.ok(updated);
        }
        System.out.println("Request approval failed - request not found");
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/{requestId}/reject")
    public ResponseEntity<?> rejectRequest(@PathVariable Long requestId, @RequestParam(required = false) String message) {
        SessionRequest updated = sessionRequestService.rejectSessionRequest(requestId, message);
        if (updated != null) {
            return ResponseEntity.ok(updated);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/{requestId}/cancel")
    public ResponseEntity<?> cancelRequest(@PathVariable Long requestId) {
        SessionRequest updated = sessionRequestService.cancelSessionRequest(requestId);
        if (updated != null) {
            return ResponseEntity.ok(updated);
        }
        return ResponseEntity.badRequest().body("Only pending requests can be cancelled");
    }

    @GetMapping("/test-google-api")
    public ResponseEntity<?> testGoogleApi() {
        boolean success = googleMeetService.testGoogleApiConnection();
        if (success) {
            return ResponseEntity.ok("Google API connection successful");
        } else {
            return ResponseEntity.status(500).body("Google API connection failed - check logs for details");
        }
    }

    @GetMapping("/test-calendar-access/{userId}")
    public ResponseEntity<?> testCalendarAccess(@PathVariable Long userId) {
        try {
            // Get user from session service or user service
            Optional<User> userOpt = userService.findById(userId);
            if (!userOpt.isPresent()) {
                return ResponseEntity.badRequest().body("User not found");
            }

            User user = userOpt.get();
            boolean success = googleMeetService.testUserCalendarAccess(user);

            if (success) {
                return ResponseEntity.ok("Calendar access successful for user: " + user.getEmail());
            } else {
                return ResponseEntity.status(500).body("Calendar access failed for user: " + user.getEmail() + " - check logs for details");
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error testing calendar access: " + e.getMessage());
        }
    }
}
