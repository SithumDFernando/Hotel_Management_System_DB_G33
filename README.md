# SkyNest Hotel Reservation & Guest Services Management System

SkyNest is a full-stack hotel management system for a three-branch hotel group in Sri Lanka (Colombo, Kandy, Galle). It covers multi-branch room reservations, guest check-in and check-out, in-stay service requests, and automated billing and payments, with role-based access for guests, receptionists, managers and admins.

Built for the University of Moratuwa Semester 3 Database Project (Group 33).

**Stack:** PostgreSQL (schema, stored procedures, triggers, views) · FastAPI · React + Vite + Tailwind CSS · Docker

## Run with Docker

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
docker compose up --build
```

| Container          | URL                                                      |
| :----------------- | :------------------------------------------------------- |
| Web app (React)    | [http://localhost:8080](http://localhost:8080)           |
| API (FastAPI)      | [http://localhost:8000](http://localhost:8000)           |
| API docs (Swagger) | [http://localhost:8000/docs](http://localhost:8000/docs) |
| pgAdmin            | [http://localhost:5050](http://localhost:5050)           |
| PostgreSQL         | `localhost:5432`                                         |

## Mock Login Credentials

Every mock account uses the password `SkyNest@2026`. The full list of emails and roles is in [docs/MOCK_LOGIN_CREDENTIALS.md](docs/MOCK_LOGIN_CREDENTIALS.md).

## Team Contributions

| Member       | Contribution                                                                                  |
| :----------- | :-------------------------------------------------------------------------------------------- |
| **Sithum**   | Core Technical Architecrue, Shemas, Indexes, Auth, Frontend, CI/CD pipeline, cloud deployment |
| **Vinuji**   | Reservations and front desk: bookings, check-in/out, double-booking prevention                |
| **Sheereen** | Billing and payments: rate calculation, invoices, payment recording                           |
| **Chamika**  | Rooms, amenities and services: service requests, price-lock trigger                           |
| **Sadeepa**  | Analytics, views and seed data: occupancy and revenue reports, sample data                    |
