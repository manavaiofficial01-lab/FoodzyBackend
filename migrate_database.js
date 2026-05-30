const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const dns = require('dns');

// Custom DNS lookup with public DNS fallback for restricted ISP environments
const customLookup = (hostname, options, callback) => {
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return dns.lookup(hostname, options, callback);
  }
  
  dns.lookup(hostname, options, (err, address, family) => {
    if (err) {
      console.log(`[DNS] OS lookup failed for ${hostname}. Querying fallback public DNS (Google/Cloudflare)...`);
      const dnsPromises = require('dns').promises;
      dnsPromises.setServers(['8.8.8.8', '1.1.1.1']);
      dnsPromises.resolve4(hostname)
        .then(addresses => {
          if (addresses && addresses.length > 0) {
            console.log(`[DNS] Resolved ${hostname} to ${addresses[0]} via public DNS.`);
            callback(null, addresses[0], 4);
          } else {
            callback(err);
          }
        })
        .catch(fallbackErr => {
          console.error(`[DNS] Public DNS fallback failed for ${hostname}:`, fallbackErr.message);
          callback(err);
        });
    } else {
      callback(null, address, family);
    }
  });
};

const { execSync } = require('child_process');

function resolveHostSync(host) {
  if (!host || host === 'localhost' || host === '127.0.0.1') return host;
  try {
    console.log(`[DNS-PRE] Synchronously resolving hostname via nslookup: ${host}`);
    const stdout = execSync(`nslookup ${host} 8.8.8.8`, { timeout: 5000 }).toString();
    const parts = stdout.split(/Name:/i);
    if (parts.length > 1) {
      const ipMatches = parts[1].match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g);
      if (ipMatches) {
        console.log(`[DNS-PRE] Successfully resolved ${host} to IP: ${ipMatches[0]}`);
        return ipMatches[0];
      }
    }
  } catch (e) {
    console.error("[DNS-PRE] nslookup Sync error:", e.message);
  }
  return host;
}

// Load environment variables from .env
dotenv.config();

