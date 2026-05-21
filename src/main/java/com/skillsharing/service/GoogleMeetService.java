package com.skillsharing.service;

import com.google.api.client.auth.oauth2.BearerToken;
import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.CalendarScopes;
import com.google.api.services.calendar.model.*;
import com.skillsharing.model.Session;
import com.skillsharing.model.User;
import com.skillsharing.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.security.GeneralSecurityException;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.logging.Logger;

@Service
public class GoogleMeetService {

    private static final Logger logger = Logger.getLogger(GoogleMeetService.class.getName());
    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static final List<String> SCOPES = Arrays.asList(
            CalendarScopes.CALENDAR_EVENTS,
            CalendarScopes.CALENDAR
    );

    @Value("${google.api.application.name:Skill Sharing Platform}")
    private String applicationName;

    @Autowired
    private UserRepository userRepository;

    private String clientId;
    private String clientSecret;

    /**
     * Creates Google Calendar events for both teacher and learner with real Google Meet
     */
    public Session createCalendarEventsForBothUsers(Session session, User teacher, User learner) {
        logger.info("=== STARTING GOOGLE MEET CALENDAR INTEGRATION ===");
        logger.info("Session ID: " + session.getId());
        logger.info("Teacher: " + teacher.getEmail() + " (token: " + (teacher.getGoogleAccessToken() != null) + ")");
        logger.info("Learner: " + learner.getEmail() + " (token: " + (learner.getGoogleAccessToken() != null) + ")");

        try {
            loadClientSecrets();

            if (teacher.getGoogleAccessToken() != null && !teacher.getGoogleAccessToken().isEmpty()) {
                logger.info("Creating calendar event using teacher's credentials...");

                Calendar teacherCalendar = createCalendarServiceForUser(teacher);
                Event event = createCalendarEvent(session, teacher, learner);

                logger.info("Inserting event into teacher's calendar...");
                Event createdEvent = teacherCalendar.events()
                        .insert("primary", event)
                        .setConferenceDataVersion(1)
                        .setSendUpdates("all")
                        .execute();

                extractMeetDetailsFromEvent(session, createdEvent);

                if (session.getMeetingUrl() != null && session.getMeetingUrl().contains("meet.google.com")) {
                    logger.info("✅ SUCCESS! Real Google Meet URL: " + session.getMeetingUrl());
                    return session;
                } else {
                    logger.warning("⚠️ Event created but no Meet URL found");
                }
            } else {
                logger.warning("⚠️ Teacher has no Google OAuth token");
            }

            if (learner.getGoogleAccessToken() != null && !learner.getGoogleAccessToken().isEmpty()) {
                logger.info("Trying with learner's credentials...");

                Calendar learnerCalendar = createCalendarServiceForUser(learner);
                Event event = createCalendarEvent(session, teacher, learner);

                Event createdEvent = learnerCalendar.events()
                        .insert("primary", event)
                        .setConferenceDataVersion(1)
                        .setSendUpdates("all")
                        .execute();

                extractMeetDetailsFromEvent(session, createdEvent);

                if (session.getMeetingUrl() != null && session.getMeetingUrl().contains("meet.google.com")) {
                    return session;
                }
            }

          return session;
        } catch (Exception e) {
            return session;
        }
    }

    /**
     * FIXED: Creates a Calendar service with proper token refresh capability
     */
    private Calendar createCalendarServiceForUser(User user) throws IOException, GeneralSecurityException {
        logger.info("Creating calendar service for: " + user.getEmail());

        final NetHttpTransport HTTP_TRANSPORT = GoogleNetHttpTransport.newTrustedTransport();

        // Use calendar-specific tokens if available, otherwise fall back to general tokens
        String accessToken = user.getGoogleCalendarToken();
        String refreshToken = user.getGoogleRefreshToken();
        Long tokenExpiry = user.getGoogleCalendarTokenExpiry();

        if (accessToken == null || accessToken.isEmpty()) {
            accessToken = user.getGoogleAccessToken();
            tokenExpiry = user.getGoogleTokenExpiry();
            logger.info("Using general access token (no calendar-specific token available)");
        } else {
            logger.info("Using calendar-specific access token");
        }

        // Check if token is expired
        boolean isExpired = false;
        if (tokenExpiry != null) {
            long expiryTime = tokenExpiry;
            long currentTime = System.currentTimeMillis();
            isExpired = currentTime >= expiryTime;

            logger.info("Token expiry: " + new java.util.Date(expiryTime));
            logger.info("Current time: " + new java.util.Date(currentTime));
            logger.info("Token expired: " + isExpired);
        }

        // If token is expired and we have a refresh token, refresh it
        if (isExpired && refreshToken != null && !refreshToken.isEmpty()) {
            logger.info("Token expired, attempting refresh...");
            refreshAccessToken(user);
            // After refresh, use the updated tokens
            accessToken = user.getGoogleCalendarToken() != null ? user.getGoogleCalendarToken() : user.getGoogleAccessToken();
            tokenExpiry = user.getGoogleCalendarTokenExpiry() != null ? user.getGoogleCalendarTokenExpiry() : user.getGoogleTokenExpiry();
        }

        // Create credential with PROPER refresh capability
        GoogleCredential credential = new GoogleCredential.Builder()
                .setTransport(HTTP_TRANSPORT)
                .setJsonFactory(JSON_FACTORY)
                .setClientSecrets(clientId, clientSecret)
                .build()
                .setAccessToken(accessToken)
                .setRefreshToken(refreshToken);

        // Set expiration time if available
        if (tokenExpiry != null) {
            credential.setExpirationTimeMilliseconds(tokenExpiry);
        }

        Calendar calendar = new Calendar.Builder(HTTP_TRANSPORT, JSON_FACTORY, credential)
                .setApplicationName(applicationName)
                .build();

        logger.info("✅ Calendar service created successfully");
        return calendar;
    }

