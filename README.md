# ImmanuellaOS

Personal life operating system for planning the day, tracking consistency, and reviewing weekly progress.

## Backend Setup

The backend is a Django + Django REST Framework project in `backend/`.

### 1. Create and activate a virtual environment

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 2. Install dependencies

```powershell
pip install -r requirements.txt
```

### 3. Create your environment file

Copy `backend/.env.example` to `backend/.env`.

SQLite is the default local database. You do not need to install or configure PostgreSQL for beginner-friendly local development.

To use PostgreSQL instead, set `DATABASE_URL` in `backend/.env`:

```text
DATABASE_URL=postgres://postgres:postgres@localhost:5432/immanuella_os
```

If `DATABASE_URL` is missing or empty, Django uses SQLite at `backend/db.sqlite3`.

### 4. Run Django migrations

This creates the local SQLite database automatically when using the default setup.

```powershell
python manage.py migrate
```

### 5. Start the backend server

```powershell
python manage.py runserver
```

The backend will run at `http://127.0.0.1:8000/`.

The frontend local dev origin `http://localhost:3000` is already allowed by CORS.
