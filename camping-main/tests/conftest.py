from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.models as models
from app.db import get_db
from main import app

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_familycamp.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    db.add(models.Spot(name="Test Spot", type="tent", capacity=4, is_active=True))
    db.commit()
    db.close()
    yield


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def booking_payload():
    return {
        "spot_id": 1,
        "check_in": str(date(2026, 6, 10)),
        "check_out": str(date(2026, 6, 12)),
        "guests_count": 2,
        "customer_name": "Ivan Ivanov",
        "customer_phone": "+79990001122",
        "customer_email": "ivan@example.com",
        "comment": "Тестовая заявка",
        "website": "",
    }
