# 💊 MediPharma — Application Web de Gestion des Médicaments Hospitaliers

> Projet de fin d'études — Université Abderrahman Mira de Béjaïa | 2025–2026  
> Département Informatique — Faculté des Sciences Exactes

## 👥 Équipe

| Membre | Rôle |
|---|---|
| HAMMAMI Sofiane | Développeur principal / Chef de projet |
| HATTAB Aziz | Architecture & Backend |
| OUMAMMAR Aymene | Frontend & UI/UX |
| KHEFFACHE Reyad | Base de données & SQL |
| KORICHE Syphax | DevOps & CI/CD |
| Dr. FARAH Zoubeyr | Encadrant |

---

## 📋 Description

MediPharma est une application web sécurisée permettant la **gestion et la traçabilité des médicaments** au sein d'un établissement hospitalier. Elle couvre l'ensemble du cycle de vie des médicaments : de la réception au service, en passant par la gestion des stocks et la détection automatique des anomalies.

---

## 🚀 Stack Technique

| Couche | Technologie |
|---|---|
| **Frontend** | React.js 19 + React Router v7 |
| **Backend** | Node.js 20 + Express.js 5 |
| **Base de données** | MySQL 8 (via XAMPP en dev) |
| **Authentification** | JWT + bcryptjs |
| **Intelligence Artificielle** | Google Gemini 2.0 Flash |
| **Conteneurisation** | Docker + docker-compose |
| **CI/CD** | GitHub Actions |
| **Sécurité** | CodeQL + Trivy + OWASP ZAP + Gitleaks |

---

## 🗂️ Architecture du projet

```
medipharma/
│
├── 📁 backend/                    ← API REST Node.js + Express
│   ├── 📁 src/
│   │   ├── 📁 config/
│   │   │   └── db.js              ← Pool de connexions MySQL
│   │   ├── 📁 middleware/
│   │   │   ├── auth.js            ← Vérification token JWT
│   │   │   └── rbac.js            ← Contrôle d'accès par rôle
│   │   ├── 📁 controllers/        ← Logique métier (un par domaine)
│   │   │   ├── authController.js
│   │   │   ├── userController.js
│   │   │   ├── medicationController.js
│   │   │   ├── stockController.js
│   │   │   ├── alertController.js
│   │   │   ├── reportController.js
│   │   │   └── aiController.js
│   │   ├── 📁 routes/             ← Définition des endpoints REST
│   │   │   ├── auth.js
│   │   │   ├── users.js
│   │   │   ├── medications.js
│   │   │   ├── stock.js
│   │   │   ├── alerts.js
│   │   │   ├── reports.js
│   │   │   └── ai.js
│   │   ├── 📁 utils/
│   │   │   └── auditLog.js        ← Journal de traçabilité
│   │   └── app.js                 ← Point d'entrée Express
│   ├── .env.example               ← Template des variables d'environnement
│   ├── Dockerfile                 ← Image Docker multi-stage
│   └── package.json
│
├── 📁 frontend/                   ← SPA React
│   ├── 📁 public/
│   │   └── index.html
│   ├── 📁 src/
│   │   ├── 📁 components/
│   │   │   └── 📁 Layout/
│   │   │       ├── Sidebar.jsx    ← Navigation dynamique par rôle
│   │   │       └── Layout.jsx     ← Wrapper avec polling des alertes
│   │   ├── 📁 context/
│   │   │   └── AuthContext.jsx    ← État global JWT (login/logout/can)
│   │   ├── 📁 pages/              ← Une page par fonctionnalité
│   │   │   ├── LoginPage.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── MedicationsPage.jsx
│   │   │   ├── StockPage.jsx
│   │   │   ├── AlertsPage.jsx
│   │   │   ├── ReportsPage.jsx
│   │   │   ├── UsersPage.jsx
│   │   │   └── AIPage.jsx
│   │   ├── 📁 services/           ← Appels Axios vers l'API
│   │   │   ├── api.js             ← Instance Axios + intercepteurs
│   │   │   ├── medicationService.js
│   │   │   ├── stockService.js
│   │   │   ├── alertService.js
│   │   │   ├── reportService.js
│   │   │   └── userService.js
│   │   ├── App.jsx                ← Routing + guards par rôle
│   │   ├── index.js
│   │   └── index.css              ← Design system CSS (sans framework)
│   ├── nginx.conf                 ← Config Nginx production
│   └── Dockerfile                 ← Build React + Nginx multi-stage
│
├── 📁 database/
│   ├── schema.sql                 ← 6 tables + 2 triggers + données test
│   ├── reset.sql                  ← Réinitialisation dev
│   └── peremption_check.sql       ← Procédure de vérification quotidienne
│
├── 📁 .github/
│   ├── 📁 workflows/
│   │   ├── ci-cd.yml              ← Pipeline CI/CD (lint→test→build→deploy)
│   │   ├── security.yml           ← DevSecOps (SAST+SCA+DAST+secrets)
│   │   └── dependency-update.yml  ← Audit hebdomadaire des dépendances
│   ├── dependabot.yml             ← Mises à jour automatiques
│   └── zap-rules.tsv              ← Règles OWASP ZAP
│
├── 📁 scripts/
│   ├── start.ps1                  ← Démarrage Docker (Windows)
│   └── start.sh                   ← Démarrage Docker (Linux/Mac)
│
├── docker-compose.yml             ← Orchestration 3 services
├── .env.example                   ← Template variables Docker
├── .gitignore
├── .gitattributes
└── README.md
```

