const db = require('../config/db');

// Rapport d'inventaire : état complet de tous les stocks
const inventaire = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        m.nom, m.dosage, m.forme, m.laboratoire, m.principe_actif,
        l.numero_lot, l.date_peremption, l.quantite_actuelle, l.emplacement,
        DATEDIFF(l.date_peremption, CURDATE()) AS jours_avant_peremption,
        CASE
          WHEN l.quantite_actuelle = 0 THEN 'Rupture'
          WHEN l.quantite_actuelle <= m.seuil_minimum THEN 'Critique'
          WHEN DATEDIFF(l.date_peremption, CURDATE()) <= 30 THEN 'Péremption proche'
          ELSE 'Normal'
        END AS statut
      FROM lots l
      JOIN medicaments m ON m.id = l.medicament_id
      ORDER BY m.nom, l.date_peremption
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Rapport de consommation : sorties par période
const consommation = async (req, res) => {
  const { debut, fin } = req.query;
  const dateDebut = debut || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const dateFin = fin || new Date().toISOString().split('T')[0];

  try {
    const [rows] = await db.execute(`
      SELECT
        m.nom, m.dosage, m.forme,
        SUM(CASE WHEN sm.type_mouvement = 'sortie' THEN sm.quantite ELSE 0 END) AS total_sorties,
        SUM(CASE WHEN sm.type_mouvement = 'entree' THEN sm.quantite ELSE 0 END) AS total_entrees,
        SUM(CASE WHEN sm.type_mouvement = 'retour' THEN sm.quantite ELSE 0 END) AS total_retours,
        SUM(CASE WHEN sm.type_mouvement = 'destruction' THEN sm.quantite ELSE 0 END) AS total_destructions,
        COUNT(DISTINCT sm.service_destination) AS nb_services
      FROM stock_mouvements sm
      JOIN lots l ON l.id = sm.lot_id
      JOIN medicaments m ON m.id = l.medicament_id
      WHERE DATE(sm.created_at) BETWEEN ? AND ?
      GROUP BY m.id
      ORDER BY total_sorties DESC
    `, [dateDebut, dateFin]);
    res.json({ periode: { debut: dateDebut, fin: dateFin }, data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Rapport des lots périmés ou proches de la péremption
const perimes = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        m.nom, m.dosage, m.laboratoire,
        l.numero_lot, l.date_peremption, l.quantite_actuelle, l.emplacement,
        DATEDIFF(l.date_peremption, CURDATE()) AS jours_restants,
        CASE
          WHEN l.date_peremption < CURDATE() THEN 'Expiré'
          ELSE 'Expire bientôt (< 30j)'
        END AS statut_peremption
      FROM lots l
      JOIN medicaments m ON m.id = l.medicament_id
      WHERE l.date_peremption <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        AND l.quantite_actuelle > 0
      ORDER BY l.date_peremption ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Statistiques du tableau de bord
const dashboard = async (req, res) => {
  try {
    const [[{ total_medicaments }]] = await db.execute('SELECT COUNT(*) AS total_medicaments FROM medicaments');
    const [[{ total_lots }]] = await db.execute('SELECT COUNT(*) AS total_lots FROM lots WHERE quantite_actuelle > 0');
    const [[{ alertes_actives }]] = await db.execute("SELECT COUNT(*) AS alertes_actives FROM alertes WHERE statut = 'active'");
    const [[{ lots_expirant }]] = await db.execute(
      "SELECT COUNT(*) AS lots_expirant FROM lots WHERE date_peremption <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND quantite_actuelle > 0"
    );
    const [[{ mouvements_aujourd_hui }]] = await db.execute(
      'SELECT COUNT(*) AS mouvements_aujourd_hui FROM stock_mouvements WHERE DATE(created_at) = CURDATE()'
    );

    // Top 5 médicaments les plus consommés ce mois
    const [top5] = await db.execute(`
      SELECT m.nom, SUM(sm.quantite) AS total_sorties
      FROM stock_mouvements sm
      JOIN lots l ON l.id = sm.lot_id
      JOIN medicaments m ON m.id = l.medicament_id
      WHERE sm.type_mouvement = 'sortie' AND MONTH(sm.created_at) = MONTH(CURDATE())
      GROUP BY m.id ORDER BY total_sorties DESC LIMIT 5
    `);

    res.json({
      total_medicaments,
      total_lots,
      alertes_actives,
      lots_expirant,
      mouvements_aujourd_hui,
      top5_consommes: top5
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = { inventaire, consommation, perimes, dashboard };
