# --- Backend FastAPI - image de développement --------------------------------
FROM python:3.11-slim

# - PYTHONDONTWRITEBYTECODE : pas de fichiers .pyc
# - PYTHONUNBUFFERED        : logs envoyés directement vers stdout (utiles en conteneur)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Installation des dépendances en premier pour profiter du cache Docker :
# tant que requirements.txt ne change pas, cette couche est réutilisée.
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Le code est monté en bind-mount par docker-compose en dev (hot-reload),
# mais on le copie tout de même pour que l'image soit utilisable seule.
COPY . .

EXPOSE 8000

# `--reload` : redémarrage automatique à chaque modification du code (dev).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
