"""
backend/app/rate_limit.py
=========================
Dependency-free, in-memory sliding-window limiters for the public auth
endpoints (ISSUE-10):

- login_failures: 10 failed logins per (client IP, email) in 5 minutes,
  then 429 until the oldest failure leaves the window. Only failures
  count, so staff logging in all day are never limited, and a successful
  login clears the counter.
- signup_attempts: 10 sign-ups per client IP per hour.

Limitation: the state lives in this process's memory. That is fine for the
single uvicorn process in docker-compose; with several workers or hosts,
move to a shared store (e.g. slowapi + Redis).

The client IP is request.client.host. Behind nginx, uvicorn runs with
--proxy-headers --forwarded-allow-ips="*" (backend/Dockerfile) so that is
the real client from X-Forwarded-For, not the nginx container.
"""

import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status


class SlidingWindowLimiter:
    def __init__(self, limit: int, window_s: int):
        self.limit = limit
        self.window = window_s
        self.hits: dict[str, deque] = defaultdict(deque)

    def _prune(self, key: str, now: float) -> deque:
        q = self.hits[key]
        while q and now - q[0] > self.window:
            q.popleft()
        return q

    def check(self, key: str) -> None:
        """Raise 429 if `key` has used up its attempts in the window."""
        q = self._prune(key, time.monotonic())
        if len(q) >= self.limit:
            retry_after = max(1, int(self.window - (time.monotonic() - q[0])))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many attempts. Try again later.",
                headers={"Retry-After": str(retry_after)},
            )

    def hit(self, key: str) -> None:
        self._prune(key, time.monotonic()).append(time.monotonic())

    def reset(self, key: str | None = None) -> None:
        """Forget one key (e.g. after a successful login), or everything."""
        if key is None:
            self.hits.clear()
        else:
            self.hits.pop(key, None)


login_failures = SlidingWindowLimiter(limit=10, window_s=300)
signup_attempts = SlidingWindowLimiter(limit=10, window_s=3600)


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"
