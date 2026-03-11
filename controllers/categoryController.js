const db = require("../config/db");

// Create Category
exports.createCategory = (req, res) => {
  const { name, image } = req.body;
  if (!name || !image) {
    return res.status(400).json({ error: "Name and image are required" });
  }

  const sql = "INSERT INTO food_categories (name, image) VALUES (?, ?)";
  db.query(sql, [name, image], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: "Category created", id: result.insertId });
  });
};

// Get All Categories
exports.getAllCategories = (req, res) => {
  const sql = "SELECT * FROM food_categories ORDER BY created_at DESC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(results);
  });
};

// Update Category
exports.updateCategory = (req, res) => {
  const { id } = req.params;
  const { name, image } = req.body;
  const sql = "UPDATE food_categories SET name = ?, image = ? WHERE id = ?";
  db.query(sql, [name, image, id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json({ message: "Category updated" });
  });
};

// Delete Category
exports.deleteCategory = (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM food_categories WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json({ message: "Category deleted" });
  });
};
