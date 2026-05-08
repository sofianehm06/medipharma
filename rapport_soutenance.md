---
title: "Rapport de Projet — Application Web de Gestion des Médicaments Hospitaliers"
subtitle: "MediPharma — Système de gestion et traçabilité des médicaments"
author:
  - "HAMMAMI Sofiane"
  - "HATTAB Aziz"
  - "OUMAMMAR Aymene"
  - "KHEFFACHE Reyad"
  - "KORICHE Syphax"
date: "Année universitaire 2025–2026"
institution: "Université Abderrahman Mira de Béjaïa"
department: "Département Informatique — Faculté des Sciences Exactes"
supervisor: "Dr. FARAH Zoubeyr"
---

# Rapport de Projet de Fin d'Études

**Titre :** Application Web de Gestion des Médicaments Hospitaliers  
**Projet :** MediPharma  
**Établissement :** Université Abderrahman Mira de Béjaïa  
**Département :** Informatique — Faculté des Sciences Exactes  
**Encadrant :** Dr. FARAH Zoubeyr  
**Année universitaire :** 2025–2026

| Membre | Rôle |
|--------|------|
| HAMMAMI Sofiane | Développeur principal / Chef de projet |
| HATTAB Aziz | Architecture & Backend |
| OUMAMMAR Aymene | Frontend & UI/UX |
| KHEFFACHE Reyad | Base de données & SQL |
| KORICHE Syphax | DevOps & CI/CD |

---

## Résumé

MediPharma est une application web sécurisée dédiée à la gestion et à la traçabilité des médicaments au sein d'un établissement hospitalier. Elle répond aux exigences de traçabilité complète imposées par les bonnes pratiques pharmaceutiques, en couvrant l'ensemble du cycle de vie des médicaments : de la réception en pharmacie jusqu'à la dispensation aux services de soins.

L'application implémente une architecture moderne à trois niveaux (frontend React 19, backend Node.js/Express 5, base de données MySQL 8), sécurisée par JWT et un contrôle d'accès par rôle (RBAC) sur quatre profils utilisateur. Elle intègre également un assistant intelligent basé sur l'API Google Gemini 2.0, un pipeline CI/CD complet sur GitHub Actions, et une chaîne DevSecOps (SAST, SCA, DAST) conforme aux exigences de sécurité modernes.

**Mots-clés :** gestion hospitalière, traçabilité, React, Node.js, JWT, RBAC, DevSecOps, CI/CD, IA générative

---

## Abstract

MediPharma is a secure web application dedicated to the management and traceability of medications within a hospital setting. It covers the entire medication lifecycle — from reception to dispensation — while enforcing full audit logging as required by pharmaceutical good practices.

The system is built on a modern three-tier architecture (React 19 frontend, Node.js/Express 5 backend, MySQL 8 database), secured with JWT authentication and role-based access control across four user profiles. It also integrates an AI assistant powered by Google Gemini 2.0, a full CI/CD pipeline on GitHub Actions, and a DevSecOps chain (SAST, SCA, DAST) meeting modern security standards.

**Keywords:** hospital management, drug traceability, React, Node.js, JWT, RBAC, DevSecOps, CI/CD, generative AI

---

## 1. Introduction

### 1.1 Contexte

La gestion des médicaments dans les établissements hospitaliers représente un enjeu critique de sécurité sanitaire. Les erreurs de gestion des stocks — ruptures de médicaments essentiels, dispensation de lots périmés, absence de traçabilité — peuvent avoir des conséquences directes sur la santé des patients.

Dans ce contexte, le présent projet vise à concevoir et développer une application web permettant de :
- Assurer la **traçabilité complète** de chaque médicament, du lot à la dispensation
- Prévenir les **ruptures de stock** par un système d'alertes automatiques
- Détecter et signaler les **lots proches de la péremption**
- Fournir des **rapports et analyses** pour la prise de décision
- Offrir un **assistant IA** pour accompagner le personnel pharmaceutique

### 1.2 Objectifs

