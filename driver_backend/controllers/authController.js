const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const logToFile = (msg) => {
  try {
    const logPath = path.join(__dirname, '../../auth_debug.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (err) {
    console.error('Failed to write log to file:', err);
  }
};


const jwt = require('jsonwebtoken');

const db = require('../../config/dbPromise');

const generateToken = require(
  '../utils/generateToken'
);


// REGISTER DRIVER
const registerDriver = async (
  req,
  res
) => {

  try {

    const {
      full_name,
      phone,
      email,
      password,
      vehicle_type,
      vehicle_number,
    } = req.body;

    // CHECK EXISTING DRIVER
    const [existingDrivers] =
      await db.query(

        `SELECT *
         FROM drivers
         WHERE phone = ?`,

        [phone]

      );

    // DRIVER ALREADY EXISTS
    if (
      existingDrivers.length > 0
    ) {

      return res.status(400).json({

        success: false,

        message:
          'Driver already exists',

      });

    }

    // HASH PASSWORD
    const salt =
      await bcrypt.genSalt(10);

    const hashedPassword =
      await bcrypt.hash(
        password,
        salt
      );

    // INSERT DRIVER
    const [result] =
      await db.query(

        `
        INSERT INTO drivers
        (
          full_name,
          phone,
          email,
          password,
          vehicle_type,
          vehicle_number
        )

        VALUES (?, ?, ?, ?, ?, ?)
        `,

        [
          full_name,
          phone,
          email,
          hashedPassword,
          vehicle_type,
          vehicle_number,
        ]

      );

    res.status(201).json({

      success: true,

      message:
        'Driver Registered Successfully',

      driver: {

        id: result.insertId,

        full_name,

        phone,

        email,

        vehicle_type,

        vehicle_number,

      },

      token:
        generateToken(
          result.insertId
        ),

    });

  } catch (error) {

    console.log(error);

    res.status(500).json({

      success: false,

      message:
        'Server Error',

    });

  }

};


// LOGIN DRIVER
const loginDriver = async (
  req,
  res
) => {

  try {

    const {
      mobile,
      phone,
      password,
    } = req.body;

    console.log('[DEBUG AUTH] Received login request:', { mobile, phone, password_length: password ? password.length : 0 });
    logToFile(`Received login request: mobile=${mobile}, phone=${phone}, password_length=${password ? password.length : 0}`);

    // SUPPORT BOTH mobile & phone
    const loginPhone =
      mobile || phone;

    console.log('[DEBUG AUTH] Searching driver with phone:', loginPhone);
    logToFile(`Searching driver with phone: ${loginPhone}`);

    // FIND DRIVER
    const [drivers] =
      await db.query(

        `
        SELECT *
        FROM drivers
        WHERE phone = ?
        `,

        [loginPhone]

      );

    console.log('[DEBUG AUTH] Drivers found in database:', drivers.map(d => ({ id: d.id, phone: d.phone, has_password: !!d.password })));
    logToFile(`Drivers found in database: ${JSON.stringify(drivers.map(d => ({ id: d.id, phone: d.phone, has_password: !!d.password })))}`);

    // DRIVER NOT FOUND
    if (
      drivers.length === 0
    ) {
      console.log('[DEBUG AUTH] Driver not found in DB for phone:', loginPhone);
      logToFile(`Driver not found in DB for phone: ${loginPhone}`);

      return res.status(401).json({

        success: false,

        message:
          'Driver not found',

      });

    }

    const driver =
      drivers[0];

    // CHECK PASSWORD
    const isMatch =
      await bcrypt.compare(
        password,
        driver.password
      );

    console.log('[DEBUG AUTH] Bcrypt password compare result:', isMatch);
    logToFile(`Bcrypt password compare result: ${isMatch} (input password: ${password}, hash in DB: ${driver.password})`);

    // INVALID PASSWORD
    if (!isMatch) {
      console.log('[DEBUG AUTH] Password comparison failed for driver ID:', driver.id);
      logToFile(`Password comparison failed for driver ID: ${driver.id}`);

      return res.status(401).json({

        success: false,

        message:
          'Invalid password',

      });

    }

    // JWT TOKEN
    const token =
      jwt.sign(

        {
          id: driver.id,
        },

        process.env.JWT_SECRET,

        {
          expiresIn: '7d',
        }

      );

    res.status(200).json({

      success: true,

      message:
        'Login Successful',

      token,

      driver: {

        id: driver.id,

        full_name:
          driver.full_name,

        phone:
          driver.phone,

        email:
          driver.email,

        vehicle_type:
          driver.vehicle_type,

        vehicle_number:
          driver.vehicle_number,

      },

    });

  } catch (error) {

    console.log(error);

    res.status(500).json({

      success: false,

      message:
        'Server Error',

    });

  }

};


// EXPORTS
module.exports = {
  registerDriver,
  loginDriver,
  login: loginDriver,
};
