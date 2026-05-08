import { useEffect, useState } from 'react';
import { userService } from '../services/userService';

const ROLES = ['admin','pharmacien','responsable_stock','personnel_medical'];
const ROLE_LABELS = { admin:'Administrateur', pharmacien:'Pharmacien', responsable_stock:'Resp. stock', personnel_medical:'Personnel médical' };
const EMPTY = { nom:'', prenom:'', email:'', password:'', role:'pharmacien' };

export default function UsersPage() {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const load = () => {
    setLoading(true);
    userService.getAll().then(setUsers).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setError(''); setModal(true); };
  const openEdit   = u  => { setEditing(u); setForm({ ...u, password: '' }); setError(''); setModal(true); };

  const handleSave = async e => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { ...form };
      if (editing && !payload.password) delete payload.password;
      if (editing) await userService.update(editing.id, payload);
      else         await userService.create(payload);
      load(); setModal(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    } finally { setSaving(false); }
  };

  const handleToggle = async id => {
    try { await userService.toggleStatut(id); load(); }
    catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Supprimer cet utilisateur définitivement ?')) return;
    try { await userService.remove(id); load(); }
    catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  };

  const roleBadge = r => ({
    admin:             <span className="badge badge-danger">Admin</span>,
    pharmacien:        <span className="badge badge-info">Pharmacien</span>,
    responsable_stock: <span className="badge badge-warning">Resp. stock</span>,
    personnel_medical: <span className="badge badge-gray">Médical</span>
  }[r]);

  return (
    <>
      <div className="page-header">
        <div><h2>Gestion des utilisateurs</h2><p>{users.length} compte(s)</p></div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nouveau compte</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Statut</th><th>Dernière connexion</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.prenom} {u.nom}</strong></td>
                    <td>{u.email}</td>
                    <td>{roleBadge(u.role)}</td>
                    <td>
                      <span className={`badge ${u.statut === 'actif' ? 'badge-success' : u.statut === 'bloque' ? 'badge-danger' : 'badge-gray'}`}>
                        {u.statut}
                      </span>
                    </td>
                    <td>{u.derniere_connexion ? new Date(u.derniere_connexion).toLocaleString('fr-FR') : 'Jamais'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>✏️</button>
                        <button className={`btn btn-sm ${u.statut === 'actif' ? 'btn-warning' : 'btn-success'}`} onClick={() => handleToggle(u.id)}>
                          {u.statut === 'actif' ? '⏸' : '▶'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editing ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h3>
              <button className="btn-icon" onClick={() => setModal(false)}>✕</button>
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
                    <label className="form-label">Prénom *</label>
                    <input className="form-input" value={form.prenom} onChange={e => setForm({...form, prenom: e.target.value})} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">{editing ? 'Nouveau mot de passe (laisser vide = inchangé)' : 'Mot de passe *'}</label>
                  <input className="form-input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required={!editing} minLength={8} />
                </div>
                <div className="form-group">
                  <label className="form-label">Rôle *</label>
                  <select className="form-select" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Annuler</button>
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
