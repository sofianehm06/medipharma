const router = require('express').Router();
const { inventaire, consommation, perimes, dashboard } = require('../controllers/reportController');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(verifyToken);

router.get('/dashboard',    authorize('admin', 'pharmacien', 'responsable_stock'), dashboard);
router.get('/inventaire',   authorize('admin', 'pharmacien', 'responsable_stock'), inventaire);
router.get('/consommation', authorize('admin', 'pharmacien', 'responsable_stock'), consommation);
router.get('/perimes',      authorize('admin', 'pharmacien', 'responsable_stock'), perimes);

module.exports = router;
