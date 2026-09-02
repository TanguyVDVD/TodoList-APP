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
    _conn.execute(
        text(
            "ALTER TABLE todos "
            "ADD COLUMN IF NOT EXISTS priority VARCHAR(10) NOT NULL DEFAULT 'medium'"
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
    # Génère au passage les tâches récurrentes arrivées à échéance.
    crud.materialize_due_recurring(db)
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


# --- Endpoints Tags -------------------------------------------------------------

@app.get("/tags/", response_model=list[schemas.TagResponse], tags=["tags"])
def list_tags(db: Session = Depends(get_db)) -> list[models.Tag]:
    """Liste tous les tags."""
    return crud.get_tags(db)


@app.post(
    "/tags/",
    response_model=schemas.TagResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["tags"],
)
def create_tag(
    payload: schemas.TagCreate,
    db: Session = Depends(get_db),
) -> models.Tag:
    """Crée un tag. Le nom doit être unique."""
    if crud.get_tag_by_name(db, payload.name) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Le tag « {payload.name} » existe déjà.",
        )
    return crud.create_tag(db, payload)


@app.delete(
    "/tags/{tag_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["tags"],
)
def delete_tag(tag_id: int, db: Session = Depends(get_db)) -> None:
    """Supprime un tag et retire son association de toutes les tâches."""
    if not crud.delete_tag(db, tag_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tag {tag_id} introuvable.",
        )


# --- Endpoints Tâches récurrentes ---------------------------------------------

@app.get(
    "/recurring-tasks/",
    response_model=list[schemas.RecurringTaskResponse],
    tags=["recurring"],
)
def list_recurring_tasks(
    db: Session = Depends(get_db),
) -> list[models.RecurringTask]:
    """Liste les gabarits de tâches récurrentes."""
    crud.materialize_due_recurring(db)
    return crud.get_recurring_tasks(db)


@app.post(
    "/recurring-tasks/",
    response_model=schemas.RecurringTaskResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["recurring"],
)
def create_recurring_task(
    payload: schemas.RecurringTaskCreate,
    db: Session = Depends(get_db),
) -> models.RecurringTask:
    """Crée un gabarit récurrent (et sa première tâche immédiatement)."""
    return crud.create_recurring_task(db, payload)


@app.put(
    "/recurring-tasks/{rec_id}",
    response_model=schemas.RecurringTaskResponse,
    tags=["recurring"],
)
def update_recurring_task(
    rec_id: int,
    payload: schemas.RecurringTaskUpdate,
    db: Session = Depends(get_db),
) -> models.RecurringTask:
    """Met à jour un gabarit (intervalle, priorité, activation…)."""
    rec = crud.update_recurring_task(db, rec_id, payload)
    if rec is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tâche récurrente {rec_id} introuvable.",
        )
    return rec


@app.delete(
    "/recurring-tasks/{rec_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["recurring"],
)
def delete_recurring_task(rec_id: int, db: Session = Depends(get_db)) -> None:
    """Supprime un gabarit récurrent (les tâches déjà créées sont conservées)."""
    if not crud.delete_recurring_task(db, rec_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tâche récurrente {rec_id} introuvable.",
        )
