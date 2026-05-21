package com.skillsharing.service;

import com.skillsharing.model.Session;
import com.skillsharing.model.SessionRequest;
import com.skillsharing.repository.SessionRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class SessionRequestService {

    @Autowired
    private SessionRequestRepository sessionRequestRepository;

    @Autowired
    private SessionService sessionService;

    public SessionRequest createSessionRequest(SessionRequest sessionRequest) {
        sessionRequest.setStatus("pending");
        return sessionRequestRepository.save(sessionRequest);
    }

    public Optional<SessionRequest> findById(Long id) {
        return sessionRequestRepository.findById(id);
    }

    public List<SessionRequest> getAllSessionRequests() {
        return sessionRequestRepository.findAll();
    }

    public List<SessionRequest> getSessionRequestsByTeacher(Long teacherId) {
        return sessionRequestRepository.findByTeacherId(teacherId);
    }

    public List<SessionRequest> getSessionRequestsByLearner(Long learnerId) {
        return sessionRequestRepository.findByLearnerId(learnerId);
    }

    public List<SessionRequest> getPendingRequestsByTeacher(Long teacherId) {
        return sessionRequestRepository.findByTeacherIdAndStatus(teacherId, "pending");
    }

    public List<SessionRequest> getApprovedRequestsByLearner(Long learnerId) {
        return sessionRequestRepository.findByLearnerIdAndStatus(learnerId, "approved");
    }

    public SessionRequest approveSessionRequest(Long requestId, String responseMessage) {
        System.out.println("Approving session request: " + requestId);

        Optional<SessionRequest> requestOpt = sessionRequestRepository.findById(requestId);
        if (requestOpt.isPresent()) {
            SessionRequest request = requestOpt.get();
            System.out.println("Found request: " + request.getId() + ", type: " + request.getSessionType());

            request.setStatus("approved");
            request.setResponseMessage(responseMessage);

            // Create actual session
            Session session = new Session();
            session.setTeacherId(request.getTeacherId());
            session.setLearnerId(request.getLearnerId());
            session.setSkillId(request.getSkillId());
            session.setScheduledTime(request.getRequestedTime());
            session.setDuration(request.getDuration());
            session.setSessionType(request.getSessionType());
            session.setLocation(request.getLocation());
            session.setNotes(request.getNotes());
            session.setStatus("scheduled");

            System.out.println("Created session object, calling sessionService.createSession");
            // Save the session (this will generate Google Meet URL if virtual)
            Session createdSession = sessionService.createSession(session);
            System.out.println("Session created with ID: " + createdSession.getId());

            SessionRequest savedRequest = sessionRequestRepository.save(request);
            System.out.println("Request approved and saved");
            return savedRequest;
        }
        System.out.println("Request not found: " + requestId);
        return null;
    }

    public SessionRequest rejectSessionRequest(Long requestId, String responseMessage) {
        Optional<SessionRequest> requestOpt = sessionRequestRepository.findById(requestId);
        if (requestOpt.isPresent()) {
            SessionRequest request = requestOpt.get();
            request.setStatus("rejected");
            request.setResponseMessage(responseMessage);
            return sessionRequestRepository.save(request);
        }
        return null;
    }

    public SessionRequest cancelSessionRequest(Long requestId) {
        Optional<SessionRequest> requestOpt = sessionRequestRepository.findById(requestId);
        if (requestOpt.isPresent()) {
            SessionRequest request = requestOpt.get();
            if (!"pending".equalsIgnoreCase(request.getStatus())) {
                return null;
            }
            request.setStatus("cancelled");
            return sessionRequestRepository.save(request);
        }
        return null;
    }

    public SessionRequest updateRequestStatus(Long requestId, String status) {
        Optional<SessionRequest> requestOpt = sessionRequestRepository.findById(requestId);
        if (requestOpt.isPresent()) {
            SessionRequest request = requestOpt.get();
            request.setStatus(status);
            return sessionRequestRepository.save(request);
        }
        return null;
    }
}