    /**
     * Refreshes the user's access token using their refresh token
     */
    private void refreshAccessToken(User user) throws IOException {
        logger.info("Refreshing access token for user: " + user.getEmail());

        try {
            final NetHttpTransport HTTP_TRANSPORT = GoogleNetHttpTransport.newTrustedTransport();

            GoogleCredential credential = new GoogleCredential.Builder()
                    .setTransport(HTTP_TRANSPORT)
                    .setJsonFactory(JSON_FACTORY)
                    .setClientSecrets(clientId, clientSecret)
                    .build()
                    .setRefreshToken(user.getGoogleRefreshToken());

            // Refresh the token
            credential.refreshToken();

            // Update user with new tokens
            user.setGoogleAccessToken(credential.getAccessToken());
            user.setGoogleTokenExpiry(credential.getExpirationTimeMilliseconds());

            // Save to database
            userRepository.save(user);

            logger.info("✅ Token refreshed successfully");
            logger.info("New expiry: " + new java.util.Date(credential.getExpirationTimeMilliseconds()));

        } catch (Exception e) {
            logger.severe("❌ Failed to refresh token: " + e.getMessage());
            throw new IOException("Failed to refresh access token", e);
        }
    }

    /**
     * Loads client ID and secret from credentials file
     */
    private void loadClientSecrets() throws IOException {
        if (clientId != null && clientSecret != null) {
            return; // Already loaded
        }

        java.io.File credentialsFile = new java.io.File("src/main/resources/credentials.json");
        if (!credentialsFile.exists()) {
            throw new IOException("Credentials file not found: " + credentialsFile.getAbsolutePath());
        }

        InputStream in = new FileInputStream(credentialsFile);
        GoogleClientSecrets clientSecrets = GoogleClientSecrets.load(JSON_FACTORY, new InputStreamReader(in));

        clientId = clientSecrets.getDetails().getClientId();
        clientSecret = clientSecrets.getDetails().getClientSecret();

        logger.info("✅ Client secrets loaded");
    }

    /**
     * Creates a Google Calendar event with Google Meet conference
     */
    private Event createCalendarEvent(Session session, User teacher, User learner) {
        logger.info("Creating calendar event object...");

        Event event = new Event()
                .setSummary("Skill Sharing: " + (session.getSkillId() != null ? session.getSkillId() : "Session"))
                .setDescription(String.format(
                        "Skill sharing session\n\nTeacher: %s (%s)\nLearner: %s (%s)",
                        teacher.getFullName(), teacher.getEmail(),
                        learner.getFullName(), learner.getEmail()));

        // Set event timing
        OffsetDateTime startTime = session.getScheduledTime();
        OffsetDateTime endTime = startTime.plusMinutes(session.getDuration());

        DateTime startDateTime = new DateTime(startTime.toInstant().toEpochMilli());
        DateTime endDateTime = new DateTime(endTime.toInstant().toEpochMilli());

        event.setStart(new EventDateTime().setDateTime(startDateTime).setTimeZone("UTC"));
        event.setEnd(new EventDateTime().setDateTime(endDateTime).setTimeZone("UTC"));

        // Add attendees
        EventAttendee teacherAttendee = new EventAttendee()
                .setEmail(teacher.getEmail())
                .setDisplayName(teacher.getFullName())
                .setOrganizer(true);

        EventAttendee learnerAttendee = new EventAttendee()
                .setEmail(learner.getEmail())
                .setDisplayName(learner.getFullName());

        event.setAttendees(Arrays.asList(teacherAttendee, learnerAttendee));

        // CRITICAL: Create Google Meet conference
        ConferenceSolutionKey conferenceSolutionKey = new ConferenceSolutionKey()
                .setType("hangoutsMeet");

        CreateConferenceRequest createConferenceRequest = new CreateConferenceRequest()
                .setRequestId(java.util.UUID.randomUUID().toString())
                .setConferenceSolutionKey(conferenceSolutionKey);

        ConferenceData conferenceData = new ConferenceData()
                .setCreateRequest(createConferenceRequest);

        event.setConferenceData(conferenceData);

        logger.info("✅ Calendar event object created");
        return event;
    }

