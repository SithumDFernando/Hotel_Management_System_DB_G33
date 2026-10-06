# HTTP Request & Response Headers

Every HTTP request and response carries **headers** — key-value pairs of metadata that travel alongside the actual data (body). Headers tell the server *who* is calling, *what format* the data is in, *how* caching should work, and *how* to trace the request across systems.

This document categorises all major HTTP headers, explains each with real SkyNest examples, and shows how they fit into a complete API call.

---

## 1. What Are HTTP Headers?

An HTTP message (request or response) has three parts:

```
┌─────────────────────────────────────────┐
│  1. Start Line                          │
│     POST /api/bookings HTTP/1.1         │
├─────────────────────────────────────────┤
│  2. Headers (metadata)                  │
│     Host: localhost:8000                │
│     Authorization: Bearer eyJhbG...     │
│     Content-Type: application/json      │
│     Accept: application/json            │
├─────────────────────────────────────────┤
│  3. Body (payload)                      │
│     {"room_id": 101, "nights": 3}       │
└─────────────────────────────────────────┘
```

Headers are the "envelope" of the message — they describe *how* to handle the contents without being the contents themselves.

---

## 2. Header Categories

```mermaid
flowchart TD
    H["HTTP Headers"] --> A["Content Negotiation"]
    H --> B["Authentication<br/>& Authorization"]
    H --> C["Client & Origin<br/>Context"]
    H --> D["Caching &<br/>Conditional"]
    H --> E["Distributed Tracing<br/>& Reliability"]
    H --> F["Security &<br/>Privacy"]

    A --> A1["Accept"]
    A --> A2["Accept-Language"]
    A --> A3["Accept-Encoding"]
    A --> A4["Content-Type"]

    B --> B1["Authorization"]
    B --> B2["Cookie"]
    B --> B3["X-API-Key"]

    C --> C1["Origin"]
    C --> C2["Referer"]
    C --> C3["User-Agent"]
    C --> C4["Host"]

    D --> D1["Cache-Control"]
    D --> D2["If-None-Match / ETag"]
    D --> D3["If-Modified-Since"]

    E --> E1["X-Request-ID"]
    E --> E2["Idempotency-Key"]

    F --> F1["Strict-Transport-Security"]
    F --> F2["X-Content-Type-Options"]
    F --> F3["X-Frame-Options"]

    style H fill:#1d3557,color:#fff
    style A fill:#2d6a4f,color:#fff
    style B fill:#6a040f,color:#fff
    style C fill:#5a189a,color:#fff
    style D fill:#c77dff,color:#000
    style E fill:#ff6d00,color:#000
    style F fill:#495057,color:#fff
```

---

## 3. Content Negotiation Headers

These headers let the client and server **agree on data formats**, languages, and compression.

### `Content-Type` (Request & Response)

Tells the recipient what format the body is in.

```http
Content-Type: application/json
```

| Value | Meaning |
| :--- | :--- |
| `application/json` | JSON data (most common for APIs) |
| `text/html` | HTML web page |
| `multipart/form-data` | File uploads (e.g., guest profile photo) |
| `application/x-www-form-urlencoded` | HTML form submissions |

### `Accept` (Request Only)

Tells the server what format the client **wants** the response in.

```http
Accept: application/json
```

*Example*: A SkyNest admin endpoint could support both JSON and CSV. The client specifies preference:
- `Accept: application/json` → Returns structured JSON data
- `Accept: text/csv` → Returns downloadable CSV report

### `Accept-Language` (Request Only)

Tells the server the user's preferred spoken language.

```http
Accept-Language: en-US,en;q=0.9,si;q=0.8
```

This says: *"I prefer American English, then any English, then Sinhala."* The `q` values (quality factors, 0 to 1) indicate preference strength.

### `Accept-Encoding` (Request Only)

Tells the server which compression algorithms the client supports to reduce bandwidth.

```http
Accept-Encoding: gzip, deflate, br
```

The server can then compress the response body (e.g., a large room listing) before sending, saving network transfer time.

---

## 4. Authentication & Authorization Headers

These headers prove **who the caller is** and **what they're allowed to do**.

### `Authorization` (Request Only)

