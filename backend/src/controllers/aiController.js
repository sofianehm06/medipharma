const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../config/db');

const getModel = () => {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY non configurée');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
};

// Analyse IA du stock et recommandations
const analyseStock = async (req, res) => {
  try {
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

    const model = getModel();
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    res.json({
      analyse: text,
      stock_analysé: stockData.length,
      alertes_actives: alertes[0].nb,
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    if (err.message.includes('API_KEY') || err.message.includes('non configurée')) {
      return res.status(503).json({ error: 'Clé Gemini invalide ou non configurée' });
    }
    if (err.status === 429) {
      return res.status(429).json({ error: 'Quota IA dépassé, réessayez dans 30 secondes.' });
    }
    res.status(500).json({ error: "Erreur lors de l'analyse IA" });
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
    const model = getModel();
    const systemPrompt = SYSTEM_PROMPTS[role] || SYSTEM_PROMPTS.personnel_medical;
    const fullPrompt = `${systemPrompt}\n\nQuestion : ${message}`;

    const result = await model.generateContent(fullPrompt);
    const text = result.response.text();

    res.json({ response: text, role });
  } catch (err) {
    if (err.message.includes('API_KEY') || err.message.includes('non configurée')) {
      return res.status(503).json({ error: 'Service IA non disponible' });
    }
    if (err.status === 429) {
      return res.status(429).json({ error: 'Quota IA dépassé, réessayez dans 30 secondes.' });
    }
    res.status(500).json({ error: "Erreur lors de la communication avec l'IA" });
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

    const liste = data.map(d =>
      `${d.nom} ${d.dosage}: stock=${d.stock_actuel}, seuil=${d.seuil_minimum}, consommé/30j=${d.consommation_30j}`
    ).join('\n');

    const model = getModel();
    const result = await model.generateContent(
      `En tant que pharmacien hospitalier, génère une liste de commande prioritaire basée sur ces données :
${liste}

Pour chaque médicament, suggère la quantité à commander (basée sur 2 mois de consommation).
Format de réponse : tableau structuré avec colonnes Médicament | Stock actuel | Quantité suggérée | Priorité.`
    );

    res.json({
      suggestion: result.response.text(),
      medicaments_concernes: data.length
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la génération des suggestions' });
  }
};

module.exports = { analyseStock, chat, suggestionCommande };
