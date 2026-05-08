const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'medipharma',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+01:00'
});

// Vérification de la connexion au démarrage
pool.getConnection()
  .then(conn => {
    console.log('Connexion MySQL établie');
    conn.release();
  })
  .catch(err => {
    console.error('Erreur connexion MySQL:', err.message);
    process.exit(1);
  });

module.exports = pool;
