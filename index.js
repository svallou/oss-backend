const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: 'https://svallou.github.io',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.options('*', cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Создаём таблицу для голосования ОСС
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS oss_residents (
        apartment_number INTEGER PRIMARY KEY,
        floor INTEGER NOT NULL,
        name VARCHAR(15) NOT NULL,
        phone TEXT,
        vote TEXT DEFAULT 'none',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Table "oss_residents" is ready.');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}
initDb();

// Получить все данные для отрисовки схемы или проверить статус
app.get('/', async (req, res) => {
  if (req.query.action === 'residents') {
    try {
      const result = await pool.query('SELECT * FROM oss_residents');
      const residents = {};
      result.rows.forEach(row => {
        residents[`apt-${row.apartment_number}`] = {
          name: row.name,
          phone: row.phone,
          vote: row.vote,
          floor: row.floor
        };
      });
      return res.json(residents);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  res.json({ status: 'ok', message: 'OSS Backend is running' });
});

// Сохранить данные жильца
app.post('/', async (req, res) => {
  if (req.query.action === 'residents') {
    const { apartmentNumber, floor, name, phone, vote } = req.body;
    if (!apartmentNumber || !floor || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
      await pool.query(
        `INSERT INTO oss_residents (apartment_number, floor, name, phone, vote)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (apartment_number) 
         DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, vote = EXCLUDED.vote, updated_at = CURRENT_TIMESTAMP`,
        [apartmentNumber, floor, name, phone, vote]
      );
      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  res.status(404).json({ error: 'Unknown action' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`OSS backend listening on port ${PORT}`);
});
