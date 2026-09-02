"""Modèles ORM SQLAlchemy."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


# Table d'association many-to-many entre tâches et tags.
# `ondelete=CASCADE` : supprimer une tâche ou un tag nettoie les liens.
todo_tags = Table(
    "todo_tags",
    Base.metadata,
    Column("todo_id", ForeignKey("todos.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Todo(Base):
    """Une tâche de la todo list."""

    __tablename__ = "todos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)

    description: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")

    # Tâche menée à son terme.
    completed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )

    # Tâche explicitement marquée comme NON réalisée (abandonnée / non faite).
    # Mutuellement exclusif avec `completed` (géré dans la couche crud).
    not_done: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # `lazy="selectin"` : les tags sont chargés en une requête groupée
    # lorsqu'on liste les tâches (évite le problème N+1).
    tags: Mapped[list[Tag]] = relationship(
        secondary=todo_tags,
        back_populates="todos",
        lazy="selectin",
        order_by="Tag.name",
    )


class Tag(Base):
    """Une étiquette réutilisable, associable à plusieurs tâches."""

    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    name: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)

    # Couleur hex (#rrggbb) utilisée pour les puces et le graphe du dashboard.
    color: Mapped[str] = mapped_column(String(9), nullable=False, server_default="#64748b")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    todos: Mapped[list[Todo]] = relationship(
        secondary=todo_tags,
        back_populates="tags",
    )
