import { Router, Request, Response } from 'express';

const router = Router();

// Simple test login endpoint for debugging / console tests
// POST /api/test-login
// Body: { email: string, password: string }
// Returns JSON echoing request and a simulated success for a known test credential
router.post('/test-login', (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  const origin = req.get('origin') || null;

  // Simple simulated check (DO NOT use in production)
  const isTestUser = email === 'test@example.com' && password === 'password';

  if (isTestUser) {
    return res.json({
      ok: true,
      message: 'Test login successful',
      origin,
      body: { email }
    });
  }

  return res.status(401).json({
    ok: false,
    message: 'Invalid credentials (test endpoint)',
    origin,
    body: { email }
  });
});

export default router;
