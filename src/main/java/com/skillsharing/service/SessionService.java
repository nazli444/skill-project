package com.skillsharing.service;

import com.skillsharing.model.Session;
import com.skillsharing.model.User;
import com.skillsharing.repository.SessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.logging.Logger;
import java.util.stream.Collectors;

@Service
public class SessionService {

    private static final Logger logger = Logger.getLogger(SessionService.class.getName());

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private GoogleMeetService googleMeetService;

    public Session createSession(Session session) {
        logger.info("=== CREATING NEW SESSION ===");
        logger.info("Session type: " + session.getSessionType());
        logger.info("Teacher ID: " + session.getTeacherId());
        logger.info("Learner ID: " + session.getLearnerId());
        logger.info("Scheduled time: " + session.getScheduledTime());
        logger.info("Duration: " + session.getDuration() + " minutes");

        // Set initial status
        session.setStatus("scheduled");

        // Handle virtual sessions with Google Meet
        if ("virtual".equals(session.getSessionType())) {
            logger.info("Virtual session detected - attempting Google Meet integration");

            Optional<User> teacherOpt = userService.findById(session.getTeacherId());
            Optional<User> learnerOpt = userService.findById(session.getLearnerId());

            if (!teacherOpt.isPresent()) {
                logger.severe("❌ Teacher not found with ID: " + session.getTeacherId());
                throw new RuntimeException("Teacher not found with ID: " + session.getTeacherId());
            }

            if (!learnerOpt.isPresent()) {
                logger.severe("❌ Learner not found with ID: " + session.getLearnerId());
                throw new RuntimeException("Learner not found with ID: " + session.getLearnerId());
            }

            User teacher = teacherOpt.get();
            User learner = learnerOpt.get();

            logger.info("Teacher: " + teacher.getEmail() + " (" + teacher.getFullName() + ")");
            logger.info("Learner: " + learner.getEmail() + " (" + learner.getFullName() + ")");

            // Check OAuth status
            boolean teacherHasToken = teacher.getGoogleAccessToken() != null &&
                    !teacher.getGoogleAccessToken().isEmpty();
            boolean learnerHasToken = learner.getGoogleAccessToken() != null &&
                    !learner.getGoogleAccessToken().isEmpty();

            logger.info("Teacher has Google OAuth token: " + teacherHasToken);
            logger.info("Learner has Google OAuth token: " + learnerHasToken);

            // Create Google Meet session - prefer real API if tokens available, otherwise use fallback
            if (teacherHasToken || learnerHasToken) {
                logger.info("✅ At least one user has Google OAuth - attempting real Google Meet creation");
                try {
                    session = googleMeetService.createCalendarEventsForBothUsers(session, teacher, learner);

                    if (session.getMeetingUrl() != null && session.getMeetingUrl().contains("meet.google.com")) {
                        logger.info("🎉 Successfully created real Google Meet session: " + session.getMeetingUrl());
                    } else {
                        logger.warning("⚠️  Calendar API didn't return valid URL, using fallback");
                    }
                } catch (Exception e) {
                    logger.warning("Calendar API failed, using fallback URL generation: " + e.getMessage());
                }
            } else {
                logger.info("ℹ️  No Google OAuth tokens available - creating basic meeting URL");
                session.setMeetingUrl("No Google Calendar Authentication Found. Please make sure to login using google again");
            }

            logger.info("✅ Google Meet session created:");
            logger.info("   Meeting URL: " + session.getMeetingUrl());
            logger.info("   Meeting ID: " + session.getMeetingId());
        } else {
            logger.info("In-person session - no Google Meet integration needed");
        }

        // Save the session to database
        Session savedSession = sessionRepository.save(session);
        logger.info("✅ Session saved successfully with ID: " + savedSession.getId());
        logger.info("=== SESSION CREATION COMPLETE ===");

        return savedSession;
    }


    public Optional<Session> findById(Long id) {
        return sessionRepository.findById(id);
    }

    public List<Session> getAllSessions() {
        return sessionRepository.findAll();
    }

    public List<Session> getSessionsByTeacher(Long teacherId) {
        return sessionRepository.findByTeacherId(teacherId);
    }

    public List<Session> getSessionsByLearner(Long learnerId) {
        return sessionRepository.findByLearnerId(learnerId);
    }

