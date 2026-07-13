# OFPPT Internal Platform (Microservices)

## Overview

This project is an internal platform for OFPPT designed to manage:
- Users and authentication
- Academic structure (students, groups, schedules, absences)
- Documents and assignments

The system follows a **microservices architecture** with separate services and databases.

---

## Architecture

The project is organized as a monorepo containing multiple services:

### Services

| Service           | Description |
|------------------|------------|
| API Gateway       | Entry point, routes requests, handles authentication |
| Auth Service      | Manages users, roles, permissions, JWT authentication |
| Academic Service  | Handles students, groups, schedules, absences |
| Document Service  | Manages documents, assignments, submissions |
| Frontend          | React application |

---

## Technologies Used

- Backend: NodeJS (ExpressJS)
- Frontend: React (Vite)
- Database: MySQL
- Authentication: JWT
- Architecture: Microservices

---

## How It Works

1. The frontend sends requests to the API Gateway  
2. The Gateway validates the JWT token  
3. The Gateway forwards the request to the appropriate microservice  
4. Each service processes the request using its own database  

---

## Setup Instructions

### 1. Clone the repository

---

### 2. Install dependencies for each service

Repeat for each service:

Do the same for:
- api-gateway
- academic-service
- document-service

---

### 3. Configure environment variables

For each service:
- Set database connection in `.env`
- Set service URLs (for inter-service communication)

Example:

AUTH_SERVICE_URL=http://localhost:8001

ACADEMIC_SERVICE_URL=http://localhost:8002

---

### 4. Run services

Run each service on a different port:

---

### 5. Run frontend

---

## API Structure

All requests go through the API Gateway:

/api/auth/login
/api/academic/students
/api/academic/absences
/api/documents

---

## Authentication

- Uses JWT tokens
- Token must be included in requests:

Authorization: Bearer <token>

---

## Development Notes

- Each microservice has its own database
- Services do NOT share databases
- Communication between services is done via HTTP APIs
- API Gateway is the only entry point

---

## Project Status

- [ ] Auth Service
- [ ] API Gateway
- [ ] Academic Service
- [ ] Document Service
- [ ] Frontend

---

## Future Improvements

- Docker integration
- Role-based access control enhancements
- Notifications system
- File storage optimization

---

## Author

- BAHOUJABOUR Souhail

