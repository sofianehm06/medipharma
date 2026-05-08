const router = require('express').Router();
const { getAll, getCount, traiter, ignorer } = require('../controllers/alertController');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(verifyToken);

router.get('/',              authorize('admin', 'pharmacien', 'responsable_stock'), getAll);
router.get('/count',         authorize('admin', 'pharmacien', 'responsable_stock'), getCount);
router.patch('/:id/traiter', authorize('admin', 'pharmacien', 'responsable_stock'), traiter);
router.patch('/:id/ignorer', authorize('admin', 'pharmacien', 'responsable_stock'), ignorer);

module.exports = router;
