const db = require("./config/db");

db.query("SHOW TABLES", (err, results) => {
  console.log(results);
  process.exit();
});
