const db = require('../config/db');
const { log } = require('../utils/auditLog');

const getAll = async (req, res) => {
  try {
    const { search, forme } = req.query;
    let query = `
      SELECT m.*, u.nom AS created_by_nom,
        COALESCE(SUM(l.quantite_actuelle), 0) AS stock_total
      FROM medicaments m
      LEFT JOIN users u ON u.id = m.created_by
      LEFT JOIN lots l ON l.medicament_id = m.id
    `;
    const params = [];

    if (search || forme) {
      query += ' WHERE';
      const conditions = [];
      if (search) {
        conditions.push(' (m.nom LIKE ? OR m.principe_actif LIKE ? OR m.code_cip LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      if (forme) {
        conditions.push(' m.forme = ?');
        params.push(forme);
      }
      query += conditions.join(' AND ');
    }

    query += ' GROUP BY m.id ORDER BY m.nom ASC';

    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const getById = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT m.*, COALESCE(SUM(l.quantite_actuelle), 0) AS stock_total
       FROM medicaments m
       LEFT JOIN lots l ON l.medicament_id = m.id
       WHERE m.id = ?
       GROUP BY m.id`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Médicament introuvable' });

    const [lots] = await db.execute(
      'SELECT * FROM lots WHERE medicament_id = ? ORDER BY date_peremption ASC',
      [req.params.id]
    );

    res.json({ ...rows[0], lots });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const create = async (req, res) => {
  const { nom, dosage, principe_actif, forme, laboratoire, code_cip, seuil_minimum, description } = req.body;

  if (!nom || !dosage || !principe_actif || !forme || !laboratoire) {
    return res.status(400).json({ error: 'Champs obligatoires : nom, dosage, principe_actif, forme, laboratoire' });
  }

  try {
    if (code_cip) {
      const [existing] = await db.execute('SELECT id FROM medicaments WHERE code_cip = ?', [code_cip]);
      if (existing.length > 0) return res.status(409).json({ error: 'Ce code CIP existe déjà' });
    }

    const [result] = await db.execute(
      `INSERT INTO medicaments (nom, dosage, principe_actif, forme, laboratoire, code_cip, seuil_minimum, description, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nom, dosage, principe_actif, forme, laboratoire, code_cip || null, seuil_minimum || 10, description || null, req.user.id]
    );

    await log(req.user.id, 'CREATE_MEDICATION', 'medicaments', result.insertId, { nom }, req.ip);

    res.status(201).json({ message: 'Médicament créé', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const update = async (req, res) => {
  const { id } = req.params;
  const { nom, dosage, principe_actif, forme, laboratoire, code_cip, seuil_minimum, description } = req.body;

  try {
    const [rows] = await db.execute('SELECT id FROM medicaments WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Médicament introuvable' });

    await db.execute(
      `UPDATE medicaments SET
        nom = COALESCE(?, nom),
        dosage = COALESCE(?, dosage),
        principe_actif = COALESCE(?, principe_actif),
        forme = COALESCE(?, forme),
        laboratoire = COALESCE(?, laboratoire),
        code_cip = COALESCE(?, code_cip),
        seuil_minimum = COALESCE(?, seuil_minimum),
        description = COALESCE(?, description)
       WHERE id = ?`,
      [nom||null, dosage||null, principe_actif||null, forme||null, laboratoire||null, code_cip||null, seuil_minimum||null, description||null, id]
    );

    await log(req.user.id, 'UPDATE_MEDICATION', 'medicaments', id, req.body, req.ip);
    res.json({ message: 'Médicament mis à jour' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const remove = async (req, res) => {
  const { id } = req.params;

  try {
    const [lots] = await db.execute(
      'SELECT COUNT(*) AS cnt FROM lots WHERE medicament_id = ?', [id]
    );
    if (lots[0].cnt > 0) {
      return res.status(400).json({ error: 'Impossible : ce médicament possède des lots en stock' });
    }

    await db.execute('DELETE FROM medicaments WHERE id = ?', [id]);
    await log(req.user.id, 'DELETE_MEDICATION', 'medicaments', id, {}, req.ip);

    res.json({ message: 'Médicament supprimé' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = { getAll, getById, create, update, remove };
