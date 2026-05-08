// Contrôle d'accès basé sur les rôles (RBAC)
const roles = {
  admin: ['admin'],
  pharmacien: ['pharmacien'],
  responsable_stock: ['responsable_stock'],
  personnel_medical: ['personnel_medical'],
  // Groupes
  staff: ['admin', 'pharmacien', 'responsable_stock'],
  all: ['admin', 'pharmacien', 'responsable_stock', 'personnel_medical']
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const userRole = req.user.role;
    const allowed = allowedRoles.flat();

    if (!allowed.includes(userRole)) {
      return res.status(403).json({
        error: `Accès refusé. Rôle requis : ${allowed.join(' ou ')}`
      });
    }

    next();
  };
};

module.exports = { authorize, roles };
