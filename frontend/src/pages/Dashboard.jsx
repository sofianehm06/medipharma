import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { reportService } from '../services/reportService';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    reportService.dashboard()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const statCards = [
    { label: 'Médicaments',          value: stats?.total_medicaments,    icon: '💊', color: 'blue',   link: '/medications' },
    { label: 'Lots en stock',        value: stats?.total_lots,           icon: '📦', color: 'green',  link: '/stock' },
    { label: 'Alertes actives',      value: stats?.alertes_actives,      icon: '🔔', color: 'orange', link: '/alerts' },
    { label: 'Péremptions < 30 j',   value: stats?.lots_expirant,        icon: '⚠️', color: 'red',    link: '/stock' },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Tableau de bord</h2>
          <p>Bonjour {user?.prenom} — {new Date().toLocaleDateString('fr-DZ', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
        </div>
      </div>

      <div className="stats-grid">
        {statCards.map(s => (
          <div key={s.label} className="stat-card" onClick={() => navigate(s.link)} style={{ cursor: 'pointer' }}>
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div>
              <div className="stat-value">{s.value ?? '—'}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Top 5 médicaments consommés */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Top 5 — Consommation du mois</span>
          </div>
          {stats?.top5_consommes?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.top5_consommes} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="nom" tick={{ fontSize: 11 }} tickFormatter={v => v.split(' ')[0]} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v} unités`, 'Sorties']} />
                <Bar dataKey="total_sorties" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><p>Aucune donnée ce mois</p></div>
          )}
        </div>

        {/* Activité du jour */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Activité d'aujourd'hui</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: 8 }}>
              <span>Mouvements de stock</span>
              <strong>{stats?.mouvements_aujourd_hui ?? 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#fff7ed', borderRadius: 8 }}>
              <span>Alertes à traiter</span>
              <strong style={{ color: stats?.alertes_actives > 0 ? '#dc2626' : '#16a34a' }}>
                {stats?.alertes_actives ?? 0}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#fef2f2', borderRadius: 8 }}>
              <span>Lots à péremption proche</span>
              <strong style={{ color: '#d97706' }}>{stats?.lots_expirant ?? 0}</strong>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/stock')}>Voir les stocks</button>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/reports')}>Rapports</button>
          </div>
        </div>
      </div>
    </>
  );
}