| Objectif | Description |
|----------|-------------|
| UC01 | Authentification sécurisée avec contrôle d'accès par rôle |
| UC02 | Gestion du catalogue médicaments (CRUD + code CIP) |
| UC03 | Gestion des lots et entrées en stock |
| UC04 | Enregistrement des sorties et mouvements |
| UC05 | Tableau de bord avec statistiques en temps réel |
| UC06 | Système d'alertes automatiques (seuil, péremption, rupture) |
| UC07 | Rapports d'inventaire et de consommation |
| UC08 | Gestion des utilisateurs (admin) |
| UC09 | Assistant IA MediBot |
| UC10 | Analyse IA du stock |
| UC11 | Suggestions de commande IA |

---

## 2. Analyse des Besoins

### 2.1 Acteurs du système

Le système distingue quatre profils utilisateur, chacun avec des droits spécifiques :

| Acteur | Droits |
|--------|--------|
| **Administrateur** | Accès complet — gestion des utilisateurs, médicaments, stocks, rapports, IA |
| **Pharmacien** | Gestion médicaments et stocks, rapports, IA complète |
| **Responsable de stock** | Lecture stocks et médicaments, rapports, alertes, IA analyse |
| **Personnel médical** | Lecture médicaments uniquement, accès MediBot chat |

### 2.2 Exigences fonctionnelles

**Authentification et sécurité (UC01) :**
- Connexion par email/mot de passe avec hachage bcrypt (saltRounds=10)
- Token JWT avec expiration 24h
- Blocage automatique après 5 tentatives échouées
- Journal d'audit de toutes les actions

**Gestion des médicaments (UC02) :**
- Catalogue avec code CIP unique, principe actif, forme, laboratoire, seuil minimum
- Recherche par nom, principe actif, forme pharmaceutique
- Historique complet des lots associés

**Gestion du stock (UC03–UC04) :**
- Création de lots avec numéro, date de péremption, emplacement
- Mouvements typés : entrée, sortie, retour, destruction
- Mise à jour automatique des quantités via triggers SQL
- Validation de la disponibilité avant chaque sortie

**Alertes (UC06) :**
- Détection automatique de rupture (quantité = 0)
- Alerte seuil critique (stock < seuil_minimum)
- Notification péremption (lot < 30 jours)
- Statuts : active / traitée / ignorée

### 2.3 Exigences non-fonctionnelles

| Exigence | Spécification |
|----------|---------------|
| **Sécurité** | HTTPS, JWT, RBAC, rate limiting, Helmet CSP |
| **Performance** | Pool MySQL 10 connexions, pagination, index DB |
| **Traçabilité** | 100% des actions enregistrées dans audit_logs |
| **Disponibilité** | Healthcheck Docker, auto-restart, monitoring |
| **Maintenabilité** | Tests automatisés 28/28, couverture > 50% |

---

## 3. Architecture Technique

### 3.1 Vue d'ensemble

L'application suit une architecture **3-tiers** classique avec séparation stricte des responsabilités :

```
┌─────────────────────────────────────────────────────┐
│                  NAVIGATEUR WEB                      │
│  React 19 SPA — localhost:3000                      │
│  React Router v7 | Axios | Recharts | Lucide        │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP/REST + JWT
┌──────────────────────▼──────────────────────────────┐
│                  API REST                            │
│  Node.js 20 + Express 5 — localhost:5000            │
│  7 routes | 8 contrôleurs | 2 middlewares           │
│  Rate limiting | Helmet | CORS | Morgan             │
└──────────────────────┬──────────────────────────────┘
                       │ mysql2/promise
┌──────────────────────▼──────────────────────────────┐
│                  BASE DE DONNÉES                     │
│  MySQL 8 — localhost:3306                           │
│  6 tables | 2 triggers | Journal d'audit            │
└─────────────────────────────────────────────────────┘
```

### 3.2 Structure de la base de données

La base de données comprend 6 tables relationnelles :

| Table | Rôle | Clés |
|-------|------|------|
| `users` | Comptes utilisateurs avec rôles | PK: id |
| `medicaments` | Catalogue des médicaments | PK: id, UK: code_cip |
| `lots` | Lots physiques en stock | PK: id, FK: medicament_id |
| `stock_mouvements` | Historique des entrées/sorties | PK: id, FK: lot_id, user_id |
| `alertes` | Alertes générées automatiquement | PK: id, FK: medicament_id |
| `audit_logs` | Journal d'audit immuable | PK: id, FK: user_id |

