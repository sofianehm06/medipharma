import { useEffect, useState } from 'react';
import { reportService } from '../services/reportService';

const TABS = ['Inventaire', 'Consommation', 'Péremptions'];

export default function ReportsPage() {
  const [tab, setTab]           = useState(0);
  const [inventaire, setInv]    = useState([]);
  const [consomm, setConsomm]   = useState(null);
  const [perimes, setPerimes]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [dateDebut, setDebut]   = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateFin, setFin] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setLoading(true);
    if (tab === 0) reportService.inventaire().then(setInv).catch(() => {}).finally(() => setLoading(false));
    if (tab === 1) reportService.consommation({ debut: dateDebut, fin: dateFin }).then(setConsomm).catch(() => {}).finally(() => setLoading(false));
    if (tab === 2) reportService.perimes().then(setPerimes).catch(() => {}).finally(() => setLoading(false));
  }, [tab, dateDebut, dateFin]);

  const statutBadge = s => ({
    'Normal':           <span className="badge badge-success">Normal</span>,
    'Critique':         <span className="badge badge-warning">Critique</span>,
    'Rupture':          <span className="badge badge-danger">Rupture</span>,
    'Péremption proche':<span className="badge badge-warning">Péremption proche</span>
  }[s] || <span className="badge badge-gray">{s}</span>);

  return (
    <>
      <div className="page-header">
        <div><h2>Rapports & Statistiques</h2><p>Inventaire, consommation et péremptions</p></div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            style={{ padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === i ? '2px solid #1e40af' : '2px solid transparent',
              color: tab === i ? '#1e40af' : '#64748b', fontWeight: tab === i ? 600 : 400 }}>
            {t}
          </button>
        ))}
      </div>

      {loading && <div className="loading"><div className="spinner" /></div>}

      {/* Inventaire */}
      {!loading && tab === 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Inventaire complet — {inventaire.length} lignes</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Médicament</th><th>N° Lot</th><th>Quantité</th><th>Emplacement</th><th>Péremption</th><th>Statut</th></tr></thead>
              <tbody>
                {inventaire.map((r, i) => (
                  <tr key={i}>
                    <td><strong>{r.nom}</strong> {r.dosage}<br/><small style={{color:'#64748b'}}>{r.laboratoire}</small></td>
                    <td><code>{r.numero_lot}</code></td>
                    <td><strong>{r.quantite_actuelle}</strong></td>
                    <td>{r.emplacement || '—'}</td>
                    <td style={{ color: r.jours_avant_peremption < 30 ? '#dc2626' : 'inherit' }}>
                      {new Date(r.date_peremption).toLocaleDateString('fr-FR')}
                    </td>
                    <td>{statutBadge(r.statut)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Consommation */}
      {!loading && tab === 1 && (
        <>
          <div className="filters-bar" style={{ marginBottom: 16 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Du</label>
              <input className="form-input" type="date" value={dateDebut} onChange={e => setDebut(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Au</label>
              <input className="form-input" type="date" value={dateFin} onChange={e => setFin(e.target.value)} />
            </div>
          </div>
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Médicament</th><th>Sorties</th><th>Entrées</th><th>Retours</th><th>Destructions</th><th>Services</th></tr></thead>
                <tbody>
                  {consomm?.data?.map((r, i) => (
                    <tr key={i}>
                      <td><strong>{r.nom}</strong> {r.dosage}</td>
                      <td style={{color:'#dc2626', fontWeight:600}}>-{r.total_sorties}</td>
                      <td style={{color:'#16a34a', fontWeight:600}}>+{r.total_entrees}</td>
                      <td>{r.total_retours}</td>
                      <td style={{color:'#d97706'}}>{r.total_destructions}</td>
                      <td>{r.nb_services}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Péremptions */}
      {!loading && tab === 2 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Lots expirant dans moins de 30 jours</span>
          </div>
          {perimes.length === 0 ? (
            <div className="empty-state"><div className="icon">✅</div><p>Aucun lot à péremption proche</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Médicament</th><th>Lot</th><th>Quantité</th><th>Péremption</th><th>Jours restants</th><th>Statut</th></tr></thead>
                <tbody>
                  {perimes.map((r, i) => (
                    <tr key={i}>
                      <td><strong>{r.nom}</strong> {r.dosage}<br/><small>{r.laboratoire}</small></td>
                      <td><code>{r.numero_lot}</code></td>
                      <td>{r.quantite_actuelle}</td>
                      <td>{new Date(r.date_peremption).toLocaleDateString('fr-FR')}</td>
                      <td style={{ color: r.jours_restants < 0 ? '#dc2626' : '#d97706', fontWeight: 600 }}>
                        {r.jours_restants < 0 ? `Expiré (${Math.abs(r.jours_restants)}j)` : `${r.jours_restants} j`}
                      </td>
                      <td><span className={`badge ${r.statut_peremption === 'Expiré' ? 'badge-danger' : 'badge-warning'}`}>{r.statut_peremption}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