---

## 🗃️ Modèle de données

```
users ──────────────────────────────────────────────┐
  id, nom, prenom, email, password_hash              │
  role: admin|pharmacien|responsable_stock|médical   │
  statut: actif|inactif|bloque                       │
                                                     │
medicaments ──────────────────────┐                  │
  id, nom, dosage, principe_actif │                  │
  forme, laboratoire, code_cip    │                  │
  seuil_minimum                   │                  │
                                  │                  │
lots ─────────────────────────────┘                  │
  id, medicament_id (FK)                             │
  numero_lot, date_peremption                        │
  quantite_initiale, quantite_actuelle               │
       │                                             │
       ├──▶ stock_mouvements ────────────────────────┤
       │      type: entree|sortie|retour|destruction  │
       │      quantite, service_destination           │
       │      user_id (FK) ──────────────────────────┘
       │
       └──▶ alertes
              type: rupture|peremption|seuil_critique
              statut: active|traitee|ignoree

audit_logs  (immuable — toutes les actions tracées)
  user_id, action, table_name, details (JSON), ip
```

**2 Triggers automatiques :**
- `trg_after_entree` → met à jour `quantite_actuelle` après chaque mouvement
- `trg_check_seuil` → crée une alerte si le stock passe sous le seuil ou tombe à 0

---

## 🔐 Sécurité & Rôles

| Rôle | Médicaments | Stock | Alertes | Rapports | Utilisateurs | IA |
|---|---|---|---|---|---|---|
| **Administrateur** | CRUD | CRUD | ✓ | ✓ | CRUD | ✓ |
| **Pharmacien** | CRUD | CRUD | ✓ | ✓ | — | ✓ |
| **Resp. de stock** | Lecture | Lecture | ✓ | ✓ | — | ✓ |
| **Personnel médical** | Lecture | — | — | — | — | Chat |

**Mesures de sécurité :**
- Tokens JWT (24h) avec signature HS256
- Mots de passe hashés bcrypt (saltRounds=10)
- Blocage compte après 5 tentatives échouées
- Rate limiting : 100 req/15min global, 10 req/15min sur login, 20 req/h sur IA
- Headers sécurité : Helmet (X-Frame-Options, CSP, HSTS...)
- Journal d'audit complet dans `audit_logs`

---

## 🤖 Fonctionnalités IA (Google Gemini 2.0 Flash)

