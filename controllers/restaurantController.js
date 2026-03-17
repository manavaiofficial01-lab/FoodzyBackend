const db = require("../config/db");

// Get All Restaurants (ordered by position)
exports.getAllRestaurants = (req, res) => {
  const sql = "SELECT * FROM restaurants ORDER BY position ASC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    // Parse JSON tags field safely
    const parsed = results.map((r) => ({
      ...r,
      tags: (() => {
        try { return typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags; }
        catch { return []; }
      })(),
    }));

    res.status(200).json(parsed);
  });
};

// Get Restaurant by ID
exports.getRestaurantById = (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM restaurants WHERE id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) {
      return res.status(404).json({ error: "Restaurant not found" });
    }
    const r = results[0];
    r.tags = (() => {
      try { return typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags; }
      catch { return []; }
    })();
    res.status(200).json(r);
  });
};
