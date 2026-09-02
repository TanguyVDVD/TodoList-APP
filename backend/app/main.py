"""Point d'entrée de l'API FastAPI.

Lancement (dev) : uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
"""

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from . import crud, models, schemas
from .config import settings
from .database import engine, get_db

# --- Création automatique des tables au démarrage -------------------------------
# Suffisant pour le développement. En production, on utiliserait Alembic
# (migrations versionnées) plutôt que `create_all`.
models.Base.metadata.create_all(bind=engine)

# Micro-migration (dev) : `create_all` ne modifie pas une table existante.
# On ajoute la colonne `not_done` si la table `todos` a été créée avant cette
# fonctionnalité. En production, ceci serait une migration Alembic.
with engine.begin() as _conn:
    _conn.execute(
        text(
            "ALTER TABLE todos "
            "ADD COLUMN IF NOT EXISTS not_done BOOLEAN NOT NULL DEFAULT false"
        )
    )

app = FastAPI(
    title="Todo API",
    version="1.0.0",
    description="API CRUD de gestion de tâches (FastAPI + SQLAlchemy + PostgreSQL).",
)

# --- CORS ---------------------------------------------------------------------
# Autorise le front Next.js (http://localhost:3000 par défaut) à appeler l'API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["monitoring"])
def health_check() -> dict[str, str]:
    """Sonde de disponibilité simple."""
    return {"status": "ok"}


# --- Endpoints CRUD ---------------------------------------------------------------

@app.get("/todos/", response_model=list[schemas.TodoResponse], tags=["todos"])
def list_todos(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
) -> list[models.Todo]:
    """Retourne la liste des tâches (pagination optionnelle via `skip`/`limit`)."""
    return crud.get_todos(db, skip=skip, limit=limit)


@app.get("/todos/stats", response_model=schemas.TodoStats, tags=["todos"])
def todo_stats(db: Session = Depends(get_db)) -> dict:
    """Statistiques agrégées pour le tableau de bord (par jour + totaux)."""
    return crud.get_stats(db)


@app.post(
    "/todos/",
    response_model=schemas.TodoResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["todos"],
)
def create_todo(
    payload: schemas.TodoCreate,
    db: Session = Depends(get_db),
) -> models.Todo:
    """Crée une nouvelle tâche."""
    return crud.create_todo(db, payload)


@app.put("/todos/{todo_id}", response_model=schemas.TodoResponse, tags=["todos"])
def update_todo(
    todo_id: int,
    payload: schemas.TodoUpdate,
    db: Session = Depends(get_db),
) -> models.Todo:
    """Met à jour une tâche existante (mise à jour partielle)."""
    todo = crud.update_todo(db, todo_id, payload)
    if todo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tâche {todo_id} introuvable.",
        )
    return todo


@app.delete(
    "/todos/{todo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["todos"],
)
def delete_todo(todo_id: int, db: Session = Depends(get_db)) -> None:
    """Supprime une tâche."""
    if not crud.delete_todo(db, todo_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tâche {todo_id} introuvable.",
        )
