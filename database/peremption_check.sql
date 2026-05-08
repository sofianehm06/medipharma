-- Procédure stockée : vérification quotidienne des péremptions
-- À appeler via un cron job ou au démarrage du backend

USE medipharma;

DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS check_peremptions()
BEGIN
  -- Alerte pour les lots qui expirent dans moins de 30 jours
  INSERT INTO alertes (type_alerte, lot_id, message)
  SELECT
    'peremption',
    l.id,
    CONCAT(
      'Péremption proche : ', m.nom,
      ' — lot ', l.numero_lot,
      ' — expire le ', DATE_FORMAT(l.date_peremption, '%d/%m/%Y'),
      ' (dans ', DATEDIFF(l.date_peremption, CURDATE()), ' jours)'
    )
  FROM lots l
  JOIN medicaments m ON m.id = l.medicament_id
  WHERE l.date_peremption BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
    AND l.quantite_actuelle > 0
    AND NOT EXISTS (
      SELECT 1 FROM alertes a
      WHERE a.lot_id = l.id
        AND a.type_alerte = 'peremption'
        AND a.statut = 'active'
        AND DATE(a.created_at) = CURDATE()
    );

  -- Alerte pour les lots déjà expirés avec du stock restant
  INSERT INTO alertes (type_alerte, lot_id, message)
  SELECT
    'peremption',
    l.id,
    CONCAT('EXPIRÉ : ', m.nom, ' — lot ', l.numero_lot, ' — expiré depuis le ',
           DATE_FORMAT(l.date_peremption, '%d/%m/%Y'))
  FROM lots l
  JOIN medicaments m ON m.id = l.medicament_id
  WHERE l.date_peremption < CURDATE()
    AND l.quantite_actuelle > 0
    AND NOT EXISTS (
      SELECT 1 FROM alertes a
      WHERE a.lot_id = l.id
        AND a.type_alerte = 'peremption'
        AND a.statut = 'active'
        AND DATE(a.created_at) = CURDATE()
    );
END$$

DELIMITER ;
