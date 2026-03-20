const db = require("../config/db");

const parseTagsSafe = (tags) => {
  try { return typeof tags === 'string' ? JSON.parse(tags) : (tags ?? []); }
  catch { return []; }
};

/**
 * GET /api/restaurants
 * Optional query params:
 *   ?lat=10.6&lon=78.4&radius=25   → only returns restaurants within `radius` km of user,
 *                                    sorted by distance ASC (nearest first)
 * No params → returns all restaurants ordered by position
 */
exports.getAllRestaurants = (req, res) => {
  const { lat, lon, radius } = req.query;

  const userLat  = parseFloat(lat);
  const userLon  = parseFloat(lon);
  const maxKm    = parseFloat(radius) || 25; // default zone radius 25 km

  const hasCoords = !isNaN(userLat) && !isNaN(userLon);

  let sql, params;

  if (hasCoords) {
    // Haversine in SQL — filter + sort by real distance from user
    sql = `
      SELECT *,
        ROUND(
          6371 * ACOS(
            LEAST(1, 
              COS(RADIANS(?)) * COS(RADIANS(latitude))
              * COS(RADIANS(longitude) - RADIANS(?))
              + SIN(RADIANS(?)) * SIN(RADIANS(latitude))
            )
          ), 2
        ) AS distance_km
      FROM restaurants
      WHERE latitude  IS NOT NULL
        AND longitude IS NOT NULL
      HAVING distance_km <= ?
      ORDER BY FIELD(hotel_status, 'open', 'close') ASC, distance_km ASC
    `;
    params = [userLat, userLon, userLat, maxKm];
  } else {
    // Fallback — no coords provided, return all by position
    sql = `SELECT *, NULL AS distance_km FROM restaurants ORDER BY FIELD(hotel_status, 'open', 'close') ASC, position ASC`;
    params = [];
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("Error fetching restaurants:", err);
      return res.status(500).json({ error: err.message });
    }

    const parsed = results.map((r) => ({
      ...r,
      tags: parseTagsSafe(r.tags),
      distance_km: r.distance_km != null ? parseFloat(r.distance_km) : null,
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
    r.tags = parseTagsSafe(r.tags);
    res.status(200).json(r);
  });
};
