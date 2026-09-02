"""Schémas Pydantic (validation entrée / sérialisation sortie)."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

HEX_COLOR = r"^#[0-9a-fA-F]{6}$"

# Niveaux de priorité d'une tâche (du plus faible au plus fort).
Priority = Literal["low", "medium", "high", "urgent"]


# --- Tags -------------------------------------------------------------------

class TagBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    color: str = Field(default="#64748b", pattern=HEX_COLOR)


class TagCreate(TagBase):
    """Payload pour `POST /tags/` (la couleur est optionnelle)."""

    color: str | None = Field(default=None, pattern=HEX_COLOR)


class TagResponse(TagBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class TagCount(BaseModel):
    """Nombre de tâches portant un tag donné (pour le dashboard)."""

    id: int
    name: str
    color: str
    count: int


# --- Todos ------------------------------------------------------------------

class TodoBase(BaseModel):
    """Champs communs aux opérations de création."""

    title: str = Field(..., min_length=1, max_length=255, description="Titre de la tâche")
    description: str = Field(default="", max_length=2000, description="Description optionnelle")
    priority: Priority = "medium"


class TodoCreate(TodoBase):
    """Payload attendu pour `POST /todos/`."""

    tag_ids: list[int] = Field(default_factory=list)


class TodoUpdate(BaseModel):
    """Payload pour `PUT /todos/{id}` — tous les champs sont optionnels.

    Seuls les champs réellement fournis sont modifiés (mise à jour partielle).
    `tag_ids` remplace l'ensemble des tags de la tâche quand il est fourni.
    """

    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    completed: bool | None = None
    not_done: bool | None = None
    priority: Priority | None = None
    tag_ids: list[int] | None = None


# --- Statistiques ----------------------------------------------------------

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
    tags: list[TagCount]


# --- Réponse Todo ---------------------------------------------------------

class TodoResponse(TodoBase):
    """Représentation renvoyée au client."""

    # `from_attributes=True` : permet de construire le schéma directement
    # depuis un objet ORM SQLAlchemy (`TodoResponse.model_validate(todo)`).
    model_config = ConfigDict(from_attributes=True)

    id: int
    completed: bool
    not_done: bool
    created_at: datetime
    tags: list[TagResponse] = []
