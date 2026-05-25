const db = require("./config/db");

const idsToKeep = [111, 103, 104, 105, 106, 107, 108, 109, 110, 102, 112, 113, 114, 115, 116, 117, 118, 94, 86, 87, 88, 89, 90, 91, 92, 93, 85, 95, 96, 97, 98, 99, 100, 101];

const query = `DELETE FROM food_categories WHERE id NOT IN (${idsToKeep.join(',')})`;

db.query(query, (err, results) => {
  if (err) {
    console.error("Error deleting categories:", err);
  } else {
    console.log("Deleted unused categories successfully. Affected rows:", results.affectedRows);
  }
  process.exit();
});
