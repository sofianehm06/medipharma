const router = require('express').Router();
const { getAll, getById, create, update, toggleStatut, remove } = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(verifyToken);

router.get('/',              authorize('admin'), getAll);
router.get('/:id',           authorize('admin'), getById);
router.post('/',             authorize('admin'), create);
router.put('/:id',           authorize('admin'), update);
router.patch('/:id/statut',  authorize('admin'), toggleStatut);
router.delete('/:id',        authorize('admin'), remove);

module.exports = router;
