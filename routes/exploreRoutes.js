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
    
    if (subs.length === 0) {
      return res.json({ sub_categories: [], items: [] });
    }
    
    const subIds = subs.map(s => s.id);
    
    // 2. Get food items linked to those sub-categories
    const foodItemsQuery = "SELECT * FROM food_items WHERE sub_category_id IN (?)";
    db.query(foodItemsQuery, [subIds], (err, foodItems) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // 3. Get products linked to those sub-categories
      const productsQuery = "SELECT * FROM products WHERE sub_category_id IN (?)";
      db.query(productsQuery, [subIds], (err, productsList) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Map products list to match the food_items shape for the app
        const host = req.headers.host || 'localhost:3000';
        const protocol = req.protocol || 'http';
        const requestIp = host.split(':')[0];
        const adminUrl = `http://${requestIp}:5000`;
        
        const mappedProducts = productsList.map(p => {
          let imgUrl = p.main_image_url || '';
          if (imgUrl && imgUrl.startsWith('/uploads/')) {
            imgUrl = `${adminUrl}${imgUrl}`;
          }
          
          let price = parseFloat(p.price) || 0;
          let originalPrice = null;
          if (p.discount) {
            const discountPct = parseFloat(p.discount);
            if (!isNaN(discountPct) && discountPct > 0 && discountPct < 100) {
              originalPrice = Math.round(price / (1 - (discountPct / 100)));
            }
          }
          
          return {
            id: p.id,
            name: p.name,
            price: price,
            original_price: originalPrice,
            profit: parseFloat(p.profit) || 0,
            category: p.category,
            restaurant_name: p.brand || 'Store',
            rating: parseFloat(p.rating) || 0,
            review_count: parseInt(p.reviews) || 0,
            veg: 0,
            popular: 0,
            bestseller: 0,
            calories: null,
            prep_time: null,
            image_url: imgUrl,
            food_position: 0,
            morning: 'Yes',
            afternoon: 'Yes',
            evening: 'Yes',
            night: 1,
            zone_name: p.zone || null,
            stock: (parseInt(p.stock) || 0) > 0 ? 1 : 0,
            sub_category_id: p.sub_category_id,
            weight: null,
            is_product: true
          };
        });
        
        // Map food items image URLs if relative
        const mappedFoodItems = foodItems.map(f => {
          let imgUrl = f.image_url || '';
          if (imgUrl && imgUrl.startsWith('/uploads/')) {
            imgUrl = `${protocol}://${host}${imgUrl}`;
          }
          return {
            ...f,
            image_url: imgUrl
          };
        });
        
        // Merge both lists
        const mergedItems = [...mappedFoodItems, ...mappedProducts];
        
        res.json({
          sub_categories: subs,
          items: mergedItems
        });
      });
    });
  });
});

module.exports = router;
