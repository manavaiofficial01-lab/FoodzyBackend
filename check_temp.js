const db = require('./config/db');

db.query('SELECT id, full_name, phone, status FROM drivers', (err, drivers) => {
  if (err) {
    console.error('Drivers query error:', err);
    process.exit(1);
  }
  console.log('--- DRIVERS ---');
  console.log(drivers);

  db.query('SELECT id, restaurant_name, customer_name, driver_name, driver_mobile, driver_status, status FROM food_orders ORDER BY id DESC LIMIT 5', (err2, orders) => {
    if (err2) {
      console.error('Orders query error:', err2);
      process.exit(1);
    }
    console.log('--- RECENT FOOD ORDERS ---');
    console.log(orders);
    process.exit(0);
  });
});
