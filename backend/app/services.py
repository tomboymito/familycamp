import hashlib
import json
from collections import defaultdict, deque
from datetime import datetime, timedelta

import httpx
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.models import Booking, BookingStatus, CRMLog, CRMSyncStatus, Customer, SpotBlock


_rate_bucket: dict[str, deque[datetime]] = defaultdict(deque)
_recent_payload_hashes: dict[str, datetime] = {}


def enforce_rate_limit(client_key: str) -> None:
    now = datetime.utcnow()
    queue = _rate_bucket[client_key]
    while queue and (now - queue[0]) > timedelta(minutes=1):
        queue.popleft()
    if len(queue) >= settings.request_limit_per_minute:
        raise ValueError("Слишком много запросов. Повторите позже.")
    queue.append(now)


def payload_fingerprint(payload: dict) -> str:
    normalized = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def prevent_duplicate_submission(payload_hash: str) -> None:
    now = datetime.utcnow()
    expired = [k for k, ts in _recent_payload_hashes.items() if (now - ts) > timedelta(minutes=5)]
    for key in expired:
        _recent_payload_hashes.pop(key, None)
    if payload_hash in _recent_payload_hashes:
        raise ValueError("Похожая заявка уже отправлена недавно.")
    _recent_payload_hashes[payload_hash] = now


def has_date_overlap(db: Session, spot_id, check_in, check_out, excluded_booking_id: int | None = None) -> bool:
    booking_filters = [
        Booking.spot_id == spot_id,
        Booking.status.in_([BookingStatus.NEW, BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.BLOCKED]),
        Booking.check_in < check_out,
        Booking.check_out > check_in,
    ]
    if excluded_booking_id:
        booking_filters.append(Booking.id != excluded_booking_id)

    booking_overlap = db.scalar(select(Booking.id).where(and_(*booking_filters)).limit(1))
    if booking_overlap:
        return True

    block_overlap = db.scalar(
        select(SpotBlock.id).where(
            and_(
                SpotBlock.spot_id == spot_id,
                SpotBlock.date_from < check_out,
                SpotBlock.date_to > check_in,
            )
        ).limit(1)
    )
    return bool(block_overlap)


def get_or_create_customer(db: Session, full_name: str, phone: str, email: str) -> Customer:
    customer = db.scalar(select(Customer).where(Customer.phone == phone, Customer.email == email))
    if customer:
        customer.full_name = full_name
        return customer

    customer = Customer(full_name=full_name, phone=phone, email=email)
    db.add(customer)
    db.flush()
    return customer


def build_crm_payload(booking: Booking) -> dict:
    return {
        "booking_id": booking.id,
        "customer_name": booking.customer.full_name,
        "phone": booking.customer.phone,
        "email": booking.customer.email,
        "check_in": booking.check_in.isoformat(),
        "check_out": booking.check_out.isoformat(),
        "spot_id": booking.spot_id,
        "guests_count": booking.guests_count,
        "comment": booking.comment,
    }


async def sync_booking_to_crm(db: Session, booking: Booking) -> None:
    payload = build_crm_payload(booking)
    log = CRMLog(booking_id=booking.id, request_payload=json.dumps(payload, ensure_ascii=False), status="pending")
    db.add(log)
    try:
        async with httpx.AsyncClient(timeout=7) as client:
            response = await client.post(
                settings.crm_endpoint,
                headers={"Authorization": f"Bearer {settings.crm_api_key}"},
                json=payload,
            )
        response.raise_for_status()
        response_payload = response.json() if response.headers.get("content-type", "").startswith("application/json") else {"text": response.text}
        booking.crm_sync_status = CRMSyncStatus.SUCCESS
        booking.crm_entity_id = str(response_payload.get("id", "")) or None
        log.status = "success"
        log.response_payload = json.dumps(response_payload, ensure_ascii=False)
    except Exception as exc:  # noqa: BLE001
        booking.crm_sync_status = CRMSyncStatus.ERROR
        booking.status = BookingStatus.CRM_ERROR
        log.status = "error"
        log.error_message = str(exc)
    finally:
        db.commit()
