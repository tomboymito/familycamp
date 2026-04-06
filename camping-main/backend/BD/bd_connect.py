from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Данные для подключения к вашему MySQL
# ЗАМЕНИТЕ эти значения на ваши реальные данные!
MYSQL_USER = "root"  # обычно 'root' для локального сервера
MYSQL_PASSWORD = "fetish228"  # ваш пароль от MySQL
MYSQL_HOST = "localhost"  # или 127.0.0.1
MYSQL_PORT = "3306"  # стандартный порт MySQL
MYSQL_DATABASE = "camping_BD"  # название вашей базы данных

SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"


engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,  # проверка соединения перед использованием
    echo=True  # показывать SQL запросы в консоли (удобно для отладки)
)

# Создаем фабрику сессий
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Базовый класс для моделей
Base = declarative_base()

# Функция для получения сессии базы данных
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()