**Triggers automatiques :**
- `trg_after_entree` : met à jour `quantite_actuelle` après chaque mouvement de stock
- `trg_check_seuil` : crée une alerte si le stock franchit le seuil critique ou tombe à 0

### 3.3 Architecture de sécurité

```
Requête entrante
      │
      ▼
[Helmet] ─── Headers sécurité (CSP, X-Frame, HSTS)
      │
      ▼
[Rate Limiter] ─── 100 req/15min global | 10/15min login | 20/h IA
      │
      ▼
[auth.js] ─── Vérification JWT (401 si absent/invalide/expiré)
      │
      ▼
[rbac.js] ─── Vérification du rôle (403 si non autorisé)
      │
      ▼
[Controller] ─── Logique métier + validation
      │
      ▼
[auditLog] ─── Enregistrement dans audit_logs
      │
      ▼
[Réponse JSON]
```

---

## 4. Implémentation

### 4.1 Backend — Node.js / Express 5

Le backend expose **21 endpoints REST** organisés en 7 modules :

| Module | Endpoints | Auth requise | Rôles |
|--------|-----------|--------------|-------|
| `/api/auth` | login, me, changePassword | Partiel | Tous |
| `/api/medications` | CRUD + search | Oui | Variable |
| `/api/stock` | lots, mouvements, état | Oui | Sauf médical |
| `/api/alerts` | list, count, traiter, ignorer | Oui | Sauf médical |
| `/api/reports` | dashboard, inventaire, consommation, périmés | Oui | Sauf médical |
| `/api/users` | CRUD | Oui | Admin seul |
| `/api/ai` | chat, analyse, suggestion | Oui | Variable |

**Choix techniques notables :**
- **Express 5** : gestion automatique des erreurs async (plus de try/catch obligatoire)
- **mysql2/promise** : pool de connexions (10 max) avec requêtes paramétrées (protection injection SQL)
- **bcryptjs** : hachage des mots de passe avec 10 tours de salage
- **JWT** (jsonwebtoken) : tokens signés HS256, expiration configurable

### 4.2 Frontend — React 19

Le frontend est une **Single Page Application** structurée en 8 pages :

| Page | Fonctionnalité | Rôles autorisés |
|------|---------------|-----------------|
| LoginPage | Authentification | Tous |
| Dashboard | Statistiques + graphique | Tous |
| MedicationsPage | Catalogue médicaments | Tous (CRUD selon rôle) |
| StockPage | Lots et mouvements | Sauf médical |
| AlertsPage | Gestion des alertes | Sauf médical |
| ReportsPage | Rapports multi-onglets | Sauf médical |
| UsersPage | Gestion utilisateurs | Admin seul |
| AIPage | MediBot + analyses IA | Selon endpoint |

**Choix techniques notables :**
- **React 19** avec hooks uniquement (useState, useEffect, useContext)
- **AuthContext** : état JWT global partagé — login/logout/can() dans toute l'app
- **Axios** avec intercepteurs : injection automatique du Bearer token, redirection 401
- **React Router v7** : routes protégées par `PrivateRoute` avec vérification de rôle
- **Recharts** : graphiques de consommation (BarChart responsive)
- **CSS Variables** : design system sans framework externe (100% custom)

### 4.3 Intelligence Artificielle — Google Gemini 2.0

Trois fonctionnalités IA sont intégrées via l'API Google Gemini 2.0 Flash :

| Fonctionnalité | Endpoint | Prompt |
|---------------|----------|--------|
| **MediBot Chat** | `POST /api/ai/chat` | Contexte pharmacien hospitalier, réponses en français |
| **Analyse de stock** | `GET /api/ai/analyse-stock` | Données réelles MySQL → synthèse critique |
| **Suggestions de commande** | `GET /api/ai/suggestion-commande` | Consommation 30 jours → quantités recommandées |

Le modèle `gemini-2.0-flash` a été retenu pour :
- Son **tier gratuit** (1 500 requêtes/jour)
- Sa **rapidité** (temps de réponse < 2s)
- Sa **qualité** en français médical

---

## 5. DevSecOps & CI/CD

