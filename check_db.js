const db = require('./config/db');
db.query('SELECT open_time, close_time FROM restaurants WHERE open_time IS NOT NULL LIMIT 1', (err, results) => {
  if (err || results.length === 0) {
    console.log(err || 'No results');
  } else {
    console.log(results[0]);
  }
  process.exit(0);
});
