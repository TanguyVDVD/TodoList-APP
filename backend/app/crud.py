"""Opérations CRUD sur les modèles `Todo` et `Tag`.

Cette couche isole la logique d'accès aux données des routes HTTP :
les fonctions reçoivent une `Session` et des schémas Pydantic, et renvoient
des objets ORM (ou `None` / `bool` selon le cas).
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


# --- Tags -----------------------------------------------------------------

def get_tags(db: Session) -> list[models.Tag]:
    """Liste tous les tags, triés par nom."""
    return list(db.scalars(select(models.Tag).order_by(models.Tag.name)).all())


def get_tag_by_name(db: Session, name: str) -> models.Tag | None:
    return db.scalar(select(models.Tag).where(models.Tag.name == name))


def create_tag(db: Session, payload: schemas.TagCreate) -> models.Tag:
    """Crée un tag. La couleur est attribuée automatiquement si absente."""
    color = payload.color or _TAG_PALETTE[db.scalar(select(func.count(models.Tag.id))) % len(_TAG_PALETTE)]
    tag = models.Tag(name=payload.name, color=color)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


def delete_tag(db: Session, tag_id: int) -> bool:
    """Supprime un tag (et ses associations). `False` si introuvable."""
    tag = db.get(models.Tag, tag_id)
    if tag is None:
        return False
    db.delete(tag)
    db.commit()
    return True


def _resolve_tags(db: Session, tag_ids: list[int]) -> list[models.Tag]:
    """Renvoie les objets Tag correspondant aux ids fournis (ignore les inconnus)."""
    if not tag_ids:
        return []
    stmt = select(models.Tag).where(models.Tag.id.in_(set(tag_ids)))
    return list(db.scalars(stmt).all())


# --- Todos ----------------------------------------------------------------

def get_todos(db: Session, skip: int = 0, limit: int = 100) -> list[models.Todo]:
    """Liste les tâches, les plus récentes d'abord."""
    stmt = (
        select(models.Todo)
        .order_by(models.Todo.created_at.desc(), models.Todo.id.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(db.scalars(stmt).all())


def get_todo(db: Session, todo_id: int) -> models.Todo | None:
    """Récupère une tâche par son id, ou `None` si elle n'existe pas."""
    return db.get(models.Todo, todo_id)


def create_todo(db: Session, payload: schemas.TodoCreate) -> models.Todo:
    """Crée une nouvelle tâche, avec ses tags éventuels."""
    todo = models.Todo(
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        tags=_resolve_tags(db, payload.tag_ids),
    )
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo


def update_todo(
    db: Session, todo_id: int, payload: schemas.TodoUpdate
) -> models.Todo | None:
    """Met à jour partiellement une tâche. Renvoie `None` si introuvable."""
    todo = get_todo(db, todo_id)
    if todo is None:
        return None

    # `exclude_unset=True` : on ne touche qu'aux champs explicitement envoyés.
    data = payload.model_dump(exclude_unset=True, exclude={"tag_ids"})
    for field, value in data.items():
        setattr(todo, field, value)

    # Cohérence : une tâche ne peut pas être à la fois "terminée" et "non réalisée".
    if data.get("completed"):
        todo.not_done = False
    if data.get("not_done"):
        todo.completed = False

    # `tag_ids` fourni -> remplace l'ensemble des tags de la tâche.
    if payload.tag_ids is not None:
        todo.tags = _resolve_tags(db, payload.tag_ids)

    db.commit()
    db.refresh(todo)
    return todo


def delete_todo(db: Session, todo_id: int) -> bool:
    """Supprime une tâche. Renvoie `False` si elle n'existait pas."""
    todo = get_todo(db, todo_id)
    if todo is None:
        return False

    db.delete(todo)
    db.commit()
    return True


# --- Tâches récurrentes ------------------------------------------------

def _interval_delta(unit: str, value: int) -> timedelta:
    if unit == "hour":
        return timedelta(hours=value)
    if unit == "week":
        return timedelta(weeks=value)
    return timedelta(days=value)  # "day" par défaut


def get_recurring_tasks(db: Session) -> list[models.RecurringTask]:
    stmt = select(models.RecurringTask).order_by(
        models.RecurringTask.created_at.desc()
    )
    return list(db.scalars(stmt).all())


def create_recurring_task(
    db: Session, payload: schemas.RecurringTaskCreate
) -> models.RecurringTask:
    """Crée le gabarit et matérialise immédiatement la première occurrence."""
    now = datetime.now(timezone.utc)
    rec = models.RecurringTask(**payload.model_dump(), next_run_at=now)
    db.add(rec)
    db.commit()
    materialize_due_recurring(db)  # crée la 1re tâche tout de suite
    db.refresh(rec)
    return rec


def update_recurring_task(
    db: Session, rec_id: int, payload: schemas.RecurringTaskUpdate
) -> models.RecurringTask | None:
    rec = db.get(models.RecurringTask, rec_id)
    if rec is None:
        return None
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(rec, field, value)
    db.commit()
    db.refresh(rec)
    return rec


def delete_recurring_task(db: Session, rec_id: int) -> bool:
    rec = db.get(models.RecurringTask, rec_id)
    if rec is None:
        return False
    db.delete(rec)
    db.commit()
    return True


def materialize_due_recurring(db: Session) -> int:
    """Crée une `Todo` pour chaque tâche récurrente active arrivée à échéance.

    Une seule tâche est créée par gabarit même si plusieurs périodes ont été
    manquées (on avance simplement `next_run_at` au prochain créneau futur).
    Renvoie le nombre de tâches créées.
    """
    now = datetime.now(timezone.utc)
    due = db.scalars(
        select(models.RecurringTask).where(
            models.RecurringTask.active.is_(True),
            models.RecurringTask.next_run_at <= now,
        )
    ).all()

    created = 0
    for rec in due:
        delta = _interval_delta(rec.unit, rec.value)

        db.add(
            models.Todo(
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


# --- Statistiques -------------------------------------------------------

def _status_expr():
    """Expression SQL renvoyant l'état textuel d'une tâche."""
    return case(
        (models.Todo.completed.is_(True), "done"),
        (models.Todo.not_done.is_(True), "failed"),
        else_="pending",
    )


def get_stats(db: Session) -> dict:
    """Agrège les données du tableau de bord.

    - `totals` : total par état
    - `daily`  : une entrée par jour de création, triée par date croissante
    - `tags`   : nombre de tâches par tag
    """
    day_expr = func.date(models.Todo.created_at)

    stmt = (
        select(
            day_expr.label("day"),
            _status_expr().label("status"),
            func.count(models.Todo.id).label("count"),
        )
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

    # Répartition par tag (inclut les tags à 0 tâche via un LEFT JOIN).
    tag_stmt = (
        select(
            models.Tag.id,
            models.Tag.name,
            models.Tag.color,
            func.count(models.todo_tags.c.todo_id).label("count"),
        )
        .select_from(models.Tag)
        .outerjoin(models.todo_tags, models.todo_tags.c.tag_id == models.Tag.id)
        .group_by(models.Tag.id)
        .order_by(models.Tag.name)
    )
    tags = [
        {"id": tid, "name": name, "color": color, "count": count}
        for tid, name, color, count in db.execute(tag_stmt).all()
    ]

    return {"totals": totals, "daily": daily, "tags": tags}