| Fonctionnalité | Description |
|---|---|
| **MediBot Chat** | Assistant pharmacien — interactions médicaments, dosages, conservation |
| **Analyse de stock** | Rapport IA sur les points critiques et recommandations |
| **Suggestions de commande** | Calcul des quantités à commander basé sur la consommation réelle |

---

## ⚙️ Installation & Démarrage

### Prérequis
- Node.js 20+
- XAMPP (MySQL) ou Docker Desktop
- Git

### Développement local (avec XAMPP)

```bash
# 1. Cloner le projet
git clone https://github.com/sofianehm06/medipharma.git
cd medipharma

# 2. Créer la base de données (XAMPP doit être démarré)
mysql -u root < database/schema.sql

# 3. Configurer le backend
cd backend
cp .env.example .env
# Éditer .env : DB_PASSWORD, JWT_SECRET, GEMINI_API_KEY
npm install
npm run dev      # Démarre sur http://localhost:5000

# 4. Configurer le frontend (nouveau terminal)
cd ../frontend
npm install
npm start        # Démarre sur http://localhost:3000
```

### Production avec Docker

```bash
# 1. Copier et configurer l'environnement
cp .env.example .env
# Éditer .env avec vos mots de passe

# 2. Démarrer tous les services
.\scripts\start.ps1 -Build    # Windows
./scripts/start.sh build      # Linux/Mac

# Frontend  → http://localhost:3000
# API       → http://localhost:5000/api/health
```

---

## 🔑 Comptes de test

| Email | Rôle | Mot de passe |
|---|---|---|
| admin@medipharma.dz | Administrateur | password |
| pharmacien@medipharma.dz | Pharmacien | password |
| stock@medipharma.dz | Resp. de stock | password |
| medical@medipharma.dz | Personnel médical | password |

---

## 📡 API REST — Endpoints principaux

```
POST   /api/auth/login              ← Connexion
GET    /api/auth/me                 ← Profil connecté

GET    /api/medications             ← Liste médicaments
POST   /api/medications             ← Créer médicament
PUT    /api/medications/:id         ← Modifier
DELETE /api/medications/:id         ← Supprimer

GET    /api/stock/etat              ← État global des stocks
GET    /api/stock/lots              ← Liste des lots
POST   /api/stock/lots              ← Nouveau lot (entrée)
GET    /api/stock/mouvements        ← Historique mouvements
POST   /api/stock/mouvements        ← Enregistrer mouvement

GET    /api/alerts                  ← Alertes actives/traitées
PATCH  /api/alerts/:id/traiter      ← Marquer comme traitée

GET    /api/reports/dashboard       ← Statistiques tableau de bord
GET    /api/reports/inventaire      ← Rapport d'inventaire
GET    /api/reports/consommation    ← Rapport de consommation
GET    /api/reports/perimes         ← Lots proches péremption

GET    /api/ai/analyse-stock        ← Analyse IA du stock
POST   /api/ai/chat                 ← Chat MediBot
GET    /api/ai/suggestion-commande  ← Suggestions réapprovisionnement

GET    /api/users                   ← Liste utilisateurs (admin)
POST   /api/users                   ← Créer utilisateur (admin)

GET    /api/health                  ← Healthcheck
```

---

## 🔒 Pipeline DevSecOps (GitHub Actions)

```
Push/PR
  │
  ├── CI/CD Pipeline
  │     ├── lint-backend    (ESLint)
  │     ├── test-backend    (Jest + MySQL)
  │     ├── build-frontend  (React build)
  │     ├── docker-build    (GHCR push)
  │     ├── deploy-staging  (branche develop)
  │     └── deploy-prod     (tag v*.*.*)
  │
  └── DevSecOps Pipeline
        ├── secret-scan     (Gitleaks — clés API exposées)
        ├── sast-codeql     (CodeQL — injections SQL, XSS)
        ├── sca-trivy       (Trivy — CVE dans les dépendances)
        ├── dast-zap        (OWASP ZAP — tests dynamiques)
        └── security-report (rapport consolidé)
```

---

## 📄 Licence

Projet académique — Université Abderrahman Mira de Béjaïa © 2026
