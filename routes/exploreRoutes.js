const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Explore Page: GET Grouped Product Categories
router.get('/', (req, res) => {
  const query = `
    SELECT cg.id as group_id, cg.name as group_name, cg.position as group_position, pc.id as category_id, pc.name as category_name, pc.image as category_image, pc.position as position
    FROM category_groups cg
    LEFT JOIN product_categories pc ON cg.id = pc.group_id
    ORDER BY cg.position, pc.position
  `;
  
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Grouping the results by group_id
    const groupedData = results.reduce((acc, current) => {
      const groupid = current.group_id;
      if (!acc[groupid]) {
        acc[groupid] = {
          id: groupid,
          name: current.group_name,
          position: current.group_position,
          categories: []
        };
      }
      if (current.category_id) {
        acc[groupid].categories.push({
          id: current.category_id,
          name: current.category_name,
          image: current.category_image,
          position: current.position
        });
      }
      return acc;
    }, {});

    res.json(Object.values(groupedData).sort((a, b) => (a.position || 999) - (b.position || 999)));
  });
});

// GET Sub-categories and Products for a Product Category
router.get('/category-details/:productCategoryId', (req, res) => {
  const productCategoryId = req.params.productCategoryId;
  
  // 1. Get Sub-categories for this productCategoryId
  const subQuery = "SELECT * FROM sub_categories WHERE product_category_id = ? ORDER BY position";
  
  db.query(subQuery, [productCategoryId], (err, subs) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // 2. Get Products linked to those sub-categories
    const itemsQuery = `
      SELECT * FROM food_items 
      WHERE sub_category_id IN (SELECT id FROM sub_categories WHERE product_category_id = ?)
    `;
    
    db.query(itemsQuery, [productCategoryId], (err, items) => {
      if (err) return res.status(500).json({ error: err.message });
      
      res.json({
        sub_categories: subs,
        items: items
      });
    });
  });
});

module.exports = router;
