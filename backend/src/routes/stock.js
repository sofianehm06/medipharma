const router = require('express').Router();
const { getLots, createLot, getMouvements, createMouvement, getEtatStock } = require('../controllers/stockController');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(verifyToken);

router.get('/etat',         authorize('admin', 'pharmacien', 'responsable_stock'), getEtatStock);
router.get('/lots',         authorize('admin', 'pharmacien', 'responsable_stock'), getLots);
router.post('/lots',        authorize('admin', 'pharmacien'), createLot);
router.get('/mouvements',   authorize('admin', 'pharmacien', 'responsable_stock'), getMouvements);
router.post('/mouvements',  authorize('admin', 'pharmacien'), createMouvement);

module.exports = router;
