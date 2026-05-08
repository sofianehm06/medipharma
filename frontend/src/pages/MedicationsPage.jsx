import { useEffect, useState } from 'react';
import { medicationService } from '../services/medicationService';
import { useAuth } from '../context/AuthContext';

const FORMES = ['comprimé','gélule','sirop','injectable','pommade','patch','autre'];
const EMPTY  = { nom:'', dosage:'', principe_actif:'', forme:'comprimé', laboratoire:'', code_cip:'', seuil_minimum:10, description:'' };

export default function MedicationsPage() {
  const [meds, setMeds]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [formeFilter, setFormeFilter] = useState('');
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const { can } = useAuth();

  const load = () => {
    setLoading(true);
    medicationService.getAll({ search, forme: formeFilter })
      .then(setMeds).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, formeFilter]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setError(''); setModal(true); };
  const openEdit   = m  => { setEditing(m); setForm({ ...m }); setError(''); setModal(true); };
  const closeModal = () => setModal(false);

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editing) await medicationService.update(editing.id, form);
      else         await medicationService.create(form);
      load(); closeModal();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Supprimer ce médicament ?')) return;
    try {
      await medicationService.remove(id);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur suppression');
    }
  };

  const stockBadge = (total, seuil) => {
    if (total === 0) return <span className="badge badge-danger">Rupture</span>;
    if (total <= seuil) return <span className="badge badge-warning">Critique</span>;
    return <span className="badge badge-success">Normal</span>;
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Médicaments</h2>
          <p>{meds.length} médicament(s) dans le catalogue</p>
        </div>
        {can('admin', 'pharmacien') && (
          <button className="btn btn-primary" onClick={openCreate}>+ Ajouter</button>
        )}
      </div>

      <div className="filters-bar">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input className="form-input" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" value={formeFilter} onChange={e => setFormeFilter(e.target.value)}>
          <option value="">Toutes les formes</option>
          {FORMES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : meds.length === 0 ? (
          <div className="empty-state"><div className="icon">💊</div><p>Aucun médicament trouvé</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nom / Dosage</th><th>Principe actif</th><th>Forme</th>
                  <th>Laboratoire</th><th>Stock total</th><th>Statut</th>
                  {can('admin', 'pharmacien') && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {meds.map(m => (
                  <tr key={m.id}>
                    <td><strong>{m.nom}</strong><br/><small style={{color:'#64748b'}}>{m.dosage} · CIP: {m.code_cip || '—'}</small></td>
                    <td>{m.principe_actif}</td>
                    <td><span className="badge badge-info">{m.forme}</span></td>
                    <td>{m.laboratoire}</td>
                    <td><strong>{m.stock_total}</strong> u</td>
                    <td>{stockBadge(m.stock_total, m.seuil_minimum)}</td>
                    {can('admin', 'pharmacien') && (
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(m)}>✏️ Modifier</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m.id)}>🗑️</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editing ? 'Modifier le médicament' : 'Nouveau médicament'}</h3>
              <button className="btn-icon" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert-banner alert-error">{error}</div>}
              <form onSubmit={handleSave}>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Nom *</label>
                    <input className="form-input" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dosage *</label>
                    <input className="form-input" value={form.dosage} onChange={e => setForm({...form, dosage: e.target.value})} required placeholder="ex: 500mg" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Principe actif *</label>
                  <input className="form-input" value={form.principe_actif} onChange={e => setForm({...form, principe_actif: e.target.value})} required />
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Forme *</label>
                    <select className="form-select" value={form.forme} onChange={e => setForm({...form, forme: e.target.value})}>
                      {FORMES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Laboratoire *</label>
                    <input className="form-input" value={form.laboratoire} onChange={e => setForm({...form, laboratoire: e.target.value})} required />
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Code CIP</label>
                    <input className="form-input" value={form.code_cip} onChange={e => setForm({...form, code_cip: e.target.value})} placeholder="13 chiffres" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Seuil minimum</label>
                    <input className="form-input" type="number" min="1" value={form.seuil_minimum} onChange={e => setForm({...form, seuil_minimum: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={closeModal}>Annuler</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Sauvegarde...' : 'Enregistrer'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
