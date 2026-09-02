"""Schémas Pydantic (validation entrée / sérialisation sortie)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TodoBase(BaseModel):
    """Champs communs aux opérations de création."""

    title: str = Field(..., min_length=1, max_length=255, description="Titre de la tâche")
    description: str = Field(default="", max_length=2000, description="Description optionnelle")


class TodoCreate(TodoBase):
    """Payload attendu pour `POST /todos/`."""


class TodoUpdate(BaseModel):
    """Payload pour `PUT /todos/{id}` — tous les champs sont optionnels.

    Seuls les champs réellement fournis sont modifiés (mise à jour partielle).
    """

    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    completed: bool | None = None
    not_done: bool | None = None


class StatusTotals(BaseModel):
    """Nombre de tâches par état (toutes dates confondues)."""

    pending: int
    done: int
    failed: int


class DailyStat(BaseModel):
    """Répartition des tâches créées un jour donné, par état."""

    date: str  # "YYYY-MM-DD"
    pending: int
    done: int
    failed: int


class TodoStats(BaseModel):
    """Payload du tableau de bord (`GET /todos/stats`)."""

    totals: StatusTotals
    daily: list[DailyStat]


class TodoResponse(TodoBase):
    """Représentation renvoyée au client."""

    # `from_attributes=True` : permet de construire le schéma directement
    # depuis un objet ORM SQLAlchemy (`TodoResponse.model_validate(todo)`).
    model_config = ConfigDict(from_attributes=True)

    id: int
    completed: bool
    not_done: bool
    created_at: datetime
