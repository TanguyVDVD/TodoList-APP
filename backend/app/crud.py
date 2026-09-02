"""Opérations CRUD sur le modèle `Todo`.

Cette couche isole la logique d'accès aux données des routes HTTP :
les fonctions reçoivent une `Session` et des schémas Pydantic, et renvoient
des objets ORM (ou `None` / `bool` selon le cas).
"""

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from . import models, schemas


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
    """Crée une nouvelle tâche."""
    todo = models.Todo(**payload.model_dump())
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
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(todo, field, value)

    # Cohérence : une tâche ne peut pas être à la fois "terminée" et "non réalisée".
    if data.get("completed"):
        todo.not_done = False
    if data.get("not_done"):
        todo.completed = False

    db.commit()
    db.refresh(todo)
    return todo


def _status_expr():
    """Expression SQL renvoyant l'état textuel d'une tâche."""
    return case(
        (models.Todo.completed.is_(True), "done"),
        (models.Todo.not_done.is_(True), "failed"),
        else_="pending",
    )


def get_stats(db: Session) -> dict:
    """Agrège le nombre de tâches par jour de création et par état.

    Retourne un dict compatible avec `schemas.TodoStats` :
    - `totals` : total par état
    - `daily`  : une entrée par jour, triée par date croissante
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
    return {"totals": totals, "daily": daily}


def delete_todo(db: Session, todo_id: int) -> bool:
    """Supprime une tâche. Renvoie `False` si elle n'existait pas."""
    todo = get_todo(db, todo_id)
    if todo is None:
        return False

    db.delete(todo)
    db.commit()
    return True
