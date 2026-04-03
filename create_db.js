const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
});

connection.query(
  'CREATE DATABASE IF NOT EXISTS foodzy',
  function (err, results) {
    if (err) {
      console.error('Error creating database:', err);
    } else {
      console.log('Database "foodzy" created or already exists!');
    }
    connection.end();
  }
);
