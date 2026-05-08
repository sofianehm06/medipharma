-- Script de réinitialisation (développement uniquement)
USE medipharma;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE alertes;
TRUNCATE TABLE stock_mouvements;
TRUNCATE TABLE lots;
TRUNCATE TABLE medicaments;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- Réimporter les données
SOURCE schema.sql;
