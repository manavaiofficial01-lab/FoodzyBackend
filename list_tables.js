const db = require('./config/db');

db.query('SHOW TABLES', (err, results) => {
  if (err) {
    console.error(err);
  } else {
    console.log('Tables:', results.map(r => Object.values(r)[0]));
  }
  process.exit(0);
});
