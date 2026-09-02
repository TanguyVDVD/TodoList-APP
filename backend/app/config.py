"""Configuration centralisée de l'application.

On lit les variables d'environnement une seule fois au démarrage via
pydantic-settings. Toutes les valeurs sensibles proviennent du fichier `.env`
injecté par Docker Compose.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # URL de connexion SQLAlchemy, ex:
    # postgresql://user:password@db:5432/todo_db
    database_url: str = "postgresql://todo_user:todo_password@db:5432/todo_db"

    # Liste d'origines autorisées pour le CORS, séparées par des virgules.
    cors_origins: str = "http://localhost:3000"

    # --- Authentification JWT ---
    # ⚠ À changer en production (variable d'env JWT_SECRET).
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 h

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins_list(self) -> list[str]:
        """Transforme la chaîne CSV en liste exploitable par le middleware CORS."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


# Instance unique réutilisée partout dans l'application.
settings = Settings()
