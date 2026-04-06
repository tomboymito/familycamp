import json
from dataclasses import dataclass
from datetime import datetime
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import backend.BD.BD_alchemy as models
from app.core.config import settings


@dataclass
class CrmSyncResult:
    ok: bool
    status: str
    error_message: str | None = None
    response_payload: str | None = None


def _build_payload(booking: models.Booking) -> dict:
    customer = booking.customer
    spot = booking.spot
    return {
        "booking_id": booking.id,
        "public_order_id": booking.public_order_id,
        "check_in": booking.check_in.isoformat() if booking.check_in else None,
        "check_out": booking.check_out.isoformat() if booking.check_out else None,
        "guests_count": booking.guests_count,
        "comment": booking.comment,
        "status": booking.status.value if hasattr(booking.status, "value") else str(booking.status),
        "created_at": booking.created_at.isoformat() if booking.created_at else datetime.utcnow().isoformat(),
        "customer": {
            "id": customer.id if customer else None,
            "name": customer.name if customer else None,
            "phone": customer.phone if customer else None,
            "email": customer.email if customer else None,
        },
        "spot": {
            "id": spot.id if spot else None,
            "name": spot.name if spot else None,
            "type": spot.type if spot else None,
            "capacity": spot.capacity if spot else None,
        },
    }


def sync_booking_to_crm(booking: models.Booking) -> CrmSyncResult:
    payload = _build_payload(booking)

    if not settings.crm_webhook_url:
        return CrmSyncResult(
            ok=False,
            status="error",
            error_message="CRM webhook URL is not configured",
            response_payload=None,
        )

    body = json.dumps(payload).encode("utf-8")
    request = Request(
        url=settings.crm_webhook_url,
        method="POST",
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-CRM-Token": settings.crm_api_token or "",
        },
    )

    try:
        with urlopen(request, timeout=settings.crm_timeout_seconds) as response:
            response_body = response.read().decode("utf-8")
            if 200 <= response.status < 300:
                return CrmSyncResult(ok=True, status="synced", response_payload=response_body)
            return CrmSyncResult(
                ok=False,
                status="error",
                error_message=f"CRM response status: {response.status}",
                response_payload=response_body,
            )
    except HTTPError as exc:
        message = exc.read().decode("utf-8") if hasattr(exc, "read") else str(exc)
        return CrmSyncResult(ok=False, status="error", error_message=f"HTTPError: {message}")
    except URLError as exc:
        return CrmSyncResult(ok=False, status="error", error_message=f"URLError: {exc}")
    except Exception as exc:
        return CrmSyncResult(ok=False, status="error", error_message=str(exc))
