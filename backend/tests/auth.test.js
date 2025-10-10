const request = require('supertest');
const app = require('../server');

describe('Authentication Endpoints', () => {
  describe('POST /api/auth/office365', () => {
    it('should return 400 for missing access token', async () => {
      const response = await request(app)
        .post('/api/auth/office365')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid access token', async () => {
      const response = await request(app)
        .post('/api/auth/office365')
        .send({ accessToken: 'invalid_token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('GET /health', () => {
    it('should return 200 for health check', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
    });
  });
});
