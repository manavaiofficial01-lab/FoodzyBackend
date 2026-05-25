const db = require('./config/db');

async function testDbOperations() {
  console.log('Starting MySQL food_cart_items tests...');
  
  const testMobile = '+919999999999';
  const testProductId = 12345;
  const testSize = 'Large';
  const testColor = 'Red';

  // 1. Clear any existing test data
  await new Promise((resolve) => {
    db.query('DELETE FROM food_cart_items WHERE user_mobile = ?', [testMobile], () => resolve());
  });
  console.log('Cleaned old test records.');

  // 2. Test Insert (Upsert)
  const insertSql = `
    INSERT INTO food_cart_items 
    (id, user_mobile, product_id, product_name, product_image, price, original_price, quantity, size, color, restaurant, latitude, longitude)
    VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const insertValues = [
    testMobile, testProductId, 'Test Biryani', 'http://image.url', 150.00, 200.00, 1, testSize, testColor, 'Guhan Veg and Non Veg', 10.123, 78.456
  ];
  
  await new Promise((resolve, reject) => {
    db.query(insertSql, insertValues, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
  console.log('Inserted test cart item successfully.');

  // 3. Test Select
  const items = await new Promise((resolve, reject) => {
    db.query('SELECT * FROM food_cart_items WHERE user_mobile = ?', [testMobile], (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
  
  if (items.length !== 1) {
    throw new Error(`Expected 1 item, found ${items.length}`);
  }
  const item = items[0];
  console.log('Verified select operation. Retreived item:', item.product_name, 'Qty:', item.quantity);

  // 4. Test ON DUPLICATE KEY UPDATE (Upsert update quantity)
  const upsertSql = `
    INSERT INTO food_cart_items 
    (id, user_mobile, product_id, product_name, product_image, price, original_price, quantity, size, color, restaurant, latitude, longitude)
    VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)
  `;
  const upsertValues = [
    testMobile, testProductId, 'Test Biryani', 'http://image.url', 150.00, 200.00, 5, testSize, testColor, 'Guhan Veg and Non Veg', 10.123, 78.456
  ];

  await new Promise((resolve, reject) => {
    db.query(upsertSql, upsertValues, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });

  const updatedItems = await new Promise((resolve, reject) => {
    db.query('SELECT * FROM food_cart_items WHERE user_mobile = ?', [testMobile], (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });

  if (updatedItems[0].quantity !== 5) {
    throw new Error(`Expected quantity to be 5, but got ${updatedItems[0].quantity}`);
  }
  console.log('Verified upsert update quantity operation. New Qty:', updatedItems[0].quantity);

  // 5. Test Delete
  await new Promise((resolve, reject) => {
    db.query('DELETE FROM food_cart_items WHERE user_mobile = ?', [testMobile], (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });

  const emptyItems = await new Promise((resolve, reject) => {
    db.query('SELECT * FROM food_cart_items WHERE user_mobile = ?', [testMobile], (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });

  if (emptyItems.length !== 0) {
    throw new Error('Cart was not cleared.');
  }
  console.log('Verified delete operation successfully.');
  console.log('🎉 All MySQL tests passed!');
  process.exit(0);
}

testDbOperations().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
