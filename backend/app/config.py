from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Family Camp API"
    api_prefix: str = "/api"
    database_url: str = "postgresql+psycopg://familycamp:familycamp@localhost:5432/familycamp"
    crm_endpoint: str = "https://example-crm.local/api/leads"
    crm_api_key: str = "demo-key"
    admin_username: str = "admin"
    admin_password: str = "admin123"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    token_expire_minutes: int = 600
    request_limit_per_minute: int = 20


settings = Settings()
