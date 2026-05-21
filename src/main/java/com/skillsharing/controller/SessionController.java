package com.skillsharing.controller;

import com.skillsharing.model.Session;
import com.skillsharing.model.SessionRequest;
import com.skillsharing.service.SessionRequestService;
import com.skillsharing.service.SessionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sessions")
@CrossOrigin(origins = "*")
public class SessionController {

    @Autowired
    private SessionService sessionService;

    @Autowired
    private SessionRequestService sessionRequestService;

    // Keep this for backward compatibility, but it should create a session request instead
    @PostMapping
    public ResponseEntity<SessionRequest> createSessionRequest(@RequestBody Session session) {
        // Convert session data to session request
        SessionRequest request = new SessionRequest();
        request.setLearnerId(session.getLearnerId());
        request.setTeacherId(session.getTeacherId());
        request.setSkillId(session.getSkillId());
        request.setRequestedTime(session.getScheduledTime());
        request.setDuration(session.getDuration());
        request.setSessionType(session.getSessionType());
        request.setLocation(session.getLocation());
        request.setNotes(session.getNotes());

        SessionRequest createdRequest = sessionRequestService.createSessionRequest(request);
        return ResponseEntity.ok(createdRequest);
    }
    
    @GetMapping
    public ResponseEntity<List<Session>> getAllSessions() {
        return ResponseEntity.ok(sessionService.getAllSessions());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<?> getSessionById(@PathVariable Long id) {
        return sessionService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/teacher/{teacherId}")
    public ResponseEntity<List<Session>> getSessionsByTeacher(@PathVariable Long teacherId) {
        return ResponseEntity.ok(sessionService.getSessionsByTeacher(teacherId));
    }
    
    @GetMapping("/learner/{learnerId}")
    public ResponseEntity<List<Session>> getSessionsByLearner(@PathVariable Long learnerId) {
        return ResponseEntity.ok(sessionService.getSessionsByLearner(learnerId));
    }
    
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateSessionStatus(@PathVariable Long id, @RequestParam String status) {
        Session updated = sessionService.updateSessionStatus(id, status);
        if (updated != null) {
            return ResponseEntity.ok(updated);
        }
        return ResponseEntity.notFound().build();
    }
}
