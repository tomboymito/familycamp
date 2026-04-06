def test_create_booking_success(client, booking_payload):
    resp = client.post("/bookings", json=booking_payload, headers={"Idempotency-Key": "k1"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["spot_id"] == 1
    assert data["crm_sync_status"] in {"synced", "error"}


def test_create_booking_conflict(client, booking_payload):
    first = client.post("/bookings", json=booking_payload, headers={"Idempotency-Key": "k2"})
    assert first.status_code == 200

    second = client.post("/bookings", json=booking_payload, headers={"Idempotency-Key": "k3"})
    assert second.status_code == 409


def test_create_booking_invalid_dates(client, booking_payload):
    payload = dict(booking_payload)
    payload["check_in"] = "2026-06-12"
    payload["check_out"] = "2026-06-11"

    resp = client.post("/bookings", json=payload, headers={"Idempotency-Key": "k4"})
    assert resp.status_code == 422


def test_availability_endpoint(client, booking_payload):
    client.post("/bookings", json=booking_payload, headers={"Idempotency-Key": "k5"})

    resp = client.get("/availability/spot/1", params={"check_in": "2026-06-10", "check_out": "2026-06-12"})
    assert resp.status_code == 200
    assert resp.json()["is_available"] is False


def test_resend_to_crm(client, booking_payload):
    create_resp = client.post("/bookings", json=booking_payload, headers={"Idempotency-Key": "k6"})
    booking_id = create_resp.json()["id"]

    resend_resp = client.post(f"/bookings/{booking_id}/crm/resend")
    assert resend_resp.status_code == 200
    assert resend_resp.json()["id"] == booking_id