### 5.1 Pipeline CI/CD (GitHub Actions)

Le pipeline se déclenche à chaque push sur `main` ou `develop` :

```
Push → main/develop
         │
    ┌────┴─────────────────────────────────────┐
    │          CI/CD Pipeline                  │
    │                                          │
    │  lint-backend                            │
    │       └─▶ test-backend (Jest + MySQL)    │
    │                 └─▶ build-frontend       │
    │                           └─▶ docker     │
    │                                 └─▶ deploy│
    └──────────────────────────────────────────┘
```

**Résultats :**
- 28 tests Jest — 4 suites (auth, medications, stock, RBAC)
- Couverture : 55% lignes, 40% fonctions
- Build React production : 207 kB (gzippé)
- Images Docker poussées sur GitHub Container Registry (GHCR)

### 5.2 Pipeline DevSecOps

Cinq analyses de sécurité automatisées à chaque push :

| Job | Outil | Objectif | Résultat |
|-----|-------|----------|---------|
| **Secret Scanning** | Gitleaks | Clés API, tokens dans le code | ✅ 0 secret |
| **SAST** | CodeQL | Injections SQL, XSS, failles statiques | ✅ Aucune vulnérabilité |
| **SCA** | Trivy | CVE dans les dépendances npm | ✅ 0 critique/haute |
| **DAST** | OWASP ZAP | Attaque dynamique de l'API live | ✅ Scan baseline passé |
| **Rapport** | GitHub Summary | Synthèse consolidée | ✅ Automatique |

### 5.3 Containerisation Docker

```yaml
# 3 services orchestrés
mysql:8.0   → port 3307 (évite conflit XAMPP)
backend     → port 5000 (image multi-stage, utilisateur non-root)
frontend    → port 3000 (React build + Nginx 1.25)
```

