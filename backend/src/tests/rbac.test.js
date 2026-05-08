const request = require('supertest');
const app     = require('../app');

let tokens = {};

beforeAll(async () => {
  const accounts = [
    ['admin',      'admin@medipharma.dz'],
    ['pharmacien', 'pharmacien@medipharma.dz'],
    ['stock',      'stock@medipharma.dz'],
    ['medical',    'medical@medipharma.dz'],
  ];
  for (const [key, email] of accounts) {
    const res = await request(app).post('/api/auth/login').send({ email, password: 'password' });
    tokens[key] = res.body.token;
  }
});

describe('RBAC — Contrôle d\'accès par rôle', () => {

  describe('Gestion des utilisateurs (admin seulement)', () => {
    it('admin peut accéder à /users', async () => {
      const res = await request(app).get('/api/users').set('Authorization', `Bearer ${tokens.admin}`);
      expect(res.status).toBe(200);
    });
    it('pharmacien ne peut pas accéder à /users', async () => {
      const res = await request(app).get('/api/users').set('Authorization', `Bearer ${tokens.pharmacien}`);
      expect(res.status).toBe(403);
    });
    it('personnel médical ne peut pas accéder à /users', async () => {
      const res = await request(app).get('/api/users').set('Authorization', `Bearer ${tokens.medical}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Médicaments (lecture pour tous)', () => {
    it('personnel médical peut lire les médicaments', async () => {
      const res = await request(app).get('/api/medications').set('Authorization', `Bearer ${tokens.medical}`);
      expect(res.status).toBe(200);
    });
    it('personnel médical ne peut pas créer un médicament', async () => {
      const res = await request(app).post('/api/medications').set('Authorization', `Bearer ${tokens.medical}`).send({});
      expect(res.status).toBe(403);
    });
  });

  describe('Stocks (interdit au personnel médical)', () => {
    it('responsable de stock peut voir l\'état', async () => {
      const res = await request(app).get('/api/stock/etat').set('Authorization', `Bearer ${tokens.stock}`);
      expect(res.status).toBe(200);
    });
    it('personnel médical ne peut pas voir les stocks', async () => {
      const res = await request(app).get('/api/stock/etat').set('Authorization', `Bearer ${tokens.medical}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Rapports (staff uniquement)', () => {
    it('responsable de stock peut voir le dashboard', async () => {
      const res = await request(app).get('/api/reports/dashboard').set('Authorization', `Bearer ${tokens.stock}`);
      expect(res.status).toBe(200);
    });
    it('personnel médical ne peut pas accéder aux rapports', async () => {
      const res = await request(app).get('/api/reports/dashboard').set('Authorization', `Bearer ${tokens.medical}`);
      expect(res.status).toBe(403);
    });
  });

  describe('IA — restrictions', () => {
    it('personnel médical peut utiliser le chat IA', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${tokens.medical}`)
        .send({ message: 'Bonjour' });
      // 200 (OK), 503 (sans clé), 429 (quota dépassé) — mais PAS 403
      expect([200, 503, 429]).toContain(res.status);
    });
    it('personnel médical ne peut pas accéder à l\'analyse stock', async () => {
      const res = await request(app).get('/api/ai/analyse-stock').set('Authorization', `Bearer ${tokens.medical}`);
      expect(res.status).toBe(403);
    });
  });
});