Carries credentials to authenticate the request. In SkyNest, this is a JWT Bearer token:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhY2N0XzAxIiwicm9sZSI6InJlY2VwdGlvbmlzdCJ9.abc123
```

The `oauth2_scheme` dependency in `backend/app/dependencies.py` extracts this token, and `get_current_user()` decodes it to identify the caller.

### `Cookie` (Request Only)

Automatically attached by the browser when using cookie-based sessions (not used in SkyNest's JWT approach, but common in traditional web apps):

```http
Cookie: session_id=xyz987456; theme=dark
```

### `X-API-Key` (Request Only)

Used for machine-to-machine authentication or third-party integrations instead of user login:

```http
X-API-Key: sk_live_89f02a39bc01d4e7
```

---

## 5. Client & Origin Context Headers

These headers describe **who is making the request** and **where it came from**.

### `Host` (Request Only)

The domain name and port of the target server. Required in HTTP/1.1:

```http
Host: localhost:8000
```

### `Origin` (Request Only)

Added automatically by the browser to state where the request originated. Used for CORS checks:

```http
Origin: http://localhost:5173
```

### `Referer` (Request Only)

The full URL of the page that initiated the request (note the deliberate misspelling — a historical typo that became standard):

```http
Referer: http://localhost:5173/bookings/new
```

### `User-Agent` (Request Only)

Identifies the client software, browser, or tool making the request:

```http
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0
```

Or for API tools:

```http
User-Agent: PostmanRuntime/7.32.3
```

---

## 6. Caching & Conditional Headers

These headers prevent **redundant data transfer** by letting the browser reuse cached responses.

### `Cache-Control` (Request & Response)

Directives for whether and how responses should be cached:

```http
Cache-Control: no-cache
```

| Value | Meaning |
| :--- | :--- |
| `no-cache` | Always revalidate with server before using cache |
| `no-store` | Never store the response (sensitive data like billing) |
| `max-age=3600` | Cache is valid for 3600 seconds (1 hour) |
| `public` | Any cache (CDN, proxy) can store the response |
| `private` | Only the user's browser can cache (not shared proxies) |

### `ETag` + `If-None-Match` (Conditional GET)

1. Server responds with an `ETag` (hash of the resource):
   ```http
   ETag: "686897696a7c876b7e"
   ```
2. On the next request, the browser sends:
   ```http
   If-None-Match: "686897696a7c876b7e"
   ```
3. If the resource hasn't changed, the server responds with `304 Not Modified` (no body) — saving bandwidth.

---

## 7. Distributed Tracing & Reliability Headers

### `X-Request-ID` / `X-Correlation-ID` (Request Only)

A unique UUID attached to a request so that logs across frontend, backend, database, and third-party services can be traced back to a single user action:

```http
X-Request-ID: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
```

*Example*: If a SkyNest booking fails, the support team can search logs by this ID to trace every system the request touched.

### `Idempotency-Key` (Request Only)

Used in payment and billing APIs to ensure that network retries don't cause duplicate charges:

```http
Idempotency-Key: pay_req_99210
```

If the client sends the same `Idempotency-Key` twice (due to a timeout and retry), the server recognises it and returns the original response instead of charging again.

---

## 8. Security & Privacy Headers (Response Only)

These are set by the **server** to instruct the browser on security policies:

| Header | Example Value | Purpose |
| :--- | :--- | :--- |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Forces the browser to always use HTTPS for this domain |
| `X-Content-Type-Options` | `nosniff` | Prevents the browser from guessing (`sniffing`) the content type |
| `X-Frame-Options` | `DENY` | Blocks the page from being embedded in an `<iframe>` (prevents clickjacking) |
| `Content-Security-Policy` | `default-src 'self'` | Restricts where scripts, styles, and resources can be loaded from |

---

## 9. Full Annotated SkyNest API Request

Here is a complete HTTP request showing headers from multiple categories working together:

```http
POST /api/billing/payments HTTP/1.1
Host: localhost:8000
Origin: http://localhost:5173
Referer: http://localhost:5173/billing/42
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0
Accept: application/json
Accept-Language: en-US
Accept-Encoding: gzip, br
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhY2N0XzAxIn0.sig
X-Request-ID: 8a4f910e-5b1e-4509-9ec6-1e646271c667
Idempotency-Key: pay_req_99210

{
    "booking_id": 42,
    "amount": 250.00,
    "payment_method": "credit_card"
}
```

---

## 10. Request vs. Response Headers (Flow)

```mermaid
sequenceDiagram
    participant Client as React Frontend
    participant Server as FastAPI Backend

    Note over Client: REQUEST HEADERS
    Client->>Server: POST /api/bookings<br/>Host: localhost:8000<br/>Origin: http://localhost:5173<br/>Authorization: Bearer eyJ...<br/>Content-Type: application/json<br/>Accept: application/json<br/>X-Request-ID: abc-123

    Note over Server: RESPONSE HEADERS
    Server->>Client: 201 Created<br/>Content-Type: application/json<br/>Access-Control-Allow-Origin: http://localhost:5173<br/>Access-Control-Allow-Credentials: true<br/>X-Request-ID: abc-123<br/>Cache-Control: no-store<br/><br/>{"booking_id": 42}
```

---

## 11. Key Takeaways

> [!TIP]
> **Not all headers are user-controlled.** Many headers (`Origin`, `Referer`, `Host`, `Cookie`) are automatically set by the browser and cannot be modified by JavaScript for security reasons.

> [!NOTE]
> **Custom headers use the `X-` prefix by convention** (e.g., `X-Request-ID`, `X-API-Key`), although this convention has been relaxed in modern standards. New custom headers can use any name that doesn't conflict with standard headers.

> [!IMPORTANT]
> **Headers are plain text.** Never put sensitive data (passwords, credit card numbers) in headers. Use the encrypted request body over HTTPS instead. The `Authorization` header is an exception because the token it carries is already cryptographically signed and has a short expiration.
