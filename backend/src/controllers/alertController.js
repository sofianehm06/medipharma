const db = require('../config/db');
const { log } = require('../utils/auditLog');

const getAll = async (req, res) => {
  try {
    const { statut, type_alerte } = req.query;
    let query = `
      SELECT a.*, l.numero_lot, m.nom AS medicament_nom, m.dosage,
        u.nom AS traite_par_nom, u.prenom AS traite_par_prenom
      FROM alertes a
      JOIN lots l ON l.id = a.lot_id
      JOIN medicaments m ON m.id = l.medicament_id
      LEFT JOIN users u ON u.id = a.traite_par
    `;
    const params = [];

    if (statut || type_alerte) {
      const conds = [];
      if (statut) { conds.push('a.statut = ?'); params.push(statut); }
      if (type_alerte) { conds.push('a.type_alerte = ?'); params.push(type_alerte); }
      query += ' WHERE ' + conds.join(' AND ');
    }

    query += ' ORDER BY a.created_at DESC';
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const getCount = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT COUNT(*) AS total FROM alertes WHERE statut = 'active'"
    );
    res.json({ count: rows[0].total });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const traiter = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.execute('SELECT * FROM alertes WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Alerte introuvable' });

    await db.execute(
      "UPDATE alertes SET statut = 'traitee', traite_par = ?, traite_le = NOW() WHERE id = ?",
      [req.user.id, id]
    );

    await log(req.user.id, 'TRAITER_ALERTE', 'alertes', id, {}, req.ip);
    res.json({ message: 'Alerte marquée comme traitée' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const ignorer = async (req, res) => {
  const { id } = req.params;

  try {
    await db.execute(
      "UPDATE alertes SET statut = 'ignoree', traite_par = ?, traite_le = NOW() WHERE id = ?",
      [req.user.id, id]
    );

    await log(req.user.id, 'IGNORER_ALERTE', 'alertes', id, {}, req.ip);
    res.json({ message: 'Alerte ignorée' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = { getAll, getCount, traiter, ignorer };
