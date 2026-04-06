import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models as models
from app.api.router import api_router
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.db import engine


def create_application() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        description=settings.app_description,
        version=settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)
    app.include_router(api_router)
    return app


if settings.auto_create_tables:
    models.Base.metadata.create_all(bind=engine)

app = create_application()


if __name__ == "__main__":
    uvicorn.run("main:app", reload=True)