async function migrate() {
  console.log('🔄 Loading database configuration...');
  
  // Cloud settings from .env
  const rawHost = process.env.DB_HOST;
  const cloudHost = resolveHostSync(rawHost);
  const cloudUser = process.env.DB_USER;
  const cloudPassword = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';
  const cloudPort = parseInt(process.env.DB_PORT || '3306');
  const cloudDb = process.env.DB_NAME;

  console.log(`☁️ Target DB Server Details:
  - Host: ${cloudHost} (raw: ${rawHost})
  - Port: ${cloudPort}
  - User: ${cloudUser}
  - Database: ${cloudDb}
  `);

  if (!cloudHost) {
    console.error('❌ Error: DB_HOST is not defined in your .env file!');
    process.exit(1);
  }

  // Connect to target database
  console.log('🔄 Connecting to target database server...');
  const cloudConnection = await mysql.createConnection({
    host: cloudHost,
    user: cloudUser,
    password: cloudPassword,
    port: cloudPort,
    database: cloudDb,
    lookup: customLookup,
    multipleStatements: true
  });
  console.log('✅ Connected to target database server.');

  // Local database settings for reading old data
  const localHost = '127.0.0.1';
  const localUser = 'root';
  const localPassword = ''; 
  const localPort = 3306;
  const localDb = 'foodzy';

  let localConnection = null;
  let localTables = [];

  // Connect to local database if we're migrating to a remote cloud DB
  if (cloudHost !== '127.0.0.1' && cloudHost !== 'localhost') {
    try {
      console.log('🔄 Connecting to local database to read existing data...');
      localConnection = await mysql.createConnection({
        host: localHost,
        user: localUser,
        password: localPassword,
        port: localPort,
        database: localDb
      });
      console.log('✅ Connected to local database.');

      const [tables] = await localConnection.query('SHOW TABLES');
      localTables = tables.map(t => Object.values(t)[0]);
      console.log(`Found ${localTables.length} tables in local database "${localDb}".`);
    } catch (err) {
      console.log('⚠️ Could not connect to local MySQL database or "foodzy" database not found. Skipping local data migration. Error:', err.message);
    }
  }

  // Copy local tables to cloud database
  if (localConnection && localTables.length > 0) {
    console.log(`🔄 Migrating local tables and data to cloud database "${cloudDb}"...`);
    for (const tableName of localTables) {
      console.log(`  📦 Migrating table "${tableName}"...`);
      try {
        // Get schema
        const [[schemaRow]] = await localConnection.query(`SHOW CREATE TABLE \`${tableName}\``);
        let createTableSql = schemaRow['Create Table'];
        
        // Setup table on Cloud (Drop if exists to ensure matching schemas)
        await cloudConnection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
        await cloudConnection.query(createTableSql);

        // Fetch data from local
        const [rows] = await localConnection.query(`SELECT * FROM \`${tableName}\``);
        if (rows.length > 0) {
          const keys = Object.keys(rows[0]).map(k => `\`${k}\``).join(', ');
          const valuesPlaceholder = Object.keys(rows[0]).map(() => '?').join(', ');
          const insertSql = `INSERT INTO \`${tableName}\` (${keys}) VALUES (${valuesPlaceholder})`;
          
          for (const row of rows) {
            await cloudConnection.query(insertSql, Object.values(row));
          }
          console.log(`    ✅ Copied ${rows.length} rows to "${tableName}".`);
        } else {
          console.log(`    ✅ Table "${tableName}" is empty.`);
        }
      } catch (tableErr) {
        console.warn(`  ⚠️ Warning: Failed to migrate table "${tableName}". Error: ${tableErr.message}`);
      }
    }
    await localConnection.end();
  }

  // Create driver-related tables requested by user
  const driverTables = [
    // 1. drivers
    `CREATE TABLE IF NOT EXISTS \`drivers\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`full_name\` varchar(100) NOT NULL,
      \`phone\` varchar(15) NOT NULL,
      \`email\` varchar(100) DEFAULT NULL,
      \`password\` varchar(255) NOT NULL,
      \`profile_image\` text,
      \`vehicle_type\` varchar(50) DEFAULT NULL,
      \`vehicle_number\` varchar(30) DEFAULT NULL,
      \`is_online\` tinyint(1) DEFAULT '0',
      \`current_latitude\` decimal(10,8) DEFAULT NULL,
      \`current_longitude\` decimal(11,8) DEFAULT NULL,
      \`rating\` decimal(2,1) DEFAULT '5.0',
      \`total_orders\` int DEFAULT '0',
      \`total_earnings\` decimal(10,2) DEFAULT '0.00',
      \`today_earnings\` decimal(10,2) DEFAULT '0.00',
      \`login_hours\` int DEFAULT '0',
      \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      \`completed_orders\` int DEFAULT '0',
      \`bank_name\` varchar(100) DEFAULT NULL,
      \`account_holder\` varchar(100) DEFAULT NULL,
      \`account_number\` varchar(50) DEFAULT NULL,
      \`ifsc_code\` varchar(20) DEFAULT NULL,
      \`bank_verified\` tinyint(1) DEFAULT '0',
      \`current_area\` varchar(100) DEFAULT NULL,
      \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`phone\` (\`phone\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 2. orders
    `CREATE TABLE IF NOT EXISTS \`orders\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`customer_name\` varchar(100) DEFAULT NULL,
      \`customer_phone\` varchar(15) DEFAULT NULL,
      \`restaurant_name\` varchar(100) DEFAULT NULL,
      \`pickup_address\` text,
      \`delivery_address\` text,
      \`order_amount\` decimal(10,2) DEFAULT NULL,
      \`delivery_fee\` decimal(10,2) DEFAULT NULL,
      \`distance_km\` decimal(5,2) DEFAULT NULL,
      \`status\` enum('pending','assigned','confirmed','driver_reached','picked','otp_pending','delivered','cancelled') DEFAULT 'pending',
      \`assigned_driver_id\` int DEFAULT NULL,
      \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      \`payment_method\` enum('cash','upi') DEFAULT 'cash',
      \`restaurant_latitude\` decimal(10,7) DEFAULT NULL,
      \`restaurant_longitude\` decimal(10,7) DEFAULT NULL,
      \`customer_latitude\` decimal(10,7) DEFAULT NULL,
      \`customer_longitude\` decimal(10,7) DEFAULT NULL,
      \`delivery_otp\` varchar(6) DEFAULT NULL,
      \`vendor_confirmed\` tinyint(1) DEFAULT '0',
      \`pickup_verified\` tinyint(1) DEFAULT '0',
      \`total_amount\` decimal(10,2) DEFAULT '0.00',
      PRIMARY KEY (\`id\`),
      KEY \`assigned_driver_id\` (\`assigned_driver_id\`),
      CONSTRAINT \`orders_ibfk_1\` FOREIGN KEY (\`assigned_driver_id\`) REFERENCES \`drivers\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 3. wallet_transactions
    `CREATE TABLE IF NOT EXISTS \`wallet_transactions\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`driver_id\` int DEFAULT NULL,
      \`type\` enum('earning','incentive','cash_deduction','salary') DEFAULT NULL,
      \`amount\` decimal(10,2) DEFAULT NULL,
      \`description\` varchar(255) DEFAULT NULL,
      \`status\` varchar(50) DEFAULT NULL,
      \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`driver_id\` (\`driver_id\`),
      CONSTRAINT \`wallet_transactions_ibfk_1\` FOREIGN KEY (\`driver_id\`) REFERENCES \`drivers\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 4. payout_requests
    `CREATE TABLE IF NOT EXISTS \`payout_requests\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`driver_id\` int DEFAULT NULL,
      \`amount\` decimal(10,2) DEFAULT NULL,
      \`status\` varchar(30) DEFAULT 'pending',
      \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      \`approved_date\` timestamp NULL DEFAULT NULL,
      \`payout_type\` varchar(50) DEFAULT NULL,
      \`reference_id\` varchar(100) DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      KEY \`driver_id\` (\`driver_id\`),
      CONSTRAINT \`payout_requests_ibfk_1\` FOREIGN KEY (\`driver_id\`) REFERENCES \`drivers\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 5. cash_deposits
    `CREATE TABLE IF NOT EXISTS \`cash_deposits\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`driver_id\` int DEFAULT NULL,
      \`amount\` decimal(10,2) DEFAULT NULL,
      \`deposit_date\` date DEFAULT NULL,
      \`status\` enum('pending','verified') DEFAULT 'pending',
      \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`driver_id\` (\`driver_id\`),
      CONSTRAINT \`cash_deposits_ibfk_1\` FOREIGN KEY (\`driver_id\`) REFERENCES \`drivers\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 6. driver_sessions
    `CREATE TABLE IF NOT EXISTS \`driver_sessions\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`driver_id\` int DEFAULT NULL,
      \`login_time\` datetime DEFAULT NULL,
      \`logout_time\` datetime DEFAULT NULL,
      \`total_hours\` decimal(5,2) DEFAULT NULL,
      \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      \`is_online\` tinyint(1) DEFAULT '0',
      PRIMARY KEY (\`id\`),
      KEY \`driver_id\` (\`driver_id\`),
      CONSTRAINT \`driver_sessions_ibfk_1\` FOREIGN KEY (\`driver_id\`) REFERENCES \`drivers\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 7. earnings
    `CREATE TABLE IF NOT EXISTS \`earnings\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`driver_id\` int DEFAULT NULL,
      \`order_id\` int DEFAULT NULL,
      \`delivery_earning\` decimal(10,2) DEFAULT NULL,
      \`bonus_earning\` decimal(10,2) DEFAULT NULL,
      \`total_earning\` decimal(10,2) DEFAULT NULL,
      \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`driver_id\` (\`driver_id\`),
      KEY \`order_id\` (\`order_id\`),
      CONSTRAINT \`earnings_ibfk_1\` FOREIGN KEY (\`driver_id\`) REFERENCES \`drivers\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT \`earnings_ibfk_2\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 8. incentives
    `CREATE TABLE IF NOT EXISTS \`incentives\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`target_orders\` int DEFAULT NULL,
      \`bonus_amount\` decimal(10,2) DEFAULT NULL,
      \`shift_start\` time DEFAULT NULL,
      \`shift_end\` time DEFAULT NULL,
      \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 9. notifications
    `CREATE TABLE IF NOT EXISTS \`notifications\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`driver_id\` int DEFAULT NULL,
      \`title\` varchar(255) DEFAULT NULL,
      \`message\` text,
      \`is_read\` tinyint(1) DEFAULT '0',
      \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`driver_id\` (\`driver_id\`),
      CONSTRAINT \`notifications_ibfk_1\` FOREIGN KEY (\`driver_id\`) REFERENCES \`drivers\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 10. notification_logs
    `CREATE TABLE IF NOT EXISTS \`notification_logs\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`driver_id\` int DEFAULT NULL,
      \`order_id\` int DEFAULT NULL,
      \`title\` varchar(255) DEFAULT NULL,
      \`message\` text,
      \`type\` varchar(50) DEFAULT NULL,
      \`sent_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`driver_id\` (\`driver_id\`),
      KEY \`order_id\` (\`order_id\`),
      CONSTRAINT \`notification_logs_ibfk_1\` FOREIGN KEY (\`driver_id\`) REFERENCES \`drivers\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT \`notification_logs_ibfk_2\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 11. realtime_tracking
    `CREATE TABLE IF NOT EXISTS \`realtime_tracking\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`order_id\` int DEFAULT NULL,
      \`driver_id\` int DEFAULT NULL,
      \`latitude\` decimal(10,8) DEFAULT NULL,
      \`longitude\` decimal(11,8) DEFAULT NULL,
      \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`order_id\` (\`order_id\`),
      KEY \`driver_id\` (\`driver_id\`),
      CONSTRAINT \`realtime_tracking_ibfk_1\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT \`realtime_tracking_ibfk_2\` FOREIGN KEY (\`driver_id\`) REFERENCES \`drivers\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 12. support_tickets
    `CREATE TABLE IF NOT EXISTS \`support_tickets\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`driver_id\` int DEFAULT NULL,
      \`title\` varchar(255) DEFAULT NULL,
      \`description\` text,
      \`status\` enum('open','closed','in_progress') DEFAULT 'open',
      \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`driver_id\` (\`driver_id\`),
      CONSTRAINT \`support_tickets_ibfk_1\` FOREIGN KEY (\`driver_id\`) REFERENCES \`drivers\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 13. warehouse
    `CREATE TABLE IF NOT EXISTS \`warehouse\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
  ];

  console.log('🔄 Creating/verifying driver tables in target database...');
  for (const sql of driverTables) {
    const tableNameMatch = sql.match(/CREATE TABLE IF NOT EXISTS \`([^`]+)\`/i);
    const tableName = tableNameMatch ? tableNameMatch[1] : 'unknown';
    
    try {
      await cloudConnection.query(sql);
      console.log(`  ✅ Verified table "${tableName}".`);
    } catch (err) {
      console.error(`  ❌ Error verifying table "${tableName}":`, err.message);
    }
  }

  // Verify driver-specific fields exist in drivers table on the cloud
  const columnsToAdd = [
    { name: 'status', type: "VARCHAR(20) DEFAULT 'available'" },
    { name: 'logined_at', type: 'DATETIME' },
    { name: 'logged_out', type: 'DATETIME' },
    { name: 'fcm_token', type: 'TEXT' },
    { name: 'device_id', type: 'VARCHAR(255)' },
    { name: 'app_version', type: 'VARCHAR(50)' },
    { name: 'last_active', type: 'DATETIME' },
    { name: 'daily_duty_hours', type: 'DECIMAL(4, 2) DEFAULT 10.00' },
    { name: 'zone', type: 'VARCHAR(100)' },
    { name: 'radius_in_km', type: 'DECIMAL(5, 2)' },
    { name: 'duty_start_time', type: "VARCHAR(20) DEFAULT '09:00 AM'" },
    { name: 'duty_end_time', type: "VARCHAR(20) DEFAULT '09:00 PM'" }
  ];

  console.log('🔄 Verifying additional fields exist in "drivers" table...');
  for (const col of columnsToAdd) {
    try {
      const [colExists] = await cloudConnection.query(`SHOW COLUMNS FROM drivers LIKE ?`, [col.name]);
      if (colExists.length === 0) {
        console.log(`  Adding column "${col.name}" to "drivers"...`);
        await cloudConnection.query(`ALTER TABLE drivers ADD COLUMN ${col.name} ${col.type}`);
      }
    } catch (err) {
      console.error(`  ❌ Error checking/adding column "${col.name}":`, err.message);
    }
  }

  console.log('🎉 Database setup and migration completed successfully!');
  await cloudConnection.end();
}

migrate().catch(err => {
  console.error('❌ Migration script failed:', err);
  process.exit(1);
});
