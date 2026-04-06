from collections import defaultdict, deque
from datetime import datetime, timedelta
from threading import Lock


class RateLimiter:
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window = timedelta(seconds=window_seconds)
        self._events: dict[str, deque[datetime]] = defaultdict(deque)
        self._lock = Lock()

    def allow(self, key: str) -> bool:
        now = datetime.utcnow()
        with self._lock:
            queue = self._events[key]
            while queue and now - queue[0] > self.window:
                queue.popleft()
            if len(queue) >= self.max_requests:
                return False
            queue.append(now)
            return True


class IdempotencyStore:
    def __init__(self, ttl_seconds: int = 3600):
        self.ttl = timedelta(seconds=ttl_seconds)
        self._store: dict[str, tuple[int, datetime]] = {}
        self._lock = Lock()

    def get(self, key: str) -> int | None:
        now = datetime.utcnow()
        with self._lock:
            item = self._store.get(key)
            if not item:
                return None
            booking_id, created_at = item
            if now - created_at > self.ttl:
                self._store.pop(key, None)
                return None
            return booking_id

    def set(self, key: str, booking_id: int) -> None:
        with self._lock:
            self._store[key] = (booking_id, datetime.utcnow())


rate_limiter = RateLimiter(max_requests=20, window_seconds=60)
idempotency_store = IdempotencyStore(ttl_seconds=3600)
