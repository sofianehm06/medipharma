# ============================================================
#  MediPharma — Script de démarrage Docker (Windows PowerShell)
# ============================================================

param(
    [switch]$Build,
    [switch]$Stop,
    [switch]$Logs,
    [switch]$Reset
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MediPharma - Gestion Médicaments" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Vérifier que .env existe
if (-not (Test-Path "$root\.env")) {
    Write-Host "ERREUR : Fichier .env manquant." -ForegroundColor Red
    Write-Host "Copiez .env.example en .env et remplissez les valeurs." -ForegroundColor Yellow
    exit 1
}

if ($Stop) {
    Write-Host "Arrêt des conteneurs..." -ForegroundColor Yellow
    docker compose -f "$root\docker-compose.yml" down
    Write-Host "Conteneurs arrêtés." -ForegroundColor Green
    exit 0
}

if ($Logs) {
    docker compose -f "$root\docker-compose.yml" logs -f
    exit 0
}

if ($Reset) {
    Write-Host "ATTENTION : Suppression des données MySQL !" -ForegroundColor Red
    $confirm = Read-Host "Confirmer (oui/non)"
    if ($confirm -ne "oui") { exit 0 }
    docker compose -f "$root\docker-compose.yml" down -v
    Write-Host "Données supprimées." -ForegroundColor Yellow
}

if ($Build) {
    Write-Host "Construction des images Docker..." -ForegroundColor Cyan
    docker compose -f "$root\docker-compose.yml" build --no-cache
}

Write-Host "Démarrage des services..." -ForegroundColor Cyan
docker compose -f "$root\docker-compose.yml" --env-file "$root\.env" up -d

Write-Host ""
Write-Host "Services démarrés !" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend  : http://localhost:3000"  -ForegroundColor White
Write-Host "  Backend   : http://localhost:5000/api/health" -ForegroundColor White
Write-Host "  MySQL     : localhost:3307 (depuis l'hôte)" -ForegroundColor White
Write-Host ""
Write-Host "Comptes de test :"
Write-Host "  admin@medipharma.dz     | password"
Write-Host "  pharmacien@medipharma.dz | password"
Write-Host ""
Write-Host "Commandes utiles :"
Write-Host "  .\scripts\start.ps1 -Logs    # voir les logs"
Write-Host "  .\scripts\start.ps1 -Stop    # arrêter"
Write-Host "  .\scripts\start.ps1 -Build   # reconstruire"
