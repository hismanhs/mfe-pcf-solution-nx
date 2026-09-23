const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key';

const users = [
  {
    email: 'demo@contoso.com',
    password: 'Pass@123',
    name: 'Demo User',
  },
];

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'mfe-auth-api' });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = users.find(
    (candidate) =>
      candidate.email.toLowerCase() === String(email).trim().toLowerCase() &&
      candidate.password === String(password)
  );

  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const token = jwt.sign(
    {
      sub: user.email,
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  return res.json({
    token,
    user: {
      email: user.email,
      name: user.name,
    },
  });
});

app.get('/api/me', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Missing bearer token.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return res.json({
      ok: true,
      user: {
        email: payload.email,
        name: payload.name,
      },
    });
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
});

app.listen(PORT, () => {
  console.log(`Auth API running on http://localhost:${PORT}`);
});
