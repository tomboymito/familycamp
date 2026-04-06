import json
import os
from .models import Booking, CrmLog


class CrmGateway:
    def __init__(self):
        self.enabled = bool(os.getenv("AMOCRM_WEBHOOK_URL"))

    def send(self, booking: Booking):
        payload = {
            "booking_id": booking.id,
            "name": booking.customer.name,
            "phone": booking.customer.phone,
            "email": booking.customer.email,
            "dates": {"check_in": str(booking.check_in), "check_out": str(booking.check_out)},
            "spot": booking.spot.name,
            "comment": booking.comment,
        }
        # MVP: имитируем интеграцию, если webhook не настроен
        if not self.enabled:
            return True, "mock_sent", payload
        return False, "amoCRM webhook call is not implemented in MVP", payload


def write_crm_log(db, booking_id: int, status: str, error: str, payload: dict):
    db.add(CrmLog(booking_id=booking_id, status=status, error=error, payload=json.dumps(payload, ensure_ascii=False)))
