const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { log } = require('../utils/auditLog');

const getAll = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, nom, prenom, email, role, statut, derniere_connexion, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const getById = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, nom, prenom, email, role, statut, derniere_connexion, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const create = async (req, res) => {
  const { nom, prenom, email, password, role } = req.body;

  if (!nom || !prenom || !email || !password || !role) {
    return res.status(400).json({ error: 'Tous les champs sont obligatoires' });
  }

  const validRoles = ['admin', 'pharmacien', 'responsable_stock', 'personnel_medical'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide' });
  }

  try {
    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO users (nom, prenom, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [nom.trim(), prenom.trim(), email.toLowerCase().trim(), hash, role]
    );

    await log(req.user.id, 'CREATE_USER', 'users', result.insertId, { email, role }, req.ip);

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      id: result.insertId
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const update = async (req, res) => {
  const { nom, prenom, email, role, statut } = req.body;
  const { id } = req.params;

  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });

    // Empêcher la suppression du dernier admin
    if (rows[0].role === 'admin' && role && role !== 'admin') {
      const [admins] = await db.execute(
        "SELECT COUNT(*) as cnt FROM users WHERE role = 'admin' AND statut = 'actif'"
      );
      if (admins[0].cnt <= 1) {
        return res.status(400).json({ error: 'Impossible : dernier administrateur actif' });
      }
    }

    await db.execute(
      'UPDATE users SET nom = COALESCE(?, nom), prenom = COALESCE(?, prenom), email = COALESCE(?, email), role = COALESCE(?, role), statut = COALESCE(?, statut) WHERE id = ?',
      [nom || null, prenom || null, email?.toLowerCase() || null, role || null, statut || null, id]
    );

    await log(req.user.id, 'UPDATE_USER', 'users', id, req.body, req.ip);

    res.json({ message: 'Utilisateur mis à jour' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const toggleStatut = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });

    if (rows[0].role === 'admin') {
      const [admins] = await db.execute(
        "SELECT COUNT(*) as cnt FROM users WHERE role = 'admin' AND statut = 'actif'"
      );
      if (admins[0].cnt <= 1 && rows[0].statut === 'actif') {
        return res.status(400).json({ error: 'Impossible de désactiver le dernier administrateur' });
      }
    }

    const newStatut = rows[0].statut === 'actif' ? 'inactif' : 'actif';
    await db.execute('UPDATE users SET statut = ?, tentatives = 0 WHERE id = ?', [newStatut, id]);

    await log(req.user.id, 'TOGGLE_USER_STATUS', 'users', id, { newStatut }, req.ip);

    res.json({ message: `Compte ${newStatut === 'actif' ? 'activé' : 'désactivé'}`, statut: newStatut });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const remove = async (req, res) => {
  const { id } = req.params;

  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  }

  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });

    if (rows[0].role === 'admin') {
      const [admins] = await db.execute("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'");
      if (admins[0].cnt <= 1) {
        return res.status(400).json({ error: 'Impossible de supprimer le dernier administrateur' });
      }
    }

    await db.execute('DELETE FROM users WHERE id = ?', [id]);
    await log(req.user.id, 'DELETE_USER', 'users', id, { email: rows[0].email }, req.ip);

    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = { getAll, getById, create, update, toggleStatut, remove };
