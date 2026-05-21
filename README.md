# SkillShare Platform

A modern skill-sharing platform where people can connect, learn, and teach skills through virtual meetings. Built with Spring Boot backend and Next.js frontend.

## Features

- 🔐 **Secure Authentication** - JWT-based authentication with encrypted passwords
- 👥 **User Profiles** - Create profiles with skills you offer and want to learn
- 📅 **Session Scheduling** - Schedule skill-sharing sessions with flexible timing
- 📹 **Google Meet Integration** - Virtual meetings with automatic Google Meet link generation
- ⭐ **Rating System** - Rate and review skill-sharing sessions
- 💬 **Messaging** - Communicate with other users
- 📱 **Responsive Design** - Modern, mobile-friendly interface

## Tech Stack

### Backend
- **Spring Boot 3.3.0** - REST API framework (JDK 23 compatible)
- **Spring Security** - Authentication and authorization
- **JWT (JJWT 0.12.6)** - Token-based authentication
- **JPA/Hibernate** - Database ORM
- **H2/MySQL** - Database (configurable)
- **JDK 23** - Latest Java runtime

### Frontend
- **Next.js 16** - React framework
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible UI components
- **React Hook Form** - Form management
- **Date-fns** - Date utilities

## Quick Start

### Prerequisites
- **Java 23** (required for compatibility)
- **Node.js 18+**
- **Maven 3.8+**
- **pnpm** (recommended) or npm

### JDK 23 Setup (macOS)

1. **Download JDK 23:**
   ```bash
   # Using SDKMAN (recommended)
   curl -s "https://get.sdkman.io" | bash
   source "$HOME/.sdkman/bin/sdkman-init.sh"
   sdk install java 23-open

   # Or download manually from Oracle/Adoptium
   ```

2. **Verify installation:**
   ```bash
   java -version
   # Should show: openjdk version "23"
   ```

3. **Set JAVA_HOME (if needed):**
   ```bash
   export JAVA_HOME=$(/usr/libexec/java_home -v 23)
   echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 23)' >> ~/.zshrc
   ```

### Backend Setup

1. **Clone and navigate to the project:**
   ```bash
   cd skill-sharing-platform
   ```

2. **Configure database (optional):**
   - Default: H2 in-memory database (perfect for development/testing)
   - For production, update `src/main/resources/application.properties`:
   ```properties
   spring.datasource.url=jdbc:mysql://localhost:3306/skillshare
   spring.datasource.username=your_username
   spring.datasource.password=your_password
   spring.jpa.hibernate.ddl-auto=update
   ```

3. **Run the Spring Boot backend:**
   ```bash
   # Option 1: Use the provided script (recommended for macOS + JDK 23)
   ./run-backend.sh

   # Option 2: Manual Maven run
   mvn spring-boot:run
   ```

   The API will be available at `http://localhost:8080`
   - **H2 Database Console:** http://localhost:8080/h2-console
   - **API Documentation:** Available at runtime

   **JDK 23 optimized!** The script automatically configures JVM arguments for JDK 23 compatibility.

### Frontend Setup


**Run the development server:**
   ```bash
   ./run-frontend.sh
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Users
- `GET /api/users` - Get all users
- `GET /api/users/{id}` - Get user by ID
- `PUT /api/users/{id}` - Update user profile

### Sessions
- `POST /api/sessions` - Create new session
- `GET /api/sessions` - Get all sessions
- `GET /api/sessions/{id}` - Get session by ID
- `PUT /api/sessions/{id}/status` - Update session status

### Skills
- `GET /api/skills` - Get all skills
- `POST /api/skills` - Create new skill

## Virtual Meetings

The platform generates unique Google Meet URLs for virtual skill-sharing sessions. Each session gets its own meeting link that participants can join directly.

**How it works:**
- When you schedule a virtual session, a unique Google Meet URL is automatically generated
- The URL format is: `https://meet.google.com/skill-share-{sessionId}-{randomCode}`
- Participants can join the meeting directly using the provided link
- No Google API setup required - works out of the box!

## Project Structure

```
skill-sharing-platform/
├── src/main/java/com/skillsharing/     # Spring Boot backend
│   ├── config/                         # Configuration classes
│   ├── controller/                     # REST controllers
│   ├── model/                          # JPA entities
│   ├── repository/                     # Data repositories
│   ├── service/                        # Business logic
│   ├── security/                       # Security configuration
│   └── dto/                           # Data transfer objects
├── src/main/resources/                 # Static resources & config
├── app/                               # Next.js frontend
│   ├── auth/                          # Authentication pages
│   ├── dashboard/                     # Dashboard pages
│   └── landing/                       # Landing page
└── components/                        # Reusable React components
```

## Key Features Implementation

### Virtual Sessions
- Sessions can be marked as "virtual" to trigger Google Meet creation
- Automatic meeting link generation on session creation
- Meeting component shows countdown and join buttons
- Copy meeting links and open in new tabs

### Skill Management
- Users can add skills they offer and want to learn
- Skill categories for better organization
- Profile completion with bio and location

### Session Scheduling
- Date/time picker with calendar component
- Duration selection (30min to 2hrs)
- Location for in-person or virtual meetings
- Notes for additional session details

### Security Features
- Password encryption with BCrypt
- JWT tokens with configurable expiration
- CORS configuration for frontend integration
- Input validation and sanitization

## Development

### Running Tests
```bash
# Backend tests
mvn test

# Frontend tests (if implemented)
pnpm test
```

### Building for Production
```bash
# Backend
mvn clean package

# Frontend
pnpm build
```

## Deployment

### Backend Deployment
```bash
java -jar target/skill-sharing-platform-1.0.0.jar
```

### Frontend Deployment
```bash
pnpm build
pnpm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Troubleshooting

### JDK 23 Issues on macOS

**Problem: "java version '23' is not recognized"**
```bash
# Check if JDK 23 is properly installed
java -version

# If not showing version 23, reinstall JDK 23
# Using SDKMAN:
sdk install java 23-open
sdk use java 23-open

# Or set JAVA_HOME manually:
export JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-23.jdk/Contents/Home
```

**Problem: "Unsupported class file major version"**
- Ensure your IDE is configured to use JDK 23
- In IntelliJ IDEA: File → Project Structure → Project SDK → 23
- In VS Code: Update settings.json with correct Java home

**Problem: "Preview features not enabled"**
- The run script automatically enables preview features
- If running manually, add: `--enable-preview`

### Common macOS Issues

**Problem: "Permission denied" on run-backend.sh**
```bash
chmod +x run-backend.sh
```

**Problem: Port 8080 already in use**
```bash
# Kill process using port 8080
lsof -ti:8080 | xargs kill -9

# Or change port in application.properties
server.port=8081
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or issues, please open an issue on GitHub or contact the development team.