import { useEffect, useState } from 'react';
import { alertService } from '../services/alertService';

export default function AlertsPage() {
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('active');

  const load = () => {
    setLoading(true);
    alertService.getAll({ statut: filter || undefined })
      .then(setAlerts).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const handleTraiter = async id => {
    await alertService.traiter(id);
    load();
  };

  const handleIgnorer = async id => {
    await alertService.ignorer(id);
    load();
  };

  const typeBadge = t => ({
    rupture:       <span className="badge badge-danger">Rupture</span>,
    peremption:    <span className="badge badge-warning">Péremption</span>,
    seuil_critique:<span className="badge badge-warning">Seuil critique</span>
  }[t] || <span className="badge badge-gray">{t}</span>);

  const statutBadge = s => ({
    active:  <span className="badge badge-danger">Active</span>,
    traitee: <span className="badge badge-success">Traitée</span>,
    ignoree: <span className="badge badge-gray">Ignorée</span>
  }[s]);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Alertes de stock</h2>
          <p>{alerts.length} alerte(s) — {filter || 'toutes'}</p>
        </div>
      </div>

      <div className="filters-bar">
        {['active','traitee','ignoree',''].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`btn ${filter === s ? 'btn-primary' : 'btn-ghost'} btn-sm`}>
            {s === '' ? 'Toutes' : s.charAt(0).toUpperCase() + s.slice(1) + 'es'}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : alerts.length === 0 ? (
          <div className="empty-state"><div className="icon">✅</div><p>Aucune alerte {filter && `"${filter}"`}</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Type</th><th>Médicament / Lot</th><th>Message</th><th>Date</th><th>Statut</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {alerts.map(a => (
                  <tr key={a.id}>
                    <td>{typeBadge(a.type_alerte)}</td>
                    <td>
                      <strong>{a.medicament_nom}</strong> {a.dosage}<br/>
                      <small style={{color:'#64748b'}}>Lot : {a.numero_lot}</small>
                    </td>
                    <td style={{ maxWidth: 300, fontSize: 13 }}>{a.message}</td>
                    <td>{new Date(a.created_at).toLocaleString('fr-FR')}</td>
                    <td>{statutBadge(a.statut)}</td>
                    <td>
                      {a.statut === 'active' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-success btn-sm" onClick={() => handleTraiter(a.id)}>✓ Traiter</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleIgnorer(a.id)}>Ignorer</button>
                        </div>
                      )}
                      {a.statut !== 'active' && (
                        <small style={{color:'#64748b'}}>
                          Par {a.traite_par_prenom} {a.traite_par_nom}<br/>
                          {a.traite_le && new Date(a.traite_le).toLocaleDateString('fr-FR')}
                        </small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
