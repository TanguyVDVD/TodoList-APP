"""Couche d'accès à la base de données (SQLAlchemy).

Expose :
- `engine`       : moteur de connexion PostgreSQL (pool géré par SQLAlchemy).
- `SessionLocal` : fabrique de sessions.
- `Base`         : classe de base déclarative pour les modèles ORM.
- `get_db()`     : dépendance FastAPI qui fournit une session par requête.
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from .config import settings

# `pool_pre_ping=True` : SQLAlchemy vérifie que la connexion est vivante avant
# de la réutiliser (évite les "server closed the connection unexpectedly"
# après un redémarrage de PostgreSQL).
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    future=True,
)

# `autocommit=False` / `autoflush=False` : comportement transactionnel explicite.
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    future=True,
)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Fournit une session DB par requête puis la referme systématiquement.

    Utilisé comme dépendance FastAPI : `db: Session = Depends(get_db)`.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
