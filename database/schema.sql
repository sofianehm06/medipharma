-- ============================================================
--  MediPharma — Schéma de base de données
--  Application Web de Gestion des Médicaments Hospitaliers
--  Université Abderrahman Mira - Béjaïa | 2025-2026
-- ============================================================

CREATE DATABASE IF NOT EXISTS medipharma
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE medipharma;

-- ============================================================
-- TABLE 1 : users
-- Stocke les comptes du personnel hospitalier
-- Rôles : admin | pharmacien | responsable_stock | personnel_medical
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  nom           VARCHAR(100)    NOT NULL,
  prenom        VARCHAR(100)    NOT NULL,
  email         VARCHAR(255)    NOT NULL,
  password_hash VARCHAR(255)    NOT NULL,
  role          ENUM('admin','pharmacien','responsable_stock','personnel_medical')
                                NOT NULL DEFAULT 'personnel_medical',
  statut        ENUM('actif','inactif','bloque')
                                NOT NULL DEFAULT 'actif',
  tentatives    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  derniere_connexion DATETIME   NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_email (email),
  INDEX idx_role (role),
  INDEX idx_statut (statut)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 2 : medicaments
-- Catalogue des médicaments référencés
-- ============================================================
CREATE TABLE IF NOT EXISTS medicaments (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nom             VARCHAR(200)  NOT NULL,
  dosage          VARCHAR(100)  NOT NULL,
  principe_actif  VARCHAR(200)  NOT NULL,
  forme           ENUM('comprimé','gélule','sirop','injectable','pommade','patch','autre')
                                NOT NULL DEFAULT 'comprimé',
  laboratoire     VARCHAR(150)  NOT NULL,
  code_cip        VARCHAR(20)   NULL COMMENT 'Code CIP à 13 chiffres',
  seuil_minimum   INT UNSIGNED  NOT NULL DEFAULT 10 COMMENT 'Quantité minimale avant alerte',
  description     TEXT          NULL,
  created_by      INT UNSIGNED  NOT NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_code_cip (code_cip),
  INDEX idx_nom (nom),
  INDEX idx_principe_actif (principe_actif),
  FOREIGN KEY fk_med_user (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 3 : lots
-- Chaque lot correspond à une livraison d'un médicament
-- avec son propre numéro et sa date de péremption
-- ============================================================
CREATE TABLE IF NOT EXISTS lots (
  id               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  medicament_id    INT UNSIGNED  NOT NULL,
  numero_lot       VARCHAR(50)   NOT NULL,
  date_fabrication DATE          NULL,
  date_peremption  DATE          NOT NULL,
  quantite_initiale INT UNSIGNED NOT NULL,
  quantite_actuelle INT UNSIGNED NOT NULL,
  emplacement      VARCHAR(100)  NULL COMMENT 'Localisation physique en pharmacie',
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_lot_med (medicament_id, numero_lot),
  INDEX idx_peremption (date_peremption),
  INDEX idx_quantite (quantite_actuelle),
  FOREIGN KEY fk_lot_med (medicament_id) REFERENCES medicaments(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 4 : stock_mouvements
-- Trace chaque entrée, sortie, retour ou destruction
-- UC04 : entrées | UC05 : sorties
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_mouvements (
  id                  INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  lot_id              INT UNSIGNED  NOT NULL,
  type_mouvement      ENUM('entree','sortie','retour','destruction')
                                    NOT NULL,
  quantite            INT UNSIGNED  NOT NULL,
  service_destination VARCHAR(150)  NULL COMMENT 'Service hospitalier concerné',
  bon_livraison       VARCHAR(100)  NULL COMMENT 'Numéro de bon de livraison',
  motif               VARCHAR(255)  NULL COMMENT 'Motif de destruction ou retour',
  user_id             INT UNSIGNED  NOT NULL,
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_lot (lot_id),
  INDEX idx_type (type_mouvement),
  INDEX idx_date (created_at),
  INDEX idx_user (user_id),
  FOREIGN KEY fk_mouv_lot  (lot_id)   REFERENCES lots(id)  ON DELETE RESTRICT,
  FOREIGN KEY fk_mouv_user (user_id)  REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 5 : alertes
-- Générées automatiquement : rupture de stock ou péremption
-- UC08 : seuils | UC06 : péremption | UC11 : consultation
-- ============================================================
CREATE TABLE IF NOT EXISTS alertes (
  id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  type_alerte  ENUM('rupture','peremption','seuil_critique')
                             NOT NULL,
  lot_id       INT UNSIGNED  NOT NULL,
  message      VARCHAR(500)  NOT NULL,
  statut       ENUM('active','traitee','ignoree')
                             NOT NULL DEFAULT 'active',
  traite_par   INT UNSIGNED  NULL,
  traite_le    DATETIME      NULL,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_statut (statut),
  INDEX idx_type   (type_alerte),
  FOREIGN KEY fk_alert_lot  (lot_id)     REFERENCES lots(id)  ON DELETE CASCADE,
  FOREIGN KEY fk_alert_user (traite_par) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 6 : audit_logs
-- Journal immuable de toutes les actions (traçabilité)
-- UC01 : connexion | toutes modifications
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED    NULL COMMENT 'NULL si action système',
  action      VARCHAR(100)    NOT NULL COMMENT 'ex: LOGIN, CREATE_MED, DELETE_USER',
  table_name  VARCHAR(64)     NULL,
  record_id   INT UNSIGNED    NULL,
  details     JSON            NULL COMMENT 'Données avant/après modification',
  ip_address  VARCHAR(45)     NULL COMMENT 'IPv4 ou IPv6',
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_user   (user_id),
  INDEX idx_action (action),
  INDEX idx_date   (created_at),
  FOREIGN KEY fk_log_user (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- TRIGGERS : mise à jour automatique du stock
-- ============================================================

DELIMITER $$

-- Après une entrée de stock : incrémente quantite_actuelle
CREATE TRIGGER trg_after_entree
AFTER INSERT ON stock_mouvements
FOR EACH ROW
BEGIN
  IF NEW.type_mouvement = 'entree' OR NEW.type_mouvement = 'retour' THEN
    UPDATE lots
    SET quantite_actuelle = quantite_actuelle + NEW.quantite,
        updated_at = NOW()
    WHERE id = NEW.lot_id;
  END IF;

  IF NEW.type_mouvement = 'sortie' OR NEW.type_mouvement = 'destruction' THEN
    UPDATE lots
    SET quantite_actuelle = GREATEST(0, quantite_actuelle - NEW.quantite),
        updated_at = NOW()
    WHERE id = NEW.lot_id;
  END IF;
END$$

-- Après mise à jour du stock : créer une alerte si seuil atteint
CREATE TRIGGER trg_check_seuil
AFTER UPDATE ON lots
FOR EACH ROW
BEGIN
  DECLARE v_seuil INT;
  DECLARE v_nom   VARCHAR(200);

  SELECT seuil_minimum, nom
  INTO v_seuil, v_nom
  FROM medicaments
  WHERE id = NEW.medicament_id;

  IF NEW.quantite_actuelle <= v_seuil AND OLD.quantite_actuelle > v_seuil THEN
    INSERT INTO alertes (type_alerte, lot_id, message)
    VALUES (
      'seuil_critique',
      NEW.id,
      CONCAT('Stock critique : ', v_nom, ' — lot ', NEW.numero_lot,
             ' — quantité : ', NEW.quantite_actuelle, ' (seuil : ', v_seuil, ')')
    );
  END IF;

  IF NEW.quantite_actuelle = 0 AND OLD.quantite_actuelle > 0 THEN
    INSERT INTO alertes (type_alerte, lot_id, message)
    VALUES (
      'rupture',
      NEW.id,
      CONCAT('RUPTURE DE STOCK : ', v_nom, ' — lot ', NEW.numero_lot)
    );
  END IF;
END$$

DELIMITER ;

-- ============================================================
-- DONNÉES DE TEST
-- ============================================================

-- Mot de passe pour tous les comptes de test : "Password123!"
-- Hash bcrypt généré avec saltRounds=10
INSERT INTO users (nom, prenom, email, password_hash, role, statut) VALUES
('Admin',       'Système',   'admin@medipharma.dz',        '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin',              'actif'),
('Belkacem',    'Amira',     'pharmacien@medipharma.dz',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'pharmacien',         'actif'),
('Hamidi',      'Karim',     'stock@medipharma.dz',        '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'responsable_stock',  'actif'),
('Meziane',     'Sara',      'medical@medipharma.dz',      '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'personnel_medical',  'actif'),
('Boumediene',  'Yacine',    'pharmacien2@medipharma.dz',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'pharmacien',         'actif');

-- Médicaments de référence
INSERT INTO medicaments (nom, dosage, principe_actif, forme, laboratoire, code_cip, seuil_minimum, description, created_by) VALUES
('Paracétamol 500mg',    '500mg',  'Paracétamol',       'comprimé',   'Sanofi',           '3400935555565', 20, 'Antalgique et antipyrétique',          1),
('Amoxicilline 500mg',   '500mg',  'Amoxicilline',      'gélule',     'GSK',              '3400936789012', 15, 'Antibiotique pénicilline',             2),
('Ibuprofène 400mg',     '400mg',  'Ibuprofène',        'comprimé',   'Ratiopharm',       '3400937890123', 10, 'Anti-inflammatoire AINS',              2),
('Oméprazole 20mg',      '20mg',   'Oméprazole',        'gélule',     'AstraZeneca',      '3400938901234', 10, 'Inhibiteur de la pompe à protons',     2),
('Métformine 500mg',     '500mg',  'Metformine',        'comprimé',   'Merck',            '3400939012345', 15, 'Antidiabétique oral',                  2),
('Doliprane Sirop',      '2.4%',   'Paracétamol',       'sirop',      'Sanofi',           '3400940123456', 5,  'Antalgique pédiatrique',               2),
('Héparine 5000UI/ml',   '5000UI', 'Héparine sodique',  'injectable', 'Leo Pharma',       '3400941234567', 8,  'Anticoagulant injectable',             2),
('Cortisone 5mg',        '5mg',    'Cortisol',          'comprimé',   'Upjohn',           '3400942345678', 10, 'Corticostéroïde',                      2);

-- Lots de médicaments
INSERT INTO lots (medicament_id, numero_lot, date_fabrication, date_peremption, quantite_initiale, quantite_actuelle, emplacement) VALUES
(1, 'LOT-2024-001', '2024-01-15', '2026-01-15', 500, 320, 'Rayon A1'),
(1, 'LOT-2024-002', '2024-03-10', '2026-03-10', 300, 150, 'Rayon A1'),
(2, 'LOT-2024-003', '2024-02-20', '2025-08-20', 200, 45,  'Rayon B2'),
(3, 'LOT-2024-004', '2024-04-01', '2026-04-01', 400, 8,   'Rayon A2'),
(4, 'LOT-2024-005', '2024-05-15', '2027-05-15', 300, 180, 'Rayon C1'),
(5, 'LOT-2024-006', '2024-06-01', '2027-06-01', 250, 120, 'Rayon C2'),
(6, 'LOT-2024-007', '2024-03-01', '2025-09-01', 100, 3,   'Réfrigérateur 1'),
(7, 'LOT-2024-008', '2024-07-01', '2026-07-01', 150, 75,  'Réfrigérateur 2'),
(8, 'LOT-2024-009', '2024-08-01', '2028-08-01', 200, 95,  'Rayon D1');

-- Mouvements de stock (historique)
INSERT INTO stock_mouvements (lot_id, type_mouvement, quantite, service_destination, bon_livraison, user_id) VALUES
(1, 'entree',     500, NULL,            'BL-2024-001', 2),
(1, 'sortie',     180, 'Urgences',      NULL,          2),
(2, 'entree',     300, NULL,            'BL-2024-002', 2),
(2, 'sortie',     150, 'Cardiologie',   NULL,          2),
(3, 'entree',     200, NULL,            'BL-2024-003', 2),
(3, 'sortie',     155, 'Pédiatrie',     NULL,          5),
(4, 'entree',     400, NULL,            'BL-2024-004', 2),
(4, 'sortie',     392, 'Chirurgie',     NULL,          5),
(7, 'entree',     100, NULL,            'BL-2024-007', 2),
(7, 'sortie',     97,  'Pédiatrie',     NULL,          2);

-- Alertes générées
INSERT INTO alertes (type_alerte, lot_id, message, statut) VALUES
('seuil_critique', 4, 'Stock critique : Ibuprofène 400mg — lot LOT-2024-004 — quantité : 8 (seuil : 10)', 'active'),
('peremption',     3, 'Péremption proche : Amoxicilline 500mg — lot LOT-2024-003 — expire le 2025-08-20', 'active'),
('rupture',        7, 'RUPTURE DE STOCK : Doliprane Sirop — lot LOT-2024-007 — quantité : 3 (seuil : 5)', 'active');

-- ============================================================
-- VÉRIFICATION DES DONNÉES
-- ============================================================
SELECT 'users'            AS table_name, COUNT(*) AS nb_lignes FROM users
UNION ALL
SELECT 'medicaments',                    COUNT(*)              FROM medicaments
UNION ALL
SELECT 'lots',                           COUNT(*)              FROM lots
UNION ALL
SELECT 'stock_mouvements',               COUNT(*)              FROM stock_mouvements
UNION ALL
SELECT 'alertes',                        COUNT(*)              FROM alertes
UNION ALL
SELECT 'audit_logs',                     COUNT(*)              FROM audit_logs;
