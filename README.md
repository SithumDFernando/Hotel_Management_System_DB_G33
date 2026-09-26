# SkyNest Hotel Reservation & Guest Services Management System (HRGSMS)

Welcome to the SkyNest HRGSMS project. This repository contains the complete solution for managing hotel operations, including room bookings, check-in/check-out processes, service tracking, and billing, for SkyNest Hotels.

## Folder Structure

The project is structured into three main components: Database, Backend, and Frontend.

```
SkyNest_P5_G33/
├── db/
│   ├── schema/                 # CREATE TABLE statements, constraints, indexes
│   │   ├── 01_tables.sql
│   │   ├── 02_constraints.sql
│   │   └── 03_indexes.sql
│   ├── functions/              # Reusable helper functions for calculations
│   │   ├── fn_calculate_nights.sql
│   │   ├── fn_get_current_rate.sql
│   │   ├── fn_get_room_charges.sql
│   │   ├── fn_get_service_charges.sql
│   │   ├── fn_calculate_tax.sql
│   │   └── fn_get_outstanding_balance.sql
│   ├── procedures/             # Core business procedures
│   │   ├── booking.sql
│   │   ├── checkin_checkout.sql
│   │   ├── billing.sql
│   │   └── payments.sql
│   ├── triggers/               # Triggers for data integrity
│   │   ├── double_booking_trigger.sql
│   │   ├── room_status_trigger.sql
│   │   └── service_usage_trigger.sql
│   ├── views/                  # Reporting views
│   │   └── reports.sql
│   ├── seed/                   # Sample data
│   │   └── sample_data.sql
│   └── run_all.sql             # Script to run all SQL files in order
├── backend/
│   ├── app/
│   │   ├── schemas/            # Pydantic models for validation
│   │   ├── routers/            # API endpoint definitions
│   │   ├── main.py             # FastAPI application entry point
│   │   ├── db.py               # Database connection handling
│   │   ├── auth.py             # Authentication logic (JWT)
│   │   ├── config.py           # Configuration management
│   │   └── dependencies.py     # FastAPI dependencies (e.g., auth guards)
│   ├── tests/                  # Unit and integration tests
│   ├── requirements.txt        # Python dependencies
│   └── .env.example            # Example environment variables
├── frontend/
│   ├── src/
│   │   ├── api/                # API client functions
│   │   ├── components/         # Reusable React components
│   │   ├── context/            # React context providers (Auth)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── pages/              # Main application pages
│   │   ├── routes/             # Routing and route guards
│   │   ├── styles/             # Global CSS
│   │   ├── utils/              # Helper functions and formatters
│   │   ├── App.jsx             # Main app component
│   │   └── main.jsx            # Entry point
│   ├── index.html              # HTML template
│   ├── vite.config.js          # Vite configuration
│   ├── package.json            # Node.js dependencies
│   └── .env.example            # Example environment variables
├── docs/                       # Project documentation and specifications
├── .github/workflows/ci.yml    # CI/CD pipeline configuration
├── AGENTS.md                   # Custom agent configurations/rules
└── README.md                   # This file
```

## Getting Started

Please refer to the detailed specifications in the `docs/specs/` directory:
- [Deployment Guide](docs/specs/10_deployment_guide.md) - Instructions to run the project.
- [Database Design](docs/specs/01_database_design.md) - ER Diagram and schema documentation.
- [API Contract](docs/specs/02_api_contract.md) - REST API endpoint definitions.
- [Frontend Pages](docs/specs/09_frontend_pages.md) - UI design and structure.
