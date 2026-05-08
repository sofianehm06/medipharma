const request = require('supertest');
const app     = require('../app');

describe('Auth API', () => {

  describe('POST /api/auth/login', () => {
    it('retourne 400 si champs manquants', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('retourne 401 si identifiants incorrects', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'inconnu@test.dz', password: 'mauvais' });
      expect(res.status).toBe(401);
    });

    it('retourne un token JWT pour un compte valide', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@medipharma.dz', password: 'password' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('admin');
    });
  });

  describe('GET /api/auth/me', () => {
    it('retourne 401 sans token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('retourne le profil avec un token valide', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@medipharma.dz', password: 'password' });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginRes.body.token}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('admin@medipharma.dz');
      expect(res.body.password_hash).toBeUndefined();
    });
  });

  describe('GET /api/health', () => {
    it('retourne status OK', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OK');
    });
  });
});
