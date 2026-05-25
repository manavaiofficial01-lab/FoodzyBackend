const db = require('./config/db');

const createTableQuery = `
CREATE TABLE IF NOT EXISTS food_cart_items (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_mobile VARCHAR(50) NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_image TEXT NULL,
  price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  size VARCHAR(100) NOT NULL DEFAULT '',
  color VARCHAR(100) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  restaurant VARCHAR(255) NULL,
  latitude DECIMAL(10, 8) NULL,
  longitude DECIMAL(11, 8) NULL,
  UNIQUE KEY unique_cart_item (user_mobile, product_id, size, color)
);
`;

db.query(createTableQuery, (err, results) => {
  if (err) {
    console.error('Error creating food_cart_items table in MySQL:', err);
  } else {
    console.log('Table "food_cart_items" created successfully in local MySQL database "foodzy".');
  }
  process.exit(err ? 1 : 0);
});
