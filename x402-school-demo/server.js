import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';

const app = new Hono();
app.use('/*', cors());

// A simplified middleware that mimics the exact x402 behavior
const mockX402Middleware = async (c, next) => {
  // If the client hasn't attached a payment signature, reject with 402
  if (!c.req.header('PAYMENT-SIGNATURE')) {
    c.status(402);
    // Send the x402 required headers
    c.header('PAYMENT-REQUIRED', 'price=2.00, network=base, asset=USDC');
    return c.json({ error: 'Payment Required', price: '2.00' });
  }
  // If they paid, let them through!
  await next();
};

// Apply our mock paywall to the endpoints
app.use('/api/bot-alpha/solve', mockX402Middleware);
app.use('/api/bot-beta/solve', mockX402Middleware);
app.use('/api/bot-gamma/solve', mockX402Middleware);

// The actual math answers
app.get('/api/bot-alpha/solve', (c) => c.json({ bot: 'Alpha', answer: 42 }));
app.get('/api/bot-beta/solve', (c) => c.json({ bot: 'Beta', answer: 42 }));
app.get('/api/bot-gamma/solve', (c) => c.json({ bot: 'Gamma', answer: 42 }));

serve({ fetch: app.fetch, port: 3000 }, () => {
  console.log('🏫 x402 Bot School Server running on port 3000');
});