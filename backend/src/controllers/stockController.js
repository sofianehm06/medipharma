const db = require('../config/db');
const { log } = require('../utils/auditLog');

// ── Lots ──────────────────────────────────────────────────────

const getLots = async (req, res) => {
  try {
    const { medicament_id, expire_soon } = req.query;
    let query = `
      SELECT l.*, m.nom AS medicament_nom, m.dosage, m.seuil_minimum,
        DATEDIFF(l.date_peremption, CURDATE()) AS jours_avant_peremption
      FROM lots l
      JOIN medicaments m ON m.id = l.medicament_id
    `;
    const params = [];

    if (medicament_id) {
      query += ' WHERE l.medicament_id = ?';
      params.push(medicament_id);
    }

    if (expire_soon === 'true') {
      query += params.length ? ' AND' : ' WHERE';
      query += ' l.date_peremption <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND l.quantite_actuelle > 0';
    }

    query += ' ORDER BY l.date_peremption ASC';
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const createLot = async (req, res) => {
  const { medicament_id, numero_lot, date_fabrication, date_peremption, quantite_initiale, emplacement } = req.body;

  if (!medicament_id || !numero_lot || !date_peremption || !quantite_initiale) {
    return res.status(400).json({ error: 'Champs requis : medicament_id, numero_lot, date_peremption, quantite_initiale' });
  }

  try {
    const [med] = await db.execute('SELECT id FROM medicaments WHERE id = ?', [medicament_id]);
    if (med.length === 0) return res.status(404).json({ error: 'Médicament introuvable' });

    const [result] = await db.execute(
      `INSERT INTO lots (medicament_id, numero_lot, date_fabrication, date_peremption, quantite_initiale, quantite_actuelle, emplacement)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [medicament_id, numero_lot, date_fabrication || null, date_peremption, quantite_initiale, quantite_initiale, emplacement || null]
    );

    // Enregistrer comme mouvement d'entrée
    await db.execute(
      `INSERT INTO stock_mouvements (lot_id, type_mouvement, quantite, bon_livraison, user_id)
       VALUES (?, 'entree', ?, ?, ?)`,
      [result.insertId, quantite_initiale, req.body.bon_livraison || null, req.user.id]
    );

    await log(req.user.id, 'CREATE_LOT', 'lots', result.insertId, { medicament_id, numero_lot, quantite_initiale }, req.ip);

    res.status(201).json({ message: 'Lot créé et stock mis à jour', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ce numéro de lot existe déjà pour ce médicament' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── Mouvements ────────────────────────────────────────────────

const getMouvements = async (req, res) => {
  try {
    const { lot_id, type_mouvement, limit = 50 } = req.query;
    let query = `
      SELECT sm.*, l.numero_lot, m.nom AS medicament_nom, u.nom AS user_nom, u.prenom AS user_prenom
      FROM stock_mouvements sm
      JOIN lots l ON l.id = sm.lot_id
      JOIN medicaments m ON m.id = l.medicament_id
      JOIN users u ON u.id = sm.user_id
    `;
    const params = [];

    if (lot_id) {
      query += ' WHERE sm.lot_id = ?';
      params.push(lot_id);
    }
    if (type_mouvement) {
      query += params.length ? ' AND' : ' WHERE';
      query += ' sm.type_mouvement = ?';
      params.push(type_mouvement);
    }

    query += ` ORDER BY sm.created_at DESC LIMIT ${parseInt(limit)}`;
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const createMouvement = async (req, res) => {
  const { lot_id, type_mouvement, quantite, service_destination, bon_livraison, motif } = req.body;

  if (!lot_id || !type_mouvement || !quantite) {
    return res.status(400).json({ error: 'Champs requis : lot_id, type_mouvement, quantite' });
  }

  const validTypes = ['entree', 'sortie', 'retour', 'destruction'];
  if (!validTypes.includes(type_mouvement)) {
    return res.status(400).json({ error: 'Type invalide : entree | sortie | retour | destruction' });
  }

  try {
    const [lots] = await db.execute('SELECT * FROM lots WHERE id = ?', [lot_id]);
    if (lots.length === 0) return res.status(404).json({ error: 'Lot introuvable' });

    const lot = lots[0];

    if ((type_mouvement === 'sortie' || type_mouvement === 'destruction') && quantite > lot.quantite_actuelle) {
      return res.status(400).json({
        error: `Quantité insuffisante. Stock actuel : ${lot.quantite_actuelle}`
      });
    }

    const [result] = await db.execute(
      `INSERT INTO stock_mouvements (lot_id, type_mouvement, quantite, service_destination, bon_livraison, motif, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [lot_id, type_mouvement, quantite, service_destination || null, bon_livraison || null, motif || null, req.user.id]
    );

    await log(req.user.id, `STOCK_${type_mouvement.toUpperCase()}`, 'stock_mouvements', result.insertId,
      { lot_id, quantite, service_destination }, req.ip);

    res.status(201).json({ message: 'Mouvement enregistré', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── État des stocks ───────────────────────────────────────────

const getEtatStock = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        m.id, m.nom, m.dosage, m.forme, m.laboratoire, m.seuil_minimum,
        COALESCE(SUM(l.quantite_actuelle), 0) AS stock_total,
        COUNT(l.id) AS nb_lots,
        MIN(l.date_peremption) AS prochaine_peremption,
        CASE
          WHEN COALESCE(SUM(l.quantite_actuelle), 0) = 0 THEN 'rupture'
          WHEN COALESCE(SUM(l.quantite_actuelle), 0) <= m.seuil_minimum THEN 'critique'
          ELSE 'normal'
        END AS statut_stock
      FROM medicaments m
      LEFT JOIN lots l ON l.medicament_id = m.id AND l.quantite_actuelle > 0
      GROUP BY m.id
      ORDER BY statut_stock DESC, m.nom ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = { getLots, createLot, getMouvements, createMouvement, getEtatStock };
