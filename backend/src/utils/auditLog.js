const db = require('../config/db');

const log = async (userId, action, tableName, recordId, details, ipAddress) => {
  try {
    await db.execute(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, action, tableName, recordId || null, JSON.stringify(details) || null, ipAddress || null]
    );
  } catch (err) {
    console.error('Erreur audit log:', err.message);
  }
};

module.exports = { log };
