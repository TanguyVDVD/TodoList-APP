"""Point d'entrée de l'API FastAPI.

Lancement (dev) : uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
"""

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from . import auth, crud, models, schemas
from .config import settings
from .database import engine, get_db

# --- Création automatique des tables au démarrage -----------------------------
# Suffisant pour le développement. En production : Alembic.
models.Base.metadata.create_all(bind=engine)

# --- Micro-migrations (dev) : `create_all` ne modifie pas une table existante.
with engine.begin() as _conn:
    _conn.execute(text(
        "ALTER TABLE todos ADD COLUMN IF NOT EXISTS not_done BOOLEAN NOT NULL DEFAULT false"
    ))
    _conn.execute(text(
        "ALTER TABLE todos ADD COLUMN IF NOT EXISTS priority VARCHAR(10) NOT NULL DEFAULT 'medium'"
    ))
    # Rattachement des ressources à un utilisateur (auth).
    for _table in ("todos", "tags", "recurring_tasks"):
        _conn.execute(text(
            f"ALTER TABLE {_table} ADD COLUMN IF NOT EXISTS user_id INTEGER "
            "REFERENCES users(id) ON DELETE CASCADE"
        ))
    # Le nom d'un tag devient unique PAR utilisateur (et non plus globalement).
    _conn.execute(text("ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_name_key"))
    _conn.execute(text(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_tags_user_name ON tags (user_id, name)"
    ))

app = FastAPI(
    title="Todo API",
    version="1.0.0",
    description="API CRUD multi-utilisateurs (FastAPI + SQLAlchemy + JWT).",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Raccourci : dépendance "utilisateur courant".
CurrentUser = Depends(auth.get_current_user)


@app.get("/health", tags=["monitoring"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}


# --- Authentification --------------------------------------------------------

@app.post(
    "/auth/register",
    response_model=schemas.TokenResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["auth"],
)
def register(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if crud.get_user_by_email(db, email) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un compte existe déjà avec cet email.",
        )
    user = crud.create_user(
        db,
        email=email,
        name=payload.name.strip(),
        hashed_password=auth.hash_password(payload.password),
    )
    return {"access_token": auth.create_access_token(user.id), "user": user}


@app.post("/auth/login", response_model=schemas.TokenResponse, tags=["auth"])
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = crud.get_user_by_email(db, email)
    if user is None or not auth.verify_password(
        payload.password, user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect.",
        )
    return {"access_token": auth.create_access_token(user.id), "user": user}


@app.get("/auth/me", response_model=schemas.UserResponse, tags=["auth"])
def read_me(user: models.User = CurrentUser):
    return user


# --- Todos ------------------------------------------------------------------

@app.get("/todos/", response_model=list[schemas.TodoResponse], tags=["todos"])
def list_todos(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: models.User = CurrentUser,
):
    crud.materialize_due_recurring(db, user.id)
    return crud.get_todos(db, user.id, skip=skip, limit=limit)


@app.get("/todos/stats", response_model=schemas.TodoStats, tags=["todos"])
def todo_stats(db: Session = Depends(get_db), user: models.User = CurrentUser):
    return crud.get_stats(db, user.id)


@app.post(
    "/todos/",
    response_model=schemas.TodoResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["todos"],
)
def create_todo(
    payload: schemas.TodoCreate,
    db: Session = Depends(get_db),
    user: models.User = CurrentUser,
):
    return crud.create_todo(db, user.id, payload)


@app.put("/todos/{todo_id}", response_model=schemas.TodoResponse, tags=["todos"])
def update_todo(
    todo_id: int,
    payload: schemas.TodoUpdate,
    db: Session = Depends(get_db),
    user: models.User = CurrentUser,
):
    todo = crud.update_todo(db, user.id, todo_id, payload)
    if todo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Tâche {todo_id} introuvable.")
    return todo


@app.delete(
    "/todos/{todo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["todos"],
)
def delete_todo(
    todo_id: int,
    db: Session = Depends(get_db),
    user: models.User = CurrentUser,
):
    if not crud.delete_todo(db, user.id, todo_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Tâche {todo_id} introuvable.")


# --- Tags -----------------------------------------------------------------

@app.get("/tags/", response_model=list[schemas.TagResponse], tags=["tags"])
def list_tags(db: Session = Depends(get_db), user: models.User = CurrentUser):
    return crud.get_tags(db, user.id)


@app.post(
    "/tags/",
    response_model=schemas.TagResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["tags"],
)
def create_tag(
    payload: schemas.TagCreate,
    db: Session = Depends(get_db),
    user: models.User = CurrentUser,
):
    if crud.get_tag_by_name(db, user.id, payload.name) is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"L'étiquette « {payload.name} » existe déjà.",
        )
    return crud.create_tag(db, user.id, payload)


@app.delete(
    "/tags/{tag_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["tags"],
)
def delete_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    user: models.User = CurrentUser,
):
    if not crud.delete_tag(db, user.id, tag_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Étiquette {tag_id} introuvable.")


# --- Tâches récurrentes -------------------------------------------------

@app.get(
    "/recurring-tasks/",
    response_model=list[schemas.RecurringTaskResponse],
    tags=["recurring"],
)
def list_recurring_tasks(
    db: Session = Depends(get_db),
    user: models.User = CurrentUser,
):
    crud.materialize_due_recurring(db, user.id)
    return crud.get_recurring_tasks(db, user.id)


@app.post(
    "/recurring-tasks/",
    response_model=schemas.RecurringTaskResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["recurring"],
)
def create_recurring_task(
    payload: schemas.RecurringTaskCreate,
    db: Session = Depends(get_db),
    user: models.User = CurrentUser,
):
    return crud.create_recurring_task(db, user.id, payload)


@app.put(
    "/recurring-tasks/{rec_id}",
    response_model=schemas.RecurringTaskResponse,
    tags=["recurring"],
)
def update_recurring_task(
    rec_id: int,
    payload: schemas.RecurringTaskUpdate,
    db: Session = Depends(get_db),
    user: models.User = CurrentUser,
):
    rec = crud.update_recurring_task(db, user.id, rec_id, payload)
    if rec is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, f"Tâche récurrente {rec_id} introuvable."
        )
    return rec


@app.delete(
    "/recurring-tasks/{rec_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["recurring"],
)
def delete_recurring_task(
    rec_id: int,
    db: Session = Depends(get_db),
    user: models.User = CurrentUser,
):
    if not crud.delete_recurring_task(db, user.id, rec_id):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, f"Tâche récurrente {rec_id} introuvable."
        )
