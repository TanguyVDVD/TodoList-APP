"""Opérations CRUD.

Toutes les fonctions de ressources sont **scopées par `user_id`** : un
utilisateur ne peut lire / modifier / supprimer que ses propres données.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from . import models, schemas

# Palette utilisée pour attribuer automatiquement une couleur à un nouveau tag.
_TAG_PALETTE = [
    "#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed",
    "#0891b2", "#db2777", "#65a30d", "#4f46e5", "#ea580c",
]


# --- Utilisateurs -------------------------------------------------------

def get_user_by_email(db: Session, email: str) -> models.User | None:
    return db.scalar(select(models.User).where(models.User.email == email))


def create_user(
    db: Session, *, email: str, name: str, hashed_password: str
) -> models.User:
    user = models.User(email=email, name=name, hashed_password=hashed_password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# --- Tags --------------------------------------------------------------

def get_tags(db: Session, user_id: int) -> list[models.Tag]:
    stmt = (
        select(models.Tag)
        .where(models.Tag.user_id == user_id)
        .order_by(models.Tag.name)
    )
    return list(db.scalars(stmt).all())


def get_tag_by_name(db: Session, user_id: int, name: str) -> models.Tag | None:
    return db.scalar(
        select(models.Tag).where(
            models.Tag.user_id == user_id, models.Tag.name == name
        )
    )


def create_tag(
    db: Session, user_id: int, payload: schemas.TagCreate
) -> models.Tag:
    """Crée un tag pour l'utilisateur. Couleur auto si absente."""
    count = db.scalar(
        select(func.count(models.Tag.id)).where(models.Tag.user_id == user_id)
    )
    color = payload.color or _TAG_PALETTE[count % len(_TAG_PALETTE)]
    tag = models.Tag(user_id=user_id, name=payload.name, color=color)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


def delete_tag(db: Session, user_id: int, tag_id: int) -> bool:
    tag = db.scalar(
        select(models.Tag).where(
            models.Tag.id == tag_id, models.Tag.user_id == user_id
        )
    )
    if tag is None:
        return False
    db.delete(tag)
    db.commit()
    return True


def _resolve_tags(
    db: Session, user_id: int, tag_ids: list[int]
) -> list[models.Tag]:
    """Tags de l'utilisateur correspondant aux ids (ignore inconnus / autrui)."""
    if not tag_ids:
        return []
    stmt = select(models.Tag).where(
        models.Tag.user_id == user_id, models.Tag.id.in_(set(tag_ids))
    )
    return list(db.scalars(stmt).all())


# --- Todos -----------------------------------------------------------

