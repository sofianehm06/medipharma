#!/bin/bash
# MediPharma — Script de démarrage Docker (Linux/Mac)
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'

echo -e "${CYAN}========================================"
echo -e "  MediPharma - Gestion Médicaments"
echo -e "========================================${NC}"

# Vérifier .env
if [ ! -f ".env" ]; then
    echo -e "${RED}ERREUR : Fichier .env manquant.${NC}"
    echo "Copiez .env.example en .env et remplissez les valeurs."
    exit 1
fi

case "$1" in
  stop)
    echo "Arrêt des conteneurs..."
    docker compose down
    echo -e "${GREEN}Conteneurs arrêtés.${NC}"
    ;;
  logs)
    docker compose logs -f
    ;;
  build)
    echo "Construction des images..."
    docker compose build --no-cache
    docker compose up -d
    ;;
  reset)
    echo -e "${RED}ATTENTION : Suppression des données MySQL !${NC}"
    read -p "Confirmer ? (oui/non) : " confirm
    [ "$confirm" = "oui" ] && docker compose down -v && echo "Données supprimées."
    ;;
  *)
    echo "Démarrage des services..."
    docker compose up -d

    echo -e "\n${GREEN}Services démarrés !${NC}"
    echo -e "\n  Frontend  : http://localhost:3000"
    echo -e "  Backend   : http://localhost:5000/api/health"
    echo -e "  MySQL     : localhost:3307\n"
    echo "Commandes : stop | logs | build | reset"
    ;;
esac
