import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ICONS = {
  dashboard: '📊', medications: '💊', stock: '📦',
  users: '👥', alerts: '🔔', reports: '📈', ai: '🤖', logout: '🚪'
};

export default function Sidebar({ alertCount }) {
  const { user, logout, can } = useAuth();

  const initials = user ? `${user.nom[0]}${user.prenom[0]}` : '?';
  const roleLabel = {
    admin: 'Administrateur',
    pharmacien: 'Pharmacien',
    responsable_stock: 'Resp. de stock',
    personnel_medical: 'Personnel médical'
  }[user?.role] || user?.role;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span style={{ fontSize: 24 }}>💊</span>
        <div>
          <h2>MediPharma</h2>
          <span>Pharmacie Hospitalière</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">Principal</div>

        <NavLink to="/dashboard" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          {ICONS.dashboard} Tableau de bord
        </NavLink>

        <NavLink to="/medications" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          {ICONS.medications} Médicaments
        </NavLink>

        {can('admin', 'pharmacien', 'responsable_stock') && (
          <>
            <NavLink to="/stock" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              {ICONS.stock} Gestion des stocks
            </NavLink>

            <NavLink to="/alerts" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              {ICONS.alerts} Alertes
              {alertCount > 0 && <span className="badge">{alertCount}</span>}
            </NavLink>

            <NavLink to="/reports" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              {ICONS.reports} Rapports
            </NavLink>
          </>
        )}

        {can('admin', 'pharmacien', 'responsable_stock') && (
          <>
            <div className="nav-section" style={{ marginTop: 8 }}>Intelligence artificielle</div>
            <NavLink to="/ai" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              {ICONS.ai} Assistant IA
            </NavLink>
          </>
        )}

        {can('admin') && (
          <>
            <div className="nav-section" style={{ marginTop: 8 }}>Administration</div>
            <NavLink to="/users" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              {ICONS.users} Utilisateurs
            </NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{initials}</div>
          <div className="user-details">
            <div className="name">{user?.prenom} {user?.nom}</div>
            <div className="role">{roleLabel}</div>
          </div>
        </div>
        <button
          className="nav-item"
          onClick={logout}
          style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {ICONS.logout} Se déconnecter
        </button>
      </div>
    </aside>
  );
}
