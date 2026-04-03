const db = require('./config/db');
db.query('SELECT name, image FROM food_categories', (err, results) => {
  if (err) {
    console.error(err);
  } else {
    results.forEach(c => {
      console.log(`${c.name}: ${c.image}`);
    });
  }
  process.exit(0);
});
