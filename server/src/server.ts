import express from 'express';
import cors from 'cors';
import { postgraphile } from 'postgraphile';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { pool } from './db';
import { KnowledgeBotSchemaPlugin } from './schemaPlugin';

const app = express();

// Express Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Allow large base64 uploads for PDFs

// Simple Authentication Endpoints
app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const checkUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, passwordHash]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, email: user.email }, config.jwtSecret, {
      expiresIn: '24h',
    });

    return res.status(201).json({
      message: 'Signup successful',
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal server error during signup' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, config.jwtSecret, {
      expiresIn: '24h',
    });

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', database: 'connected', ollamaUrl: config.ollamaApiUrl });
});

// Configure PostGraphile Middleware
app.use(
  postgraphile(pool, 'public', {
    watchPg: true,
    graphiql: true,
    enhanceGraphiql: true,
    appendPlugins: [KnowledgeBotSchemaPlugin],
    subscriptions: true,
    dynamicJson: true,
    // Expose all tables for querying via GraphQL
    retryOnInitFail: true,
    showErrorStack: true,
  })
);

// Start Express Server
app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(` KnowledgeBot Backend Server running on port ${config.port}`);
  console.log(` GraphQL Endpoint: http://localhost:${config.port}/graphql`);
  console.log(` GraphiQL UI:      http://localhost:${config.port}/graphiql`);
  console.log(`====================================================`);
});
