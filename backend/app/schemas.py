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


class TodoResponse(TodoBase):
    """Représentation renvoyée au client."""

    # `from_attributes=True` : permet de construire le schéma directement
    # depuis un objet ORM SQLAlchemy (`TodoResponse.model_validate(todo)`).
    model_config = ConfigDict(from_attributes=True)

    id: int
    completed: bool
    created_at: datetime
