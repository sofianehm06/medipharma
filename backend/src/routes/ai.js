const router = require('express').Router();
const { analyseStock, chat, suggestionCommande } = require('../controllers/aiController');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const rateLimit = require('express-rate-limit');

// Limite les appels IA : 20 requêtes / heure (coût API OpenAI)
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Limite d\'appels IA atteinte. Réessayez dans 1 heure.' }
});

router.use(verifyToken);
router.use(aiLimiter);

router.get('/analyse-stock',       authorize('admin', 'pharmacien', 'responsable_stock'), analyseStock);
router.post('/chat',               authorize('admin', 'pharmacien', 'responsable_stock', 'personnel_medical'), chat);
router.get('/suggestion-commande', authorize('admin', 'pharmacien', 'responsable_stock'), suggestionCommande);

module.exports = router;