def get_todos(
    db: Session, user_id: int, skip: int = 0, limit: int = 100
) -> list[models.Todo]:
    stmt = (
        select(models.Todo)
        .where(models.Todo.user_id == user_id)
        .order_by(models.Todo.created_at.desc(), models.Todo.id.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(db.scalars(stmt).all())


def get_todo(db: Session, user_id: int, todo_id: int) -> models.Todo | None:
    return db.scalar(
        select(models.Todo).where(
            models.Todo.id == todo_id, models.Todo.user_id == user_id
        )
    )


def create_todo(
    db: Session, user_id: int, payload: schemas.TodoCreate
) -> models.Todo:
    todo = models.Todo(
        user_id=user_id,
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        tags=_resolve_tags(db, user_id, payload.tag_ids),
    )
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo


def update_todo(
    db: Session, user_id: int, todo_id: int, payload: schemas.TodoUpdate
) -> models.Todo | None:
    todo = get_todo(db, user_id, todo_id)
    if todo is None:
        return None

    data = payload.model_dump(exclude_unset=True, exclude={"tag_ids"})
    for field, value in data.items():
        setattr(todo, field, value)

    # Cohérence : une tâche ne peut être à la fois "terminée" et "non réalisée".
    if data.get("completed"):
        todo.not_done = False
    if data.get("not_done"):
        todo.completed = False

    if payload.tag_ids is not None:
        todo.tags = _resolve_tags(db, user_id, payload.tag_ids)

    db.commit()
    db.refresh(todo)
    return todo


def delete_todo(db: Session, user_id: int, todo_id: int) -> bool:
    todo = get_todo(db, user_id, todo_id)
    if todo is None:
        return False
    db.delete(todo)
    db.commit()
    return True


# --- Tâches récurrentes --------------------------------------------

def _interval_delta(unit: str, value: int) -> timedelta:
    if unit == "hour":
        return timedelta(hours=value)
    if unit == "week":
        return timedelta(weeks=value)
    return timedelta(days=value)  # "day" par défaut


def get_recurring_tasks(db: Session, user_id: int) -> list[models.RecurringTask]:
    stmt = (
        select(models.RecurringTask)
        .where(models.RecurringTask.user_id == user_id)
        .order_by(models.RecurringTask.created_at.desc())
    )
    return list(db.scalars(stmt).all())


def get_recurring_task(
    db: Session, user_id: int, rec_id: int
) -> models.RecurringTask | None:
    return db.scalar(
        select(models.RecurringTask).where(
            models.RecurringTask.id == rec_id,
            models.RecurringTask.user_id == user_id,
        )
    )


def create_recurring_task(
    db: Session, user_id: int, payload: schemas.RecurringTaskCreate
) -> models.RecurringTask:
    """Crée le gabarit et matérialise immédiatement la première occurrence."""
    now = datetime.now(timezone.utc)
    rec = models.RecurringTask(
        user_id=user_id, **payload.model_dump(), next_run_at=now
    )
    db.add(rec)
    db.commit()
    materialize_due_recurring(db, user_id)
    db.refresh(rec)
    return rec


def update_recurring_task(
    db: Session, user_id: int, rec_id: int, payload: schemas.RecurringTaskUpdate
) -> models.RecurringTask | None:
    rec = get_recurring_task(db, user_id, rec_id)
    if rec is None:
        return None
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(rec, field, value)
    db.commit()
    db.refresh(rec)
    return rec


def delete_recurring_task(db: Session, user_id: int, rec_id: int) -> bool:
    rec = get_recurring_task(db, user_id, rec_id)
    if rec is None:
        return False
    db.delete(rec)
    db.commit()
    return True


def materialize_due_recurring(db: Session, user_id: int) -> int:
    """Crée une `Todo` par gabarit actif de l'utilisateur arrivé à échéance.

    Une seule tâche est créée par gabarit même si plusieurs périodes ont été
    manquées (`next_run_at` est avancé au prochain créneau futur).
    """
    now = datetime.now(timezone.utc)
    due = db.scalars(
        select(models.RecurringTask).where(
            models.RecurringTask.user_id == user_id,
            models.RecurringTask.active.is_(True),
            models.RecurringTask.next_run_at <= now,
        )
    ).all()

    created = 0
    for rec in due:
        delta = _interval_delta(rec.unit, rec.value)

        db.add(
            models.Todo(
                user_id=user_id,
                title=rec.title,
                description=rec.description,
                priority=rec.priority,
            )
        )
        rec.last_run_at = now

        next_run = rec.next_run_at
        while next_run <= now:
            next_run = next_run + delta
        rec.next_run_at = next_run
        created += 1

    if created:
        db.commit()
    return created


# --- Statistiques ---------------------------------------------------

def _status_expr():
    """Expression SQL renvoyant l'état textuel d'une tâche."""
    return case(
        (models.Todo.completed.is_(True), "done"),
        (models.Todo.not_done.is_(True), "failed"),
        else_="pending",
    )


def get_stats(db: Session, user_id: int) -> dict:
    """Agrège les données du tableau de bord pour un utilisateur."""
    day_expr = func.date(models.Todo.created_at)

    stmt = (
        select(
            day_expr.label("day"),
            _status_expr().label("status"),
            func.count(models.Todo.id).label("count"),
        )
        .where(models.Todo.user_id == user_id)
        .group_by(day_expr, _status_expr())
        .order_by(day_expr)
    )

    totals = {"pending": 0, "done": 0, "failed": 0}
    per_day: dict[str, dict[str, int]] = {}

    for day, status, count in db.execute(stmt).all():
        date_key = day.isoformat()
        bucket = per_day.setdefault(date_key, {"pending": 0, "done": 0, "failed": 0})
        bucket[status] += count
        totals[status] += count

    daily = [
        {"date": date_key, **counts} for date_key, counts in sorted(per_day.items())
    ]

    # Répartition par tag de l'utilisateur (inclut les tags à 0 tâche).
    tag_stmt = (
        select(
            models.Tag.id,
            models.Tag.name,
            models.Tag.color,
            func.count(models.todo_tags.c.todo_id).label("count"),
        )
        .select_from(models.Tag)
        .outerjoin(models.todo_tags, models.todo_tags.c.tag_id == models.Tag.id)
        .where(models.Tag.user_id == user_id)
        .group_by(models.Tag.id)
        .order_by(models.Tag.name)
    )
    tags = [
        {"id": tid, "name": name, "color": color, "count": count}
        for tid, name, color, count in db.execute(tag_stmt).all()
    ]

    return {"totals": totals, "daily": daily, "tags": tags}