**Mesures de sécurité Docker :**
- Image backend basée sur `node:20-alpine` (surface d'attaque minimale)
- Utilisateur `appuser` (UID 1001) — pas de root dans les conteneurs
- Healthchecks sur chaque service
- Réseau interne isolé (`medipharma-net`)

---

## 6. Tests et Validation

### 6.1 Stratégie de test

Les tests sont organisés en 4 suites Jest couvrant les scénarios critiques :

| Suite | Tests | Couverture |
|-------|-------|------------|
| `auth.test.js` | 7 | Login, JWT, validation, health |
| `medications.test.js` | 6 | CRUD, RBAC, recherche |
| `stock.test.js` | 4 | État, lots, validation quantités |
| `rbac.test.js` | 11 | Toutes les combinaisons rôle/endpoint |
| **Total** | **28** | **55% lignes** |

### 6.2 Exemples de cas testés

**Test RBAC — Cloisonnement des rôles :**
```
admin        → GET /api/users       → 200 ✅
pharmacien   → GET /api/users       → 403 ✅
médical      → GET /api/users       → 403 ✅
médical      → GET /api/stock/etat  → 403 ✅
stock        → GET /api/stock/etat  → 200 ✅
```

**Test Stock — Validation métier :**
```
POST /api/stock/mouvements { quantite: 999999 } → 400 (insuffisante) ✅
POST /api/stock/mouvements { type: "invalide" } → 400 ✅
```

### 6.3 Résultats

```
Test Suites : 4 passed, 4 total
Tests       : 28 passed, 28 total
Durée       : 4.5 secondes
Couverture  : lignes 55%, fonctions 40%
```

---

## 7. Déploiement

### 7.1 Architecture de déploiement

```
Développeur
    │
    │ git push
    ▼
GitHub Repository
    │
    ├── CI/CD Pipeline (tests + build)
    │
    ├── Security Pipeline (SAST + SCA + DAST)
    │
    └── Push → develop ──▶ Deploy Staging (SSH automatique)
        Tag  → v*.*.* ──▶ Deploy Production (SSH + approbation)
```

### 7.2 Variables d'environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DB_HOST` | Hôte MySQL | `localhost` |
| `DB_NAME` | Nom de la base | `medipharma` |
| `JWT_SECRET` | Clé de signature JWT | `secret_64_chars_min` |
| `GEMINI_API_KEY` | Clé API Google Gemini | `AIza...` |
| `FRONTEND_URL` | URL CORS autorisée | `http://localhost:3000` |

---

## 8. Conclusion

### 8.1 Bilan

Le projet MediPharma atteint l'ensemble des objectifs fixés dans le cahier des charges :

| Objectif | Statut |
|----------|--------|
| 11 cas d'utilisation implémentés | ✅ |
| 4 rôles avec RBAC strict | ✅ |
| Traçabilité complète (audit_logs) | ✅ |
| Alertes automatiques (triggers SQL) | ✅ |
| Intelligence artificielle (Gemini) | ✅ |
| Tests automatisés (28/28) | ✅ |
| Pipeline CI/CD (GitHub Actions) | ✅ |
| Sécurité DevSecOps (4 outils) | ✅ |
| Containerisation Docker | ✅ |

### 8.2 Points forts

- **Sécurité en profondeur** : JWT + RBAC + audit + rate limiting + DevSecOps
- **Stack moderne** : React 19, Express 5, Gemini 2.0 — versions les plus récentes
- **Qualité du code** : 28 tests automatisés, couverture > 50%, pipeline CI bloquant
- **Zéro coût** : toutes les technologies utilisées sont open-source ou freemium

### 8.3 Perspectives d'évolution

- Migration vers PostgreSQL pour compatibilité Render.com (hébergement cloud gratuit)
- Application mobile React Native utilisant la même API REST
- Intégration HL7/FHIR pour interopérabilité avec les SIH hospitaliers
- Tableau de bord analytique avancé avec prédiction de consommation (ML)

---

## Annexes

### Annexe A — Comptes de test

| Email | Rôle | Mot de passe |
|-------|------|-------------|
| admin@medipharma.dz | Administrateur | password |
| pharmacien@medipharma.dz | Pharmacien | password |
| stock@medipharma.dz | Resp. de stock | password |
| medical@medipharma.dz | Personnel médical | password |

### Annexe B — Endpoints API complets

```
Authentification
  POST   /api/auth/login
  GET    /api/auth/me
  PUT    /api/auth/change-password

Médicaments
  GET    /api/medications          (search, forme)
  POST   /api/medications
  GET    /api/medications/:id
  PUT    /api/medications/:id
  DELETE /api/medications/:id

Stock
  GET    /api/stock/etat
  GET    /api/stock/lots           (expire_soon)
  POST   /api/stock/lots
  GET    /api/stock/mouvements     (lot_id, type)
  POST   /api/stock/mouvements

Alertes
  GET    /api/alerts               (statut, type)
  GET    /api/alerts/count
  PATCH  /api/alerts/:id/traiter
  PATCH  /api/alerts/:id/ignorer

Rapports
  GET    /api/reports/dashboard
  GET    /api/reports/inventaire
  GET    /api/reports/consommation (debut, fin)
  GET    /api/reports/perimes

Intelligence Artificielle
  POST   /api/ai/chat
  GET    /api/ai/analyse-stock
  GET    /api/ai/suggestion-commande

Utilisateurs (admin)
  GET    /api/users
  POST   /api/users
  GET    /api/users/:id
  PUT    /api/users/:id
  DELETE /api/users/:id

Système
  GET    /api/health
```

### Annexe C — Dépendances principales

**Backend :**

| Package | Version | Rôle |
|---------|---------|------|
| express | 5.2.1 | Framework HTTP |
| mysql2 | 3.6.1 | Connecteur MySQL |
| jsonwebtoken | 9.0.2 | Tokens JWT |
| bcryptjs | 3.0.3 | Hachage mots de passe |
| @google/generative-ai | 0.24.1 | SDK Gemini |
| helmet | 8.1.0 | Headers sécurité |

**Frontend :**

| Package | Version | Rôle |
|---------|---------|------|
| react | 19.2.6 | Framework UI |
| react-router-dom | 7.15.0 | Routing SPA |
| axios | 1.6.2 | Client HTTP |
| recharts | 3.8.1 | Graphiques |
| lucide-react | 1.14.0 | Icônes |

---

*Rapport généré le : Mai 2026*  
*Dépôt GitHub : https://github.com/sofianehm06/medipharma*  
*Université Abderrahman Mira de Béjaïa © 2026*
