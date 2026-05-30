const db = require('./config/dbPromise');
const bcrypt = require('bcryptjs');

async function test() {
  try {
    const [tables] = await db.query('SHOW TABLES');
    console.log('Tables in database:', tables);
    
    for (const t of tables) {
      const tableName = Object.values(t)[0];
      if (tableName === 'driver' || tableName === 'drivers') {
        const [rows] = await db.query(`SELECT * FROM ${tableName}`);
        console.log(`Content of table "${tableName}":`, rows);
        for (const row of rows) {
          const pass = row.password;
          if (pass) {
            const matches = await bcrypt.compare('123456', pass);
            console.log(`  Row ID ${row.id}, Phone ${row.phone || row.driver_phone || row.mobile}: Matches '123456'? ${matches}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    process.exit(0);
  }
}

test();
