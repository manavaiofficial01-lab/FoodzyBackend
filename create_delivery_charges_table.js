const db = require('./config/db');

const createTableQuery = `
CREATE TABLE IF NOT EXISTS delivery_charges (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  min_km INT NOT NULL DEFAULT 0,
  max_km INT NOT NULL,
  base_charge DECIMAL(10, 2) NOT NULL,
  extra_charge_per_group DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  weight_multiplier DECIMAL(5, 2) NULL,
  multicart_fee DECIMAL(10, 2) NOT NULL DEFAULT 25.00,
  platform_fee DECIMAL(10, 2) NOT NULL DEFAULT 15.00,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  weight_rate_per_kg DECIMAL(10, 2) NOT NULL DEFAULT 5.00
);
`;

const insertDefaultRulesQuery = `
INSERT INTO delivery_charges (min_km, max_km, base_charge, multicart_fee, is_active)
VALUES 
  (0, 5, 100.00, 25.00, 1),
  (5, 10, 200.00, 25.00, 1),
  (10, 15, 300.00, 25.00, 1),
  (15, 9999, 400.00, 25.00, 1)
ON DUPLICATE KEY UPDATE base_charge = VALUES(base_charge);
`;

db.query(createTableQuery, (err) => {
  if (err) {
    console.error('Error creating delivery_charges table:', err.message);
    process.exit(1);
  }
  console.log('Table "delivery_charges" created successfully.');

  // Pre-populate with default rules
  db.query(insertDefaultRulesQuery, (insertErr) => {
    if (insertErr) {
      console.error('Error inserting default delivery charges rules:', insertErr.message);
      process.exit(1);
    }
    console.log('Default delivery charges rules populated successfully.');
    process.exit(0);
  });
});
