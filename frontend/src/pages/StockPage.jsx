import { useEffect, useState } from 'react';
import { stockService } from '../services/stockService';
import { medicationService } from '../services/medicationService';
import { useAuth } from '../context/AuthContext';

const TABS = ['État des stocks', 'Lots', 'Mouvements'];
const EMPTY_LOT  = { medicament_id:'', numero_lot:'', date_fabrication:'', date_peremption:'', quantite_initiale:'', emplacement:'', bon_livraison:'' };
const EMPTY_MOUV = { lot_id:'', type_mouvement:'sortie', quantite:'', service_destination:'', bon_livraison:'', motif:'' };

export default function StockPage() {
  const [tab, setTab]         = useState(0);
  const [etat, setEtat]       = useState([]);
  const [lots, setLots]       = useState([]);
  const [mouvements, setMouv] = useState([]);
  const [meds, setMeds]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalLot, setModalLot]   = useState(false);
  const [modalMouv, setModalMouv] = useState(false);
  const [formLot, setFormLot]     = useState(EMPTY_LOT);
  const [formMouv, setFormMouv]   = useState(EMPTY_MOUV);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const { can } = useAuth();

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      stockService.getEtat(),
      stockService.getLots(),
      stockService.getMouvements({ limit: 100 }),
      medicationService.getAll()
    ]).then(([e, l, m, mds]) => {
      setEtat(e); setLots(l); setMouv(m); setMeds(mds);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  const saveLot = async e => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await stockService.createLot(formLot);
      loadAll(); setModalLot(false); setFormLot(EMPTY_LOT);
    } catch (err) { setError(err.response?.data?.error || 'Erreur'); }
    finally { setSaving(false); }
  };

  const saveMouv = async e => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await stockService.createMouvement(formMouv);
      loadAll(); setModalMouv(false); setFormMouv(EMPTY_MOUV);
    } catch (err) { setError(err.response?.data?.error || 'Erreur'); }
    finally { setSaving(false); }
  };

  const statutBadge = s => ({
    rupture:  <span className="badge badge-danger">Rupture</span>,
    critique: <span className="badge badge-warning">Critique</span>,
    normal:   <span className="badge badge-success">Normal</span>
  }[s]);

  const typeBadge = t => ({
    entree:      <span className="badge badge-success">Entrée</span>,
    sortie:      <span className="badge badge-info">Sortie</span>,
    retour:      <span className="badge badge-gray">Retour</span>,
    destruction: <span className="badge badge-danger">Destruction</span>
  }[t]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <>
      <div className="page-header">
        <div><h2>Gestion des stocks</h2><p>Lots, mouvements et état du stock</p></div>
        {can('admin', 'pharmacien') && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-success" onClick={() => { setError(''); setModalLot(true); }}>+ Nouveau lot</button>
            <button className="btn btn-primary" onClick={() => { setError(''); setModalMouv(true); }}>+ Mouvement</button>
          </div>
        )}
      </div>

      {/* Tabs */}
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

      {/* État des stocks */}
      {tab === 0 && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Médicament</th><th>Forme</th><th>Stock total</th><th>Lots actifs</th><th>Proch. péremption</th><th>Statut</th></tr></thead>
              <tbody>
                {etat.map(m => (
                  <tr key={m.id}>
                    <td><strong>{m.nom}</strong><br/><small style={{color:'#64748b'}}>{m.dosage}</small></td>
                    <td><span className="badge badge-gray">{m.forme}</span></td>
                    <td><strong>{m.stock_total}</strong></td>
                    <td>{m.nb_lots}</td>
                    <td style={{ color: m.prochaine_peremption && new Date(m.prochaine_peremption) < new Date(Date.now() + 30*86400000) ? '#dc2626' : 'inherit' }}>
                      {m.prochaine_peremption ? new Date(m.prochaine_peremption).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td>{statutBadge(m.statut_stock)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lots */}
      {tab === 1 && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Médicament</th><th>N° Lot</th><th>Qté actuelle</th><th>Emplacement</th><th>Date péremption</th><th>Jours restants</th></tr></thead>
              <tbody>
                {lots.map(l => (
                  <tr key={l.id}>
                    <td><strong>{l.medicament_nom}</strong> {l.dosage}</td>
                    <td><code>{l.numero_lot}</code></td>
                    <td><strong>{l.quantite_actuelle}</strong> / {l.quantite_initiale}</td>
                    <td>{l.emplacement || '—'}</td>
                    <td>{new Date(l.date_peremption).toLocaleDateString('fr-FR')}</td>
                    <td>
                      <span style={{ color: l.jours_avant_peremption < 0 ? '#dc2626' : l.jours_avant_peremption < 30 ? '#d97706' : '#16a34a', fontWeight: 600 }}>
                        {l.jours_avant_peremption < 0 ? 'Expiré' : `${l.jours_avant_peremption} j`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mouvements */}
      {tab === 2 && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Médicament / Lot</th><th>Type</th><th>Quantité</th><th>Service</th><th>Opérateur</th></tr></thead>
              <tbody>
                {mouvements.map(m => (
                  <tr key={m.id}>
                    <td>{new Date(m.created_at).toLocaleString('fr-FR')}</td>
                    <td><strong>{m.medicament_nom}</strong><br/><small style={{color:'#64748b'}}>{m.numero_lot}</small></td>
                    <td>{typeBadge(m.type_mouvement)}</td>
                    <td><strong>{m.type_mouvement === 'sortie' || m.type_mouvement === 'destruction' ? '-' : '+'}{m.quantite}</strong></td>
                    <td>{m.service_destination || '—'}</td>
                    <td>{m.user_prenom} {m.user_nom}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal nouveau lot */}
      {modalLot && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalLot(false)}>
          <div className="modal">
            <div className="modal-header"><h3>Nouveau lot (entrée de stock)</h3><button className="btn-icon" onClick={() => setModalLot(false)}>✕</button></div>
            <div className="modal-body">
              {error && <div className="alert-banner alert-error">{error}</div>}
              <form onSubmit={saveLot}>
                <div className="form-group">
                  <label className="form-label">Médicament *</label>
                  <select className="form-select" value={formLot.medicament_id} onChange={e => setFormLot({...formLot, medicament_id: e.target.value})} required>
                    <option value="">— Sélectionner —</option>
                    {meds.map(m => <option key={m.id} value={m.id}>{m.nom} {m.dosage}</option>)}
                  </select>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">N° de lot *</label>
                    <input className="form-input" value={formLot.numero_lot} onChange={e => setFormLot({...formLot, numero_lot: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quantité *</label>
                    <input className="form-input" type="number" min="1" value={formLot.quantite_initiale} onChange={e => setFormLot({...formLot, quantite_initiale: e.target.value})} required />
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Date fabrication</label>
                    <input className="form-input" type="date" value={formLot.date_fabrication} onChange={e => setFormLot({...formLot, date_fabrication: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date péremption *</label>
                    <input className="form-input" type="date" value={formLot.date_peremption} onChange={e => setFormLot({...formLot, date_peremption: e.target.value})} required />
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Emplacement</label>
                    <input className="form-input" value={formLot.emplacement} onChange={e => setFormLot({...formLot, emplacement: e.target.value})} placeholder="ex: Rayon A1" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">N° bon de livraison</label>
                    <input className="form-input" value={formLot.bon_livraison} onChange={e => setFormLot({...formLot, bon_livraison: e.target.value})} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setModalLot(false)}>Annuler</button>
                  <button type="submit" className="btn btn-success" disabled={saving}>{saving ? 'Enregistrement...' : 'Créer le lot'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal mouvement */}
      {modalMouv && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalMouv(false)}>
          <div className="modal">
            <div className="modal-header"><h3>Enregistrer un mouvement</h3><button className="btn-icon" onClick={() => setModalMouv(false)}>✕</button></div>
            <div className="modal-body">
              {error && <div className="alert-banner alert-error">{error}</div>}
              <form onSubmit={saveMouv}>
                <div className="form-group">
                  <label className="form-label">Lot *</label>
                  <select className="form-select" value={formMouv.lot_id} onChange={e => setFormMouv({...formMouv, lot_id: e.target.value})} required>
                    <option value="">— Sélectionner un lot —</option>
                    {lots.filter(l => l.quantite_actuelle > 0).map(l => (
                      <option key={l.id} value={l.id}>{l.medicament_nom} — {l.numero_lot} (qté: {l.quantite_actuelle})</option>
                    ))}
                  </select>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Type *</label>
                    <select className="form-select" value={formMouv.type_mouvement} onChange={e => setFormMouv({...formMouv, type_mouvement: e.target.value})}>
                      <option value="sortie">Sortie</option>
                      <option value="retour">Retour</option>
                      <option value="destruction">Destruction</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quantité *</label>
                    <input className="form-input" type="number" min="1" value={formMouv.quantite} onChange={e => setFormMouv({...formMouv, quantite: e.target.value})} required />
                  </div>
                </div>
                {formMouv.type_mouvement === 'sortie' && (
                  <div className="form-group">
                    <label className="form-label">Service destinataire</label>
                    <input className="form-input" value={formMouv.service_destination} onChange={e => setFormMouv({...formMouv, service_destination: e.target.value})} placeholder="ex: Urgences, Cardiologie..." />
                  </div>
                )}
                {(formMouv.type_mouvement === 'retour' || formMouv.type_mouvement === 'destruction') && (
                  <div className="form-group">
                    <label className="form-label">Motif</label>
                    <input className="form-input" value={formMouv.motif} onChange={e => setFormMouv({...formMouv, motif: e.target.value})} />
                  </div>
                )}
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setModalMouv(false)}>Annuler</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
