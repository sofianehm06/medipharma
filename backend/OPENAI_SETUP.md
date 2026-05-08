# Configuration OpenAI API

## Obtenir une clé API

1. Aller sur https://platform.openai.com/api-keys
2. Créer un compte ou se connecter
3. Cliquer "Create new secret key"
4. Copier la clé (commence par `sk-...`)

## Configurer le projet

Ouvrir `backend/.env` et remplacer :

```
OPENAI_API_KEY=sk-placeholder-replace-with-real-key
```

par votre vraie clé :

```
OPENAI_API_KEY=sk-votre-vraie-clé-ici
```

## Modèle utilisé

Le projet utilise **gpt-4o-mini** (rapport qualité/coût optimal) :
- Coût : ~$0.15 / 1M tokens d'entrée
- Limite : 20 appels/heure par utilisateur (configurable dans `routes/ai.js`)

## Fonctionnalités IA

| Endpoint | Modèle | Usage |
|---|---|---|
| `POST /api/ai/chat` | gpt-4o-mini | Chat MediBot (tous rôles sauf médical) |
| `GET /api/ai/analyse-stock` | gpt-4o-mini | Analyse du stock (admin/pharmacien/stock) |
| `GET /api/ai/suggestion-commande` | gpt-4o-mini | Bons de commande (admin/pharmacien/stock) |

## Sans clé OpenAI

L'application fonctionne normalement sans clé OpenAI.
La page IA affiche un message "Service IA non disponible" au lieu d'une erreur critique.
