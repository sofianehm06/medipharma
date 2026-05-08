const router = require('express').Router();
const { getAll, getById, create, update, remove } = require('../controllers/medicationController');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(verifyToken);

// Lecture : tous les rôles authentifiés
router.get('/',    authorize('admin', 'pharmacien', 'responsable_stock', 'personnel_medical'), getAll);
router.get('/:id', authorize('admin', 'pharmacien', 'responsable_stock', 'personnel_medical'), getById);

// Écriture : admin et pharmacien uniquement
router.post('/',      authorize('admin', 'pharmacien'), create);
router.put('/:id',    authorize('admin', 'pharmacien'), update);
router.delete('/:id', authorize('admin', 'pharmacien'), remove);

module.exports = router;
