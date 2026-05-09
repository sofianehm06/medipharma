const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../config/db');

const getModel = () => {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY non configurée');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // gemini-1.5-flash : modèle stable, free tier généreux (15 RPM / 1500 RPD)
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
};

// ── Cache serveur (évite de re-appeler Gemini pour les mêmes données) ──
const _cache = new Map();

function getCached(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > entry.ttl) { _cache.delete(key); return null; }
  return entry.data;
}

function setCache(key, data, ttlMs) {
  _cache.set(key, { data, ts: Date.now(), ttl: ttlMs });
}

// ── Retry Gemini avec backoff exponentiel (max 2 tentatives) ──
async function generateWithRetry(prompt, maxRetries = 2) {
  const model = getModel();
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      lastErr = err;
      console.error(`[Gemini] Tentative ${attempt + 1}/${maxRetries + 1} échouée:`, err.message || err);
      const is429 = err.status === 429 || (err.message && err.message.includes('429'));
      if (is429 && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 5000));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// Analyse IA du stock et recommandations
const analyseStock = async (req, res) => {
  try {
    // Cache 5 minutes — évite de re-appeler Gemini à chaque clic
    const cached = getCached('analyseStock');
    if (cached) return res.json({ ...cached, from_cache: true });

    const [stockData] = await db.execute(`
      SELECT m.nom, m.dosage, m.forme, m.seuil_minimum,
        COALESCE(SUM(l.quantite_actuelle), 0) AS stock_total,
        MIN(l.date_peremption) AS prochaine_peremption
      FROM medicaments m
      LEFT JOIN lots l ON l.medicament_id = m.id AND l.quantite_actuelle > 0
      GROUP BY m.id
      ORDER BY stock_total ASC
      LIMIT 20
    `);

    const [alertes] = await db.execute(
      "SELECT COUNT(*) AS nb FROM alertes WHERE statut = 'active'"
    );

    const stockResume = stockData.map(m =>
      `- ${m.nom} ${m.dosage}: stock=${m.stock_total}, seuil=${m.seuil_minimum}, péremption=${m.prochaine_peremption || 'N/A'}`
    ).join('\n');

    const prompt = `Tu es un assistant pharmacien hospitalier expert en gestion des médicaments.

Voici l'état actuel des stocks de la pharmacie hospitalière :
${stockResume}

Alertes actives : ${alertes[0].nb}

Analyse ces données et fournis :
1. Les 3 points critiques les plus urgents
2. Des recommandations de réapprovisionnement
3. Les risques de péremption à surveiller
4. Un conseil d'optimisation des stocks

Réponds en français, de manière concise et professionnelle.`;

    const text = await generateWithRetry(prompt);

    const payload = {
      analyse: text,
      stock_analysé: stockData.length,
      alertes_actives: alertes[0].nb,
      generated_at: new Date().toISOString()
    };

    setCache('analyseStock', payload, 5 * 60 * 1000); // cache 5 min
    res.json(payload);
  } catch (err) {
    console.error('[analyseStock] Erreur:', err.message || err);
    if (err.message?.includes('API_KEY') || err.message?.includes('non configurée') || err.message?.includes('API key not valid')) {
      return res.status(503).json({ error: 'Clé Gemini invalide ou non configurée' });
    }
    if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
      return res.status(429).json({ error: 'Quota IA dépassé, réessayez dans 30 secondes.' });
    }
    res.status(500).json({ error: "Erreur lors de l'analyse IA", details: err.message });
  }
};

const SYSTEM_PROMPTS = {
  admin: `Tu es MediBot, assistant IA de la pharmacie hospitalière MediPharma.
Tu t'adresses à un ADMINISTRATEUR SYSTÈME.
Tu peux l'aider sur : gestion des utilisateurs et droits, configuration du système, audit des accès, médicaments, stocks, péremptions, bonnes pratiques pharmaceutiques, rapports de gestion.
Réponds en français, de façon professionnelle et concise. Ne fournis jamais de diagnostic médical.`,

  pharmacien: `Tu es MediBot, assistant IA de la pharmacie hospitalière MediPharma.
Tu t'adresses à un PHARMACIEN HOSPITALIER.
Tu peux l'aider sur : interactions médicamenteuses, dosages et contre-indications, conservation et stockage, gestion des péremptions, bonnes pratiques de dispensation, réglementation pharmaceutique, substitutions thérapeutiques, préparations hospitalières.
Réponds en français avec un niveau d'expertise pharmaceutique. Ne pose jamais de diagnostic clinique.`,

  responsable_stock: `Tu es MediBot, assistant IA de la pharmacie hospitalière MediPharma.
Tu t'adresses au RESPONSABLE DE STOCK.
Tu peux l'aider sur : gestion des stocks et seuils d'alerte, suivi des péremptions et des lots, optimisation des commandes et réapprovisionnements, lecture des indicateurs de stock, mouvements d'entrée/sortie, organisation physique du stockage.
Réponds en français de façon pratique et orientée gestion logistique. Évite le jargon médical clinique.`,

  personnel_medical: `Tu es MediBot, assistant IA de la pharmacie hospitalière MediPharma.
Tu t'adresses à du PERSONNEL MÉDICAL (médecin, infirmier, aide-soignant).
Tu peux l'aider sur : informations sur les médicaments disponibles à la pharmacie (dosages standards, formes, voies d'administration), interactions courantes, conditions de conservation, procédures de demande de médicaments à la pharmacie.
Réponds en français de façon claire et accessible. Pour tout acte de prescription ou décision thérapeutique, oriente systématiquement vers le médecin responsable ou le pharmacien.`
};

