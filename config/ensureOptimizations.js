const db = require('./db');

/**
 * Checks if a specific index exists on a table, and if not, creates it.
 */
const ensureIndex = (tableName, indexName, columnsSql) => {
  return new Promise((resolve) => {
    // Check if index exists
    db.query(
      `SHOW INDEX FROM ${tableName} WHERE Key_name = ?`,
      [indexName],
      (err, results) => {
        if (err) {
          // If the table doesn't exist yet, we ignore and resolve
          console.error(`[DB-OPTIMIZE] Error checking index ${indexName} on ${tableName}:`, err.message);
          return resolve();
        }

        if (results && results.length > 0) {
          // Index already exists
          return resolve();
        }

        // Create index
        console.log(`[DB-OPTIMIZE] Creating index ${indexName} on ${tableName} for columns: ${columnsSql}...`);
        db.query(
          `ALTER TABLE ${tableName} ADD INDEX ${indexName} (${columnsSql})`,
          (createErr) => {
            if (createErr) {
              console.error(`[DB-OPTIMIZE] Failed to create index ${indexName} on ${tableName}:`, createErr.message);
            } else {
              console.log(`[DB-OPTIMIZE] Successfully created index ${indexName} on ${tableName}`);
            }
            resolve();
          }
        );
      }
    );
  });
};

const ensureDatabaseOptimizations = async () => {
  console.log('⚡ Starting Database Query Optimizations (100M+ records check)...');
  
  // 1. Indexes for food_orders
  await ensureIndex('food_orders', 'idx_fo_driver_mobile_status', 'driver_mobile, driver_status');
  await ensureIndex('food_orders', 'idx_fo_user_id', 'user_id');
  await ensureIndex('food_orders', 'idx_fo_customer_phone', 'customer_phone');
  await ensureIndex('food_orders', 'idx_fo_created_at', 'created_at');
  
  // 2. Indexes for ecommerce_orders
  await ensureIndex('ecommerce_orders', 'idx_eo_driver_mobile_status', 'driver_mobile, driver_status');
  await ensureIndex('ecommerce_orders', 'idx_eo_user_id', 'user_id');
  await ensureIndex('ecommerce_orders', 'idx_eo_customer_phone', 'customer_phone');
  await ensureIndex('ecommerce_orders', 'idx_eo_created_at', 'created_at');
  
  // 3. Indexes for drivers
  await ensureIndex('drivers', 'idx_drivers_phone', 'phone');
  await ensureIndex('drivers', 'idx_drivers_is_online_status', 'is_online, status');
  
  console.log('✅ Database Query Optimizations verified/applied.');
};

module.exports = { ensureDatabaseOptimizations };
