# Stage B migration checklist (PostgreSQL)

This file describes the baseline DB changes for stage B.

## New tables
- `spots`
- `customers`
- `crm_sync_log`

## Bookings table additions
- `customer_id`
- `spot_id`
- `check_in`
- `check_out`
- `guests_count`
- `comment`
- `crm_sync_status`

## Indexes
- `(check_in, check_out, status)` on `bookings`
- `customer_id` on `bookings`
- `spot_id` on `bookings`
- `booking_id` on `crm_sync_log`

## Notes
- Keep legacy fields (`accommodation_type_id`, `guest_data_id`, `start_date`, `end_date`) during compatibility window.
- Use this checklist to build Alembic migration scripts in next step.
