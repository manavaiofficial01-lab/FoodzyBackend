const db = require('./config/db');

async function dumpData() {
  db.query('SELECT * FROM category_groups', (err, groups) => {
    console.log('Groups:', JSON.stringify(groups));
    db.query('SELECT * FROM product_categories', (err, categories) => {
      console.log('Categories:', JSON.stringify(categories));
      db.query('SELECT * FROM sub_categories', (err, subcategories) => {
        console.log('Subcategories:', JSON.stringify(subcategories));
        process.exit(0);
      });
    });
  });
}

dumpData();
