const OpenAI = require('openai');
const db = require('../config/db');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
      temperature: 0.3
    });

    res.json({
      analyse: completion.choices[0].message.content,
      stock_analysé: stockData.length,
      alertes_actives: alertes[0].nb,
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    if (err.code === 'invalid_api_key') {
      return res.status(503).json({ error: 'Clé OpenAI invalide ou non configurée' });
    }
    res.status(500).json({ error: 'Erreur lors de l\'analyse IA' });
  }
};

// Chat libre avec le contexte pharmacie
const chat = async (req, res) => {
  const { message } = req.body;

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message requis' });
  }

  if (message.length > 1000) {
    return res.status(400).json({ error: 'Message trop long (max 1000 caractères)' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Tu es MediBot, un assistant spécialisé pour la pharmacie hospitalière.
Tu aides le personnel (pharmaciens, administrateurs, responsables de stock) avec :
- Des informations sur les médicaments (interactions, dosages, conservation)
- La gestion des stocks et des péremptions
- Les bonnes pratiques pharmaceutiques hospitalières
- L'interprétation des données de stock
Réponds toujours en français, de manière professionnelle et concise.
N'invente jamais de données médicales critiques — oriente vers un médecin si nécessaire.`
        },
        { role: 'user', content: message }
      ],
      max_tokens: 500,
      temperature: 0.5
    });

    res.json({
      response: completion.choices[0].message.content,
      tokens_used: completion.usage?.total_tokens
    });
  } catch (err) {
    if (err.code === 'invalid_api_key') {
      return res.status(503).json({ error: 'Service IA non disponible' });
    }
    res.status(500).json({ error: 'Erreur lors de la communication avec l\'IA' });
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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `En tant que pharmacien hospitalier, génère une liste de commande prioritaire basée sur ces données :
${liste}

Pour chaque médicament, suggère la quantité à commander (basée sur 2 mois de consommation).
Format de réponse : tableau structuré avec colonnes Médicament | Stock actuel | Quantité suggérée | Priorité.`
      }],
      max_tokens: 500,
      temperature: 0.2
    });

    res.json({
      suggestion: completion.choices[0].message.content,
      medicaments_concernes: data.length
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la génération des suggestions' });
  }
};

module.exports = { analyseStock, chat, suggestionCommande };