// Chat avec contexte adapté au rôle de l'utilisateur (MediBot)
const chat = async (req, res) => {
  const { message } = req.body;
  const role = req.user?.role || 'personnel_medical';

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message requis' });
  }
  if (message.length > 1000) {
    return res.status(400).json({ error: 'Message trop long (max 1000 caractères)' });
  }

  try {
    const systemPrompt = SYSTEM_PROMPTS[role] || SYSTEM_PROMPTS.personnel_medical;
    const fullPrompt = `${systemPrompt}\n\nQuestion : ${message}`;

    const text = await generateWithRetry(fullPrompt);
    res.json({ response: text, role });
  } catch (err) {
    console.error('[chat] Erreur:', err.message || err);
    if (err.message?.includes('API_KEY') || err.message?.includes('non configurée') || err.message?.includes('API key not valid')) {
      return res.status(503).json({ error: 'Service IA non disponible' });
    }
    if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
      return res.status(429).json({ error: 'Quota IA dépassé, réessayez dans 30 secondes.' });
    }
    res.status(500).json({ error: "Erreur lors de la communication avec l'IA", details: err.message });
  }
};

// Suggestion de commande basée sur la consommation
const suggestionCommande = async (req, res) => {
  try {
    const [data] = await db.execute(`
      SELECT m.nom, m.dosage, m.seuil_minimum,
        COALESCE(SUM(l.quantite_actuelle), 0) AS stock_actuel,
        COALESCE((
          SELECT SUM(sm.quantite)
          FROM stock_mouvements sm
          JOIN lots l2 ON l2.id = sm.lot_id
          WHERE l2.medicament_id = m.id
            AND sm.type_mouvement = 'sortie'
            AND sm.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ), 0) AS consommation_30j
      FROM medicaments m
      LEFT JOIN lots l ON l.medicament_id = m.id AND l.quantite_actuelle > 0
      GROUP BY m.id
      HAVING stock_actuel <= m.seuil_minimum * 2
      ORDER BY stock_actuel ASC
      LIMIT 15
    `);

    if (data.length === 0) {
      return res.json({ message: 'Aucun médicament ne nécessite de commande urgente.', suggestions: [] });
    }

    // Cache 10 minutes pour les suggestions de commande
    const cacheKey = 'suggestionCommande';
    const cached = getCached(cacheKey);
    if (cached) return res.json({ ...cached, from_cache: true });

    const liste = data.map(d =>
      `${d.nom} ${d.dosage}: stock=${d.stock_actuel}, seuil=${d.seuil_minimum}, consommé/30j=${d.consommation_30j}`
    ).join('\n');

    const text = await generateWithRetry(
      `En tant que pharmacien hospitalier, génère une liste de commande prioritaire basée sur ces données :
${liste}

Pour chaque médicament, suggère la quantité à commander (basée sur 2 mois de consommation).
Format de réponse : tableau structuré avec colonnes Médicament | Stock actuel | Quantité suggérée | Priorité.`
    );

    const payload = { suggestion: text, medicaments_concernes: data.length };
    setCache(cacheKey, payload, 10 * 60 * 1000); // cache 10 min
    res.json(payload);
  } catch (err) {
    if (err.status === 429 || err.message?.includes('429')) {
      return res.status(429).json({ error: 'Quota IA dépassé, réessayez dans 30 secondes.' });
    }
    res.status(500).json({ error: 'Erreur lors de la génération des suggestions' });
  }
};

module.exports = { analyseStock, chat, suggestionCommande };