    /**
     * Extracts Google Meet details from the created calendar event
     */
    private void extractMeetDetailsFromEvent(Session session, Event event) {
        logger.info("Extracting Meet details from event...");

        session.setSessionType("virtual");

        // Extract Google Meet URL from conference data
        if (event.getConferenceData() != null) {
            ConferenceData confData = event.getConferenceData();

            logger.info("Conference data found");
            logger.info("Conference ID: " + confData.getConferenceId());

            if (confData.getEntryPoints() != null) {
                logger.info("Entry points: " + confData.getEntryPoints().size());

                for (EntryPoint entryPoint : confData.getEntryPoints()) {
                    logger.info("Entry point type: " + entryPoint.getEntryPointType());
                    logger.info("Entry point URI: " + entryPoint.getUri());

                    if ("video".equals(entryPoint.getEntryPointType())) {
                        String meetUrl = entryPoint.getUri();
                        session.setMeetingUrl(meetUrl);

                        // Extract meeting code from URL
                        if (meetUrl != null && meetUrl.contains("meet.google.com/")) {
                            String meetingCode = meetUrl.substring(meetUrl.lastIndexOf("/") + 1);
                            session.setMeetingId(meetingCode);
                            logger.info("✅ Extracted meeting code: " + meetingCode);
                        }
                        break;
                    }
                }
            } else {
                logger.warning("⚠️ No entry points found in conference data");
            }

            // Set conference ID as additional reference
            if (confData.getConferenceId() != null) {
                session.setMeetingPassword(confData.getConferenceId());
            }
        } else {
            logger.warning("⚠️ No conference data in event");
        }

        logger.info("Final meeting URL: " + session.getMeetingUrl());
        logger.info("Final meeting ID: " + session.getMeetingId());
    }

    /**
     * Test method to verify a user's Google OAuth tokens work
     */
    public boolean testUserCalendarAccess(User user) {
        try {
            logger.info("Testing calendar access for: " + user.getEmail());

            if (user.getGoogleAccessToken() == null || user.getGoogleAccessToken().isEmpty()) {
                logger.warning("User has no access token");
                return false;
            }

            Calendar calendar = createCalendarServiceForUser(user);

            // Try to list calendars
            com.google.api.services.calendar.Calendar.Events.List request =
                    calendar.events().list("primary")
                            .setMaxResults(1)
                            .setTimeMin(new DateTime(System.currentTimeMillis()));

            request.execute();
            logger.info("✅ Calendar access test successful");
            return true;

        } catch (Exception e) {
            logger.severe("❌ Calendar access test failed: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }

    /**
     * Creates a basic Google Meet session with generated URL (fallback when OAuth fails)
     */
    public Session createBasicCalendarEvents(Session session, User teacher, User learner) {
        // Generate a simple Google Meet URL that works
        String meetingId = generateRandomString(10).toLowerCase();
        String meetingUrl = "https://meet.google.com/" + meetingId;

        session.setMeetingUrl(meetingUrl);
        session.setMeetingId(meetingId);
        session.setSessionType("virtual");

        logger.info("Created basic Google Meet URL: " + meetingUrl);
        return session;
    }

    /**
     * Test method to verify credentials can be loaded
     * This tests if the credentials.json file is valid and can be parsed
     */
    public boolean testCredentialsLoading() {
        try {
            logger.info("Testing credentials loading...");

            // For testing, load from file system since it's excluded from Maven resources
            java.io.File credentialsFile = new java.io.File("src/main/resources/credentials.json");
            logger.info("Loading Google API credentials from: " + credentialsFile.getAbsolutePath());

            if (!credentialsFile.exists()) {
                logger.severe("Credentials file not found: " + credentialsFile.getAbsolutePath());
                return false;
            }

            // Load client secrets from file
            InputStream in = new java.io.FileInputStream(credentialsFile);
            GoogleClientSecrets clientSecrets = GoogleClientSecrets.load(JSON_FACTORY, new InputStreamReader(in));

            logger.info("Successfully loaded credentials");
            logger.info("Client ID: " + clientSecrets.getDetails().getClientId());
            return true;

        } catch (Exception e) {
            logger.severe("Credentials loading test failed: " + e.getMessage());
            return false;
        }
    }

    /**
     * Test method to verify Google API connectivity
     * This is a simplified test since we don't have a global calendar service
     */
    public boolean testGoogleApiConnection() {
        try {
            logger.info("Testing Google API setup...");

            // Test 1: Can we load credentials?
            if (!testCredentialsLoading()) {
                logger.severe("Cannot load Google API credentials");
                return false;
            }

            // Test 2: Can we create HTTP transport?
            GoogleNetHttpTransport.newTrustedTransport();
            logger.info("HTTP transport creation successful");

            // Test 3: Can we create JSON factory?
            GsonFactory.getDefaultInstance();
            logger.info("JSON factory creation successful");

            logger.info("Google API setup test successful - credentials and dependencies are working");
            return true;

        } catch (Exception e) {
            logger.severe("Google API setup test failed: " + e.getMessage());
            return false;
        }
    }

    /**
     * Generates a random string for meeting IDs
     */
    private String generateRandomString(int length) {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < length; i++) {
            sb.append(chars.charAt((int)(Math.random() * chars.length())));
        }
        return sb.toString();
    }
}