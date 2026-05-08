import { useState, useRef, useEffect } from 'react';
import api from '../services/api';

const TABS = ['🤖 MediBot', '📊 Analyse stock', '🛒 Suggestions commande'];

// ── MediBot Chat ──────────────────────────────────────────────
function MediBotTab() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Bonjour ! Je suis **MediBot**, votre assistant pharmacien hospitalier. Je peux vous aider sur :\n- Les médicaments (interactions, dosages, conservation)\n- La gestion des stocks et péremptions\n- Les bonnes pratiques pharmaceutiques\n\nComment puis-je vous aider ?'
    }
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async e => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/ai/chat', { message: userMsg.content });
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      const msg = err.response?.data?.error || 'Erreur de communication avec l\'IA.';
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${msg}`, error: true }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    'Quelles sont les interactions du Paracétamol avec les anticoagulants ?',
    'Comment stocker les médicaments injectables ?',
    'Quel est le protocole de gestion d\'un lot périmé ?',
    'Quels médicaments nécessitent une chaîne du froid ?'
  ];

  const renderMessage = (msg) => {
    // Rendu basique du markdown (gras, listes)
    const html = msg.content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n/g, '<br/>');
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '65vh' }}>
      {/* Zone messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px',
        background: '#f8fafc', borderRadius: '8px 8px 0 0',
        border: '1px solid var(--border)', borderBottom: 'none'
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: 14
          }}>
            {msg.role === 'assistant' && (
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: '#1e40af', color: '#fff', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 15, marginRight: 8, flexShrink: 0, alignSelf: 'flex-end'
              }}>🤖</div>
            )}
            <div style={{
              maxWidth: '72%', padding: '10px 14px', borderRadius: 12,
              fontSize: 13.5, lineHeight: 1.6,
              background: msg.role === 'user' ? '#1e40af' : msg.error ? '#fee2e2' : '#fff',
              color: msg.role === 'user' ? '#fff' : msg.error ? '#991b1b' : 'var(--text)',
              boxShadow: '0 1px 3px rgba(0,0,0,.08)',
              borderBottomRightRadius: msg.role === 'user' ? 4 : 12,
              borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 12,
            }}>
              {renderMessage(msg)}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: '#1e40af',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15
            }}>🤖</div>
            <div style={{ background: '#fff', padding: '10px 14px', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
              <span style={{ display: 'inline-flex', gap: 4 }}>
                {[0,1,2].map(n => (
                  <span key={n} style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#94a3b8',
                    animation: `bounce 1.2s ${n * 0.2}s infinite`
                  }} />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions rapides */}
      {messages.length <= 1 && (
        <div style={{ padding: '10px 16px', background: '#fff', border: '1px solid var(--border)', borderTop: 'none', borderBottom: 'none' }}>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Suggestions</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {suggestions.map(s => (
              <button key={s} onClick={() => setInput(s)}
                style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 20, padding: '4px 12px', fontSize: 12, cursor: 'pointer', color: '#475569' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Zone saisie */}
      <form onSubmit={sendMessage} style={{
        display: 'flex', gap: 8, padding: '12px 16px',
        background: '#fff', border: '1px solid var(--border)',
        borderRadius: '0 0 8px 8px', alignItems: 'center'
      }}>
        <input
          className="form-input"
          style={{ flex: 1 }}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Posez votre question sur les médicaments..."
          disabled={loading}
        />
        <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
          {loading ? '...' : '➤ Envoyer'}
        </button>
      </form>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

// ── Analyse Stock ─────────────────────────────────────────────
function AnalyseStockTab() {
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const analyse = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const { data } = await api.get('/ai/analyse-stock');
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'analyse');
    } finally {
      setLoading(false);
    }
  };

  const formatAnalyse = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      if (!line.trim()) return <br key={i} />;
      const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      if (/^\d+\./.test(line)) {
        return <p key={i} style={{ margin: '6px 0', paddingLeft: 8, borderLeft: '3px solid #3b82f6' }}
          dangerouslySetInnerHTML={{ __html: bold }} />;
      }
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return <li key={i} style={{ margin: '4px 0', marginLeft: 16, listStyle: 'disc' }}
          dangerouslySetInnerHTML={{ __html: bold.replace(/^[-•]\s/, '') }} />;
      }
      return <p key={i} style={{ margin: '4px 0' }} dangerouslySetInnerHTML={{ __html: bold }} />;
    });
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Analyse intelligente des stocks</span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginBottom: 16 }}>
          L'IA analyse l'état actuel de vos stocks, identifie les points critiques et vous fournit
          des recommandations personnalisées basées sur vos données réelles.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          {[
            { icon: '🔍', label: 'Détection des ruptures' },
            { icon: '⚠️', label: 'Alertes péremption' },
            { icon: '📦', label: 'Niveaux critiques' },
            { icon: '💡', label: 'Recommandations' },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', padding: '8px 14px', borderRadius: 8, fontSize: 13, color: '#475569', border: '1px solid #e2e8f0' }}>
              <span>{f.icon}</span> {f.label}
            </div>
          ))}
        </div>

        <button className="btn btn-primary" onClick={analyse} disabled={loading} style={{ gap: 8 }}>
          {loading ? (
            <><span className="spinner" style={{ width: 16, height: 16 }} /> Analyse en cours...</>
          ) : (
            '🚀 Lancer l\'analyse IA'
          )}
        </button>
      </div>

      {error && <div className="alert-banner alert-error">{error}</div>}

      {result && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">📋 Rapport d'analyse</span>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#64748b' }}>
              <span>📦 {result.stock_analysé} médicaments</span>
              <span>🔔 {result.alertes_actives} alertes actives</span>
              <span>🕐 {new Date(result.generated_at).toLocaleTimeString('fr-FR')}</span>
            </div>
          </div>
          <div style={{
            background: '#f8fafc', borderRadius: 8, padding: '16px 20px',
            fontSize: 14, lineHeight: 1.8, border: '1px solid #e2e8f0'
          }}>
            {formatAnalyse(result.analyse)}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={analyse}>🔄 Actualiser</button>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              navigator.clipboard.writeText(result.analyse);
            }}>📋 Copier</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Suggestions commande ──────────────────────────────────────
function SuggestionsCommandeTab() {
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const generer = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const { data } = await api.get('/ai/suggestion-commande');
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la génération');
    } finally {
      setLoading(false);
    }
  };

  const formatSuggestion = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      if (!line.trim()) return null;
      const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      if (line.includes('|')) {
        const cells = line.split('|').map(c => c.trim()).filter(Boolean);
        const isHeader = line.includes('---');
        if (isHeader) return null;
        return (
          <tr key={i}>
            {cells.map((c, j) => (
              <td key={j} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', fontSize: 13 }}
                dangerouslySetInnerHTML={{ __html: c }} />
            ))}
          </tr>
        );
      }
      return <p key={i} style={{ margin: '4px 0', fontSize: 13.5 }} dangerouslySetInnerHTML={{ __html: bold }} />;
    });
  };

  const hasTable = result?.suggestion?.includes('|');

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Suggestions de réapprovisionnement</span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginBottom: 16 }}>
          L'IA identifie les médicaments dont le stock est insuffisant et calcule les quantités
          à commander en se basant sur la consommation des 30 derniers jours.
        </p>

        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
          <strong style={{ color: '#1d4ed8' }}>💡 Comment ça fonctionne :</strong>
          <ul style={{ marginTop: 6, paddingLeft: 18, color: '#1e40af', lineHeight: 1.8 }}>
            <li>Analyse les médicaments dont le stock ≤ 2× le seuil minimum</li>
            <li>Calcule la consommation moyenne sur 30 jours</li>
            <li>Suggère une quantité couvrant 2 mois de consommation</li>
            <li>Classe les commandes par priorité (critique, urgent, normal)</li>
          </ul>
        </div>

        <button className="btn btn-success" onClick={generer} disabled={loading}>
          {loading ? (
            <><span className="spinner" style={{ width: 16, height: 16 }} /> Génération en cours...</>
          ) : '🛒 Générer les suggestions'}
        </button>
      </div>

      {error && <div className="alert-banner alert-error">{error}</div>}

      {result && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">📋 Bon de commande suggéré</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              {result.medicaments_concernes} médicament(s) concerné(s)
            </span>
          </div>

          {result.message ? (
            <div className="alert-banner alert-success">{result.message}</div>
          ) : (
            <div style={{ background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              {hasTable ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      {['Médicament', 'Stock actuel', 'Quantité suggérée', 'Priorité'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.04em', border: '1px solid #e2e8f0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>{formatSuggestion(result.suggestion)}</tbody>
                </table>
              ) : (
                <div style={{ padding: '16px 20px' }}>
                  {formatSuggestion(result.suggestion)}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={generer}>🔄 Régénérer</button>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              const text = result.suggestion || result.message;
              navigator.clipboard.writeText(text);
            }}>📋 Copier</button>
            <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>🖨️ Imprimer</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────
export default function AIPage() {
  const [tab, setTab] = useState(0);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Assistant IA — MediBot</h2>
          <p>Analyse intelligente, chatbot pharmacien et suggestions de commande via OpenAI</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '6px 14px', fontSize: 13, color: '#15803d' }}>
          <span>🟢</span> Propulsé par GPT-4o mini
        </div>
      </div>

      {/* Navigation par onglets */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f1f5f9', padding: 4, borderRadius: 10, width: 'fit-content' }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontWeight: tab === i ? 600 : 400, fontSize: 13.5,
            background: tab === i ? '#fff' : 'transparent',
            color: tab === i ? '#1e40af' : '#64748b',
            boxShadow: tab === i ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
            transition: 'all .15s'
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* Disclaimer */}
      <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 12.5, color: '#92400e', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span>⚠️</span>
        <span>Les informations fournies par l'IA sont indicatives. Consultez toujours un professionnel de santé qualifié pour les décisions médicales critiques.</span>
      </div>

      {tab === 0 && <MediBotTab />}
      {tab === 1 && <AnalyseStockTab />}
      {tab === 2 && <SuggestionsCommandeTab />}
    </>
  );
}