    public Session updateSessionStatus(Long id, String status) {
        logger.info("Updating session " + id + " status to: " + status);

        Optional<Session> sessionOpt = sessionRepository.findById(id);
        if (sessionOpt.isPresent()) {
            Session session = sessionOpt.get();
            session.setStatus(status);
            Session updatedSession = sessionRepository.save(session);

            logger.info("✅ Session status updated successfully");
            return updatedSession;
        }

        logger.warning("⚠️ Session not found with ID: " + id);
        return null;
    }

    /**
     * Updates an existing session
     */
    public Session updateSession(Long id, Session updatedSession) {
        logger.info("Updating session with ID: " + id);

        Optional<Session> existingSessionOpt = sessionRepository.findById(id);
        if (!existingSessionOpt.isPresent()) {
            logger.warning("⚠️ Session not found with ID: " + id);
            throw new RuntimeException("Session not found with ID: " + id);
        }

        Session existingSession = existingSessionOpt.get();

        // Update fields
        if (updatedSession.getScheduledTime() != null) {
            existingSession.setScheduledTime(updatedSession.getScheduledTime());
        }
        if (updatedSession.getDuration() != null) {
            existingSession.setDuration(updatedSession.getDuration());
        }
        if (updatedSession.getStatus() != null) {
            existingSession.setStatus(updatedSession.getStatus());
        }
        if (updatedSession.getLocation() != null) {
            existingSession.setLocation(updatedSession.getLocation());
        }

        // If changing to virtual and no meeting URL exists, create Google Meet
        if ("virtual".equals(updatedSession.getSessionType()) &&
                existingSession.getMeetingUrl() == null) {

            logger.info("Converting to virtual session - creating Google Meet");

            Optional<User> teacherOpt = userService.findById(existingSession.getTeacherId());
            Optional<User> learnerOpt = userService.findById(existingSession.getLearnerId());

            if (teacherOpt.isPresent() && learnerOpt.isPresent()) {
                try {
                    existingSession = googleMeetService.createCalendarEventsForBothUsers(
                            existingSession, teacherOpt.get(), learnerOpt.get()
                    );
                } catch (Exception e) {
                    logger.severe("Failed to create Google Meet for updated session: " + e.getMessage());
                    throw new RuntimeException("Failed to create Google Meet session", e);
                }
            }
        }

        Session savedSession = sessionRepository.save(existingSession);
        logger.info("✅ Session updated successfully");

        return savedSession;
    }

    /**
     * Deletes a session
     */
    public void deleteSession(Long id) {
        logger.info("Deleting session with ID: " + id);

        Optional<Session> sessionOpt = sessionRepository.findById(id);
        if (!sessionOpt.isPresent()) {
            logger.warning("⚠️ Session not found with ID: " + id);
            throw new RuntimeException("Session not found with ID: " + id);
        }

        // TODO: Consider canceling the Google Calendar event here
        // This would require storing the event ID and calling the Calendar API to delete it

        sessionRepository.deleteById(id);
        logger.info("✅ Session deleted successfully");
    }

    /**
     * Test method to verify Google Meet functionality for a user
     */
    public boolean testUserGoogleMeetAccess(Long userId) {
        logger.info("Testing Google Meet access for user ID: " + userId);

        Optional<User> userOpt = userService.findById(userId);
        if (!userOpt.isPresent()) {
            logger.warning("User not found with ID: " + userId);
            return false;
        }

        User user = userOpt.get();

        if (user.getGoogleAccessToken() == null || user.getGoogleAccessToken().isEmpty()) {
            logger.info("User has no Google OAuth token");
            return false;
        }

        return googleMeetService.testUserCalendarAccess(user);
    }

    /**
     * Gets sessions by status
     */
    public List<Session> getSessionsByStatus(String status) {
        return sessionRepository.findByStatus(status);
    }

    /**
     * Gets upcoming sessions for a user (either as teacher or learner)
     */
    public List<Session> getUpcomingSessionsForUser(Long userId) {
        List<Session> teacherSessions = sessionRepository.findByTeacherId(userId);
        List<Session> learnerSessions = sessionRepository.findByLearnerId(userId);

        teacherSessions.addAll(learnerSessions);

        // Filter for upcoming and sort by scheduled time
        return teacherSessions.stream()
                .filter(s -> "scheduled".equals(s.getStatus()) || "confirmed".equals(s.getStatus()))
                .sorted((s1, s2) -> s1.getScheduledTime().compareTo(s2.getScheduledTime()))
                .collect(Collectors.toList());
    }
}