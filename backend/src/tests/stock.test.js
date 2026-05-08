const request = require('supertest');
const app     = require('../app');

let pharmacienToken, stockToken;

beforeAll(async () => {
  const [p, s] = await Promise.all([
    request(app).post('/api/auth/login').send({ email: 'pharmacien@medipharma.dz', password: 'password' }),
    request(app).post('/api/auth/login').send({ email: 'stock@medipharma.dz',      password: 'password' }),
  ]);
  pharmacienToken = p.body.token;
  stockToken      = s.body.token;
});

describe('Stock API', () => {

  describe('GET /api/stock/etat', () => {
    it('retourne l\'état des stocks', async () => {
      const res = await request(app)
        .get('/api/stock/etat')
        .set('Authorization', `Bearer ${stockToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // Chaque ligne doit avoir statut_stock
      if (res.body.length > 0) {
        expect(['normal', 'critique', 'rupture']).toContain(res.body[0].statut_stock);
      }
    });
  });

  describe('GET /api/stock/lots', () => {
    it('retourne la liste des lots', async () => {
      const res = await request(app)
        .get('/api/stock/lots')
        .set('Authorization', `Bearer ${pharmacienToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('filtre les lots expirant bientôt', async () => {
      const res = await request(app)
        .get('/api/stock/lots?expire_soon=true')
        .set('Authorization', `Bearer ${pharmacienToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/stock/mouvements', () => {
    it('retourne 400 si quantité insuffisante', async () => {
      // Récupérer un lot existant
      const lotsRes = await request(app)
        .get('/api/stock/lots')
        .set('Authorization', `Bearer ${pharmacienToken}`);

      const lot = lotsRes.body.find(l => l.quantite_actuelle > 0);
      if (!lot) return;

      const res = await request(app)
        .post('/api/stock/mouvements')
        .set('Authorization', `Bearer ${pharmacienToken}`)
        .send({
          lot_id: lot.id,
          type_mouvement: 'sortie',
          quantite: 999999  // quantité impossible
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/insuffisante/i);
    });

    it('retourne 400 pour un type de mouvement invalide', async () => {
      const res = await request(app)
        .post('/api/stock/mouvements')
        .set('Authorization', `Bearer ${pharmacienToken}`)
        .send({ lot_id: 1, type_mouvement: 'invalide', quantite: 5 });
      expect(res.status).toBe(400);
    });
  });
});
