# System Architecture & Work Division Strategy

## 1. High-Level Architecture

SkyNest follows a classic 3-tier architecture, but with a heavy emphasis on the Database layer to align with the DBMS module evaluation criteria. 

```mermaid
graph TD
    subgraph Frontend [Frontend Layer - React/Vite]
        UI[Web Browser UI]
        API_C[Axios API Client]
        UI --> API_C
    end

    subgraph Backend [Backend Layer - FastAPI]
        ROUTERS[FastAPI Routers]
        AUTH[Auth / JWT middleware]
        DB_POOL[asyncpg Connection Pool]
        
        API_C -- HTTP REST --> ROUTERS
        ROUTERS --> AUTH
        ROUTERS --> DB_POOL
    end

    subgraph Database [Database Layer - PostgreSQL]
        TABLES[(Tables & Constraints)]
        VIEWS[Views & Reports]
        PROC[Stored Procedures]
        FUNC[Functions]
        TRIG[Triggers]
        
        DB_POOL -- SQL / CALL --> TABLES
        DB_POOL -- SQL / CALL --> VIEWS
        DB_POOL -- SQL / CALL --> PROC
        DB_POOL -- SQL / CALL --> FUNC
        
        PROC --> TABLES
        TABLES --> TRIG
    end
```

## 2. The "Vertical Slicing" Work Division Strategy

Instead of dividing work horizontally by layer (e.g., Person A does all SQL, Person B does all Python), we use **Vertical Slicing**. 

Each team member takes ownership of a specific **Functional Subsystem**. They write the Database Logic (SQL) for that subsystem AND the Backend API (Python) that exposes it.

### Why this is the best approach for the Viva and your learning:
1. **End-to-End Understanding:** You will learn how data flows from a database table, through a Python API, back to the user.
2. **Independence:** You won't be blocked waiting for someone else to finish their part. You own your feature completely.
3. **Viva Defense:** When asked "What did you do?", you can proudly explain an entire working feature, not just disjointed snippets of code.

```mermaid
graph LR
    subgraph Core Foundation
        TL[Team Lead: DB Tables, Auth, Core API Setup]
    end

    subgraph Vertical Feature Slices
        M1[Member 1: Bookings & Check-in]
        M2[Member 2: Billing & Payments]
        M3[Member 3: Services & Guests]
        M4[Member 4: Analytics & Seed Data]
    end
    
    TL -->|Provides foundation for| M1
    TL -->|Provides foundation for| M2
    TL -->|Provides foundation for| M3
    TL -->|Provides foundation for| M4
```
