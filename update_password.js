const db = require('./config/dbPromise');
const bcrypt = require('bcryptjs');

async function run() {
  try {
    const hash = await bcrypt.hash('123456', 10);
    console.log('New Hash:', hash);
    const [res] = await db.query('UPDATE drivers SET password = ? WHERE phone = ?', [hash, '8940645818']);
    console.log('Rows updated:', res.affectedRows);
    
    // Verify the record
    const [rows] = await db.query('SELECT id, phone, password FROM drivers WHERE phone = ?', ['8940645818']);
    console.log('Updated User in DB:', rows[0]);
  } catch (error) {
    console.error('Error running update:', error);
  } finally {
    process.exit(0);
  }
}

run();
