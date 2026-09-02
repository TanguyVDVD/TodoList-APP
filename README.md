# Todo List — FastAPI + Next.js + PostgreSQL (Docker Compose)

Application de todo list conteneurisée : API REST FastAPI/SQLAlchemy, interface
Next.js (App Router + Tailwind), base PostgreSQL. Hot-reload activé sur le
backend et le frontend.

---

## 1. Arborescence du projet

```
todo-app/
├── .env.example              # Modèle de variables d'environnement
├── .gitignore
├── docker-compose.yml        # Orchestration des 3 services
├── README.md
│
├── backend/
│   ├── .dockerignore
│   ├── Dockerfile            # Image Python 3.11 + Uvicorn --reload
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       ├── config.py         # Lecture des variables d'environnement
│       ├── database.py       # engine, SessionLocal, Base, get_db()
│       ├── models.py         # Modèle SQLAlchemy Todo
│       ├── schemas.py        # TodoCreate / TodoUpdate / TodoResponse
│       ├── crud.py           # Opérations CRUD
│       └── main.py           # App FastAPI + routes + CORS
│
└── frontend/
    ├── .dockerignore
    ├── Dockerfile            # Image Node 20 + next dev
    ├── next.config.mjs
    ├── next-env.d.ts
    ├── package.json
    ├── postcss.config.mjs
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── app/
        ├── globals.css
        ├── layout.tsx
        ├── page.tsx          # Page principale (state + actions)
        ├── lib/
        │   └── api.ts        # Client HTTP typé (NEXT_PUBLIC_API_URL)
        └── components/
            ├── TodoForm.tsx  # Ajout d'une tâche
            ├── TodoList.tsx  # Liste / état vide
            └── TodoItem.tsx  # Ligne : cocher / supprimer
```

> Note : le sujet mentionne parfois `Dockerfile.backend` / `Dockerfile.frontend`.
> On suit ici la convention Docker standard : un `Dockerfile` par service, dans
> son propre dossier.

---

## 2. Prérequis

- Docker Desktop (ou Docker Engine) avec le plugin **Docker Compose v2**
  (`docker compose version` doit répondre).
- Ports libres sur la machine hôte : **3000**, **8000**, **5432**.

---

## 3. Lancement pas à pas

```bash
# 1. Se placer dans le dossier du projet
cd todo-app

# 2. Créer le fichier .env à partir du modèle
cp .env.example .env          # Windows PowerShell : Copy-Item .env.example .env

# 3. (Optionnel) éditer .env pour changer les identifiants PostgreSQL
#    -> si vous modifiez POSTGRES_USER/PASSWORD/DB, adaptez aussi DATABASE_URL

# 4. Construire les images et démarrer les 3 services
docker compose up --build
```

Séquence de démarrage :

1. `db` démarre, le **healthcheck** (`pg_isready`) passe au vert ;
2. `backend` démarre alors (grâce à `depends_on: condition: service_healthy`),
   crée les tables puis expose l'API sur `:8000` ;
3. `frontend` démarre et sert Next.js sur `:3000`.

Pour lancer en arrière-plan : `docker compose up --build -d`
Pour suivre les logs : `docker compose logs -f backend`

---

## 4. Accès

| Service            | URL                                             |
|--------------------|-------------------------------------------------|
| Frontend           | http://localhost:3000                            |
| API (racine/docs)  | http://localhost:8000/docs (Swagger UI)          |
| Healthcheck API    | http://localhost:8000/health                     |
| PostgreSQL         | `localhost:5432` (user/pass/db du `.env`)        |

---

## 5. Tester l'API en ligne de commande

```bash
# Lister
curl http://localhost:8000/todos/

# Créer
curl -X POST http://localhost:8000/todos/ \
  -H "Content-Type: application/json" \
  -d '{"title": "Acheter du pain", "description": "À la boulangerie"}'

# Mettre à jour (marquer comme terminée) — remplacez 1 par l'id réel
curl -X PUT http://localhost:8000/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'

# Supprimer
curl -X DELETE http://localhost:8000/todos/1
```

---

## 6. Vérifier le hot-reload

- **Backend** : modifiez `backend/app/main.py` (ex. le message de `/health`),
  Uvicorn redémarre automatiquement.
- **Frontend** : modifiez `frontend/app/page.tsx`, la page se rafraîchit seule
  (`WATCHPACK_POLLING=true` assure la détection des changements dans le bind mount).

---

## 7. Priorité et étiquettes (deux concepts distincts)

**Priorité** — une seule valeur par tâche : `low` | `medium` | `high` | `urgent`
(colonne `todos.priority`, défaut `medium`). Choisie à la création (pastilles) et
modifiable sur chaque tâche (menu déroulant coloré vert → rouge).

**Étiquettes (tags)** — relation *many-to-many* : 0..N étiquettes par tâche.
- Onglet **Étiquettes** (navbar, « Tags » en anglais) : créer / supprimer
  (nom unique, couleur auto depuis une palette).
- Table d'association `todo_tags`.
  - À la création : cases à cocher dans le formulaire.
  - Sur une tâche existante : bouton « Modifier les étiquettes » (popover).
- Dashboard : camembert **Répartition par étiquette**
  (`GET /todos/stats` → champ `tags`).

API : `GET/POST /tags/`, `DELETE /tags/{id}` ; les endpoints todo acceptent
`priority` et `tag_ids` (POST + PUT, `tag_ids` remplace l'ensemble).

## 8. Internationalisation (FR / EN)

- Bascule via l'icône ⚙️ en bas de la navbar → menu **Langue** (🇫🇷 Français / 🇬🇧 English).
- Choix mémorisé dans `localStorage` (`todo-app.lang`), défaut : français.
- Implémentation légère sans dépendance : contexte React dans
  `frontend/app/lib/i18n.tsx` (dictionnaires `fr` / `en`, hook `useI18n()` →
  `{ lang, locale, setLang, t }`). Pour ajouter une chaîne : une entrée dans
  chaque dictionnaire, puis `t("ma.cle")` dans le composant.

## 9. Commandes utiles

```bash
docker compose down             # Arrêter et supprimer les conteneurs
docker compose down -v          # + supprimer le volume PostgreSQL (reset total)
docker compose restart backend  # Redémarrer un service
docker compose exec db psql -U todo_user -d todo_db   # Console SQL
docker compose build --no-cache # Reconstruire sans cache
```

---

## 10. Dépannage

| Symptôme                                   | Cause probable / solution                                          |
|--------------------------------------------|-------------------------------------------------------------------|
| `backend` : `could not connect to server`  | `db` pas encore prête — le healthcheck gère ça, relancez si besoin |
| Frontend : `Failed to fetch` / erreur CORS | `NEXT_PUBLIC_API_URL` incorrecte ou `CORS_ORIGINS` ne contient pas `http://localhost:3000` |
| Changements frontend non pris en compte    | Vérifiez `WATCHPACK_POLLING=true` dans `docker-compose.yml`        |
| Port déjà utilisé                          | Libérez le port ou changez le mapping `"XXXX:3000"` dans compose   |
| Modif de `requirements.txt`/`package.json` non prise | `docker compose up --build` (rebuild de l'image)          |
```
