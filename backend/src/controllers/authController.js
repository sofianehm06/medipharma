const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { log } = require('../utils/auditLog');

const MAX_ATTEMPTS = 5;

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  try {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const user = rows[0];

    if (user.statut === 'bloque') {
      return res.status(403).json({ error: 'Compte bloqué. Contactez l\'administrateur.' });
    }

    if (user.statut === 'inactif') {
      return res.status(403).json({ error: 'Compte désactivé. Contactez l\'administrateur.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      const newAttempts = user.tentatives + 1;
      const newStatut = newAttempts >= MAX_ATTEMPTS ? 'bloque' : user.statut;

      await db.execute(
        'UPDATE users SET tentatives = ?, statut = ? WHERE id = ?',
        [newAttempts, newStatut, user.id]
      );

      if (newStatut === 'bloque') {
        await log(null, 'ACCOUNT_BLOCKED', 'users', user.id, { email }, req.ip);
        return res.status(403).json({ error: 'Trop de tentatives. Compte bloqué.' });
      }

      return res.status(401).json({
        error: `Identifiants incorrects. Tentatives restantes : ${MAX_ATTEMPTS - newAttempts}`
      });
    }

    // Réinitialiser les tentatives et mettre à jour la dernière connexion
    await db.execute(
      'UPDATE users SET tentatives = 0, derniere_connexion = NOW() WHERE id = ?',
      [user.id]
    );

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, nom: user.nom, prenom: user.prenom },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    await log(user.id, 'LOGIN', 'users', user.id, { email: user.email }, req.ip);

    res.json({
      token,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const getMe = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, nom, prenom, email, role, statut, derniere_connexion, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const changePassword = async (req, res) => {
  const { ancienPassword, nouveauPassword } = req.body;

  if (!ancienPassword || !nouveauPassword) {
    return res.status(400).json({ error: 'Les deux mots de passe sont requis' });
  }

  if (nouveauPassword.length < 8) {
    return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 8 caractères' });
  }

  try {
    const [rows] = await db.execute('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const user = rows[0];

    const match = await bcrypt.compare(ancienPassword, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Ancien mot de passe incorrect' });
    }

    const hash = await bcrypt.hash(nouveauPassword, 10);
    await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);

    await log(req.user.id, 'CHANGE_PASSWORD', 'users', req.user.id, {}, req.ip);

    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = { login, getMe, changePassword };
