const request = require('supertest');
const app     = require('../app');

let adminToken, pharmacienToken, medicalToken;

beforeAll(async () => {
  const [a, p, m] = await Promise.all([
    request(app).post('/api/auth/login').send({ email: 'admin@medipharma.dz',       password: 'password' }),
    request(app).post('/api/auth/login').send({ email: 'pharmacien@medipharma.dz',  password: 'password' }),
    request(app).post('/api/auth/login').send({ email: 'medical@medipharma.dz',     password: 'password' }),
  ]);
  adminToken      = a.body.token;
  pharmacienToken = p.body.token;
  medicalToken    = m.body.token;
});

describe('Medications API', () => {

  describe('GET /api/medications', () => {
    it('retourne 401 sans token', async () => {
      const res = await request(app).get('/api/medications');
      expect(res.status).toBe(401);
    });

    it('retourne la liste pour tout utilisateur authentifié', async () => {
      const res = await request(app)
        .get('/api/medications')
        .set('Authorization', `Bearer ${medicalToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('supporte la recherche par nom', async () => {
      const res = await request(app)
        .get('/api/medications?search=Paracetamol')
        .set('Authorization', `Bearer ${pharmacienToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/medications', () => {
    it('retourne 403 pour le personnel médical', async () => {
      const res = await request(app)
        .post('/api/medications')
        .set('Authorization', `Bearer ${medicalToken}`)
        .send({ nom: 'Test', dosage: '100mg', principe_actif: 'TestIA', forme: 'comprimé', laboratoire: 'Lab' });
      expect(res.status).toBe(403);
    });

    it('retourne 400 si champs obligatoires manquants', async () => {
      const res = await request(app)
        .post('/api/medications')
        .set('Authorization', `Bearer ${pharmacienToken}`)
        .send({ nom: 'Incomplet' });
      expect(res.status).toBe(400);
    });

    it('crée un médicament avec les bons droits', async () => {
      const res = await request(app)
        .post('/api/medications')
        .set('Authorization', `Bearer ${pharmacienToken}`)
        .send({
          nom: 'TestMed CI',
          dosage: '250mg',
          principe_actif: 'Testamine',
          forme: 'comprimé',
          laboratoire: 'LabTest CI',
          seuil_minimum: 5
        });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();

      // Nettoyage
      await request(app)
        .delete(`/api/medications/${res.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
    });
  });
});
