const db = require("../config/db");

// Get All Zones
exports.getAllZones = (req, res) => {
  const sql = "SELECT * FROM app_zone ORDER BY created_at DESC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(results);
  });
};

// Get Zone by ID
exports.getZoneById = (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM app_zone WHERE id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) {
      return res.status(404).json({ error: "Zone not found" });
    }
    res.status(200).json(results[0]);
  });
};
