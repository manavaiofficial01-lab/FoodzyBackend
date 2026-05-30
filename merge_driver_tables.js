const db = require('./config/dbPromise');
const bcrypt = require('bcryptjs');

async function runMigration() {
  try {
    console.log('--- STARTING DRIVER TABLES MERGE ---');

    // 1. Check if drivers table exists
    const [tables] = await db.query("SHOW TABLES LIKE 'drivers'");
    if (tables.length === 0) {
      throw new Error("Table 'drivers' does not exist. Cannot migrate.");
    }

    // 2. Add missing columns to drivers table
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

    for (const col of columnsToAdd) {
      try {
        const [colExists] = await db.query(`
          SHOW COLUMNS FROM drivers LIKE ?
        `, [col.name]);

        if (colExists.length === 0) {
          console.log(`Adding column '${col.name}' to 'drivers' table...`);
          await db.query(`ALTER TABLE drivers ADD COLUMN ${col.name} ${col.type}`);
        } else {
          console.log(`Column '${col.name}' already exists in 'drivers' table.`);
        }
      } catch (err) {
        console.error(`Error adding column ${col.name}:`, err.message);
      }
    }

    // 3. Migrate data from driver (singular) to drivers (plural)
    const [singularTableExists] = await db.query("SHOW TABLES LIKE 'driver'");
    if (singularTableExists.length > 0) {
      console.log("Reading data from 'driver' table...");
      const [singularDrivers] = await db.query('SELECT * FROM driver');
      console.log(`Found ${singularDrivers.length} drivers in 'driver' table.`);

      for (const sd of singularDrivers) {
        const phone = sd.driver_phone;
        const name = sd.driver_name;
        
        // Check if this driver phone exists in 'drivers'
        const [existing] = await db.query('SELECT id, password FROM drivers WHERE phone = ?', [phone]);

        // We hash password if it's plain text (plain text passwords don't start with $2)
        let passwordToUse = sd.password;
        if (passwordToUse && !passwordToUse.startsWith('$2')) {
          console.log(`Hashing plain text password for ${name} (${phone})...`);
          passwordToUse = await bcrypt.hash(passwordToUse, 10);
        }

        if (existing.length === 0) {
          console.log(`Inserting driver ${name} (${phone}) into 'drivers' table...`);
          await db.query(`
            INSERT INTO drivers (
              full_name, phone, password, status, daily_duty_hours,
              duty_start_time, duty_end_time, last_active, vehicle_type, vehicle_number
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            name, phone, passwordToUse, sd.status || 'available', sd.daily_duty_hours || 10.00,
            sd.duty_start_time || '09:00 AM', sd.duty_end_time || '09:00 PM', sd.last_active || null,
            'bike', 'N/A'
          ]);
        } else {
          console.log(`Updating existing driver ${name} (${phone}) in 'drivers' table with fields from 'driver'...`);
          await db.query(`
            UPDATE drivers 
            SET status = ?, daily_duty_hours = ?, duty_start_time = ?, duty_end_time = ?, last_active = ?
            WHERE phone = ?
          `, [
            sd.status || 'available', sd.daily_duty_hours || 10.00,
            sd.duty_start_time || '09:00 AM', sd.duty_end_time || '09:00 PM', sd.last_active || null,
            phone
          ]);
        }
      }

      // Rename driver to driver_old as a backup instead of deleting it immediately
      console.log("Renaming 'driver' to 'driver_old'...");
      try {
        await db.query("DROP TABLE IF EXISTS driver_old");
        await db.query("RENAME TABLE driver TO driver_old");
        console.log("Renamed 'driver' table to 'driver_old'.");
      } catch (err) {
        console.error("Failed to rename 'driver' table:", err.message);
      }

    } else {
      console.log("No table named 'driver' (singular) exists. Skipping data copy.");
    }

    console.log('--- DRIVER TABLES MERGE COMPLETED SUCCESSFULLY ---');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

runMigration();
