"""Authentification : hachage de mot de passe (bcrypt) et JWT (HS256)."""

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from . import models
from .config import settings
from .database import get_db

# `tokenUrl` sert uniquement à la doc Swagger ("Authorize").
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

# bcrypt limite le mot de passe à 72 octets : on tronque proprement.
_MAX_PW_BYTES = 72


def hash_password(password: str) -> str:
    digest = bcrypt.hashpw(password.encode()[:_MAX_PW_BYTES], bcrypt.gensalt())
    return digest.decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode()[:_MAX_PW_BYTES], hashed.encode())
    except ValueError:
        return False


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


_credentials_exc = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Session invalide ou expirée.",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """Dépendance FastAPI : renvoie l'utilisateur du token, sinon 401."""
    if not token:
        raise _credentials_exc
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise _credentials_exc

    user = db.get(models.User, user_id)
    if user is None:
        raise _credentials_exc
    return user
