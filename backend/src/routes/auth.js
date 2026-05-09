const router = require('express').Router();
const { login, getMe, changePassword } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limit strict sur le login : 10 tentatives / 15 min
// Complètement désactivé en mode test pour éviter les conflits Jest --runInBand
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' }
});

router.post('/login', loginLimiter, login);
router.get('/me', verifyToken, getMe);
router.put('/change-password', verifyToken, changePassword);

module.exports = router;
