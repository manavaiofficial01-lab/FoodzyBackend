const db = require('./config/db');

async function checkTables() {
  const tables = ['category_groups', 'product_categories', 'sub_categories'];
  for (const table of tables) {
    db.query(`DESCRIBE \`${table}\``, (err, results) => {
      if (err) {
        console.log(`Table ${table} error: ${err.message}`);
      } else {
        console.log(`Table ${table} structure: ${JSON.stringify(results)}`);
      }
      if (table === tables[tables.length - 1]) process.exit(0);
    });
  }
}

checkTables();
