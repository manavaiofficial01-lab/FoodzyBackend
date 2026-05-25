const db = require('./config/db');
const restaurants = [
  { "name": "Guhan Veg and Non Veg Food Space" },
  { "name": "Paalpandi Tiffin Centre" },
  { "name": "Namma Ooru Kulfi" },
  { "name": "Madurai Jigarthanda" },
  { "name": "Suvai Biriyani" },
  { "name": "Ambur Dum Biryani" },
  { "name": "Munch Bakery" },
  { "name": "Sangam Hotel" },
  { "name": "Melting Point" },
  { "name": "Gowri Shankar Pure Veg Restaurant" },
  { "name": "Food Park - Family Garden Restaurant" },
  { "name": "Namma Veetu Biryani" },
  { "name": "Gokula Vilas" },
  { "name": "Hotel Vasantham" },
  { "name": "DSK Sea Foods" },
  { "name": "Al Quddus Cafe" },
  { "name": "Heavens Chicken" },
  { "name": "TN 45 Cafe" },
  { "name": "Meenatchi Bhavan" },
  { "name": "Aariya Bhavan Sweets & Snacks" },
  { "name": "306 Cafe" },
  { "name": "Kavish Cloud Kitchen" },
  { "name": "Frozen Feast" },
  { "name": "A1 Chilli Chicken" },
  { "name": "NICKEY BOYS UNLIMITED BRIYANI" },
  { "name": "Manavai Atho Time" },
  { "name": "We Chai" },
  { "name": "Nellai Karupatty Coffee" },
  { "name": "Only Rosemilk" },
  { "name": "Fantasy Scoops" }
];

const foodTemplates = {
  biryani: [
    { name: 'ChickenBiryani', price: 180, original_price: 220, category: 'Main Course', veg: false },
    { name: 'Mutton Biryani', price: 280, original_price: 320, category: 'Main Course', veg: false },
    { name: 'Egg Biryani', price: 120, original_price: 150, category: 'Main Course', veg: false },
    { name: 'Chicken 65 (6 pcs)', price: 140, original_price: 180, category: 'Starters', veg: false },
    { name: 'Pepper Chicken fry', price: 160, original_price: 200, category: 'Starters', veg: false }
  ],
  veg: [
    { name: 'Ghee Roast Dosa', price: 80, original_price: 100, category: 'Main Course', veg: true },
    { name: 'Idli (2 pcs)', price: 40, original_price: 50, category: 'Main Course', veg: true },
    { name: 'Poori Masala', price: 70, original_price: 90, category: 'Main Course', veg: true },
    { name: 'Paneer Butter Masala', price: 180, original_price: 210, category: 'Gravy', veg: true },
    { name: 'Veg Fried Rice', price: 120, original_price: 150, category: 'Main Course', veg: true }
  ],
  cafe: [
    { name: 'Masala Tea', price: 20, original_price: 25, category: 'Beverages', veg: true },
    { name: 'Filter Coffee', price: 25, original_price: 30, category: 'Beverages', veg: true },
    { name: 'Veg Sandwich', price: 80, original_price: 110, category: 'Quick Bites', veg: true },
    { name: 'Chicken Burger', price: 120, original_price: 160, category: 'Quick Bites', veg: false },
    { name: 'French Fries', price: 70, original_price: 90, category: 'Quick Bites', veg: true }
  ],
  dessert: [
    { name: 'Vanilla Scoop', price: 50, original_price: 70, category: 'Desserts', veg: true },
    { name: 'Chocolate Belgian Waffle', price: 140, original_price: 180, category: 'Desserts', veg: true },
    { name: 'Mango Lassi', price: 70, original_price: 90, category: 'Beverages', veg: true },
    { name: 'Falooda Special', price: 120, original_price: 150, category: 'Desserts', veg: true },
    { name: 'Brownie with IceCream', price: 150, original_price: 190, category: 'Desserts', veg: true }
  ],
  seafood: [
    { name: 'Fish Fry (Vanjaram)', price: 220, original_price: 280, category: 'Starters', veg: false },
    { name: 'Prawn Thokku', price: 180, original_price: 220, category: 'Side Dish', veg: false },
    { name: 'Crab Lollipop', price: 190, original_price: 250, category: 'Starters', veg: false },
    { name: 'Fish Meals', price: 150, original_price: 180, category: 'Main Course', veg: false },
    { name: 'Seafood Soup', price: 80, original_price: 110, category: 'Starters', veg: false }
  ],
  bakery: [
    { name: 'Black Forest Cake (Pastry)', price: 70, original_price: 90, category: 'Cakes', veg: true },
    { name: 'Egg Puff', price: 20, original_price: 25, category: 'Snacks', veg: false },
    { name: 'Veg Puff', price: 15, original_price: 20, category: 'Snacks', veg: true },
    { name: 'Butter Cookies (250g)', price: 120, original_price: 150, category: 'Snacks', veg: true },
    { name: 'Paneer Pizza (Small)', price: 180, original_price: 220, category: 'Main Course', veg: true }
  ]
};

const finalData = [];

restaurants.forEach(rest => {
  const name = rest.name.toLowerCase();
  let template = foodTemplates.veg; // default

  if (name.includes('briyani') || name.includes('biryani') || name.includes('chicken') || name.includes('non veg')) {
    template = foodTemplates.biryani;
  } else if (name.includes('cafe') || name.includes('chai') || name.includes('coffee')) {
    template = foodTemplates.cafe;
  } else if (name.includes('ice cream') || name.includes('feast') || name.includes('scoops') || name.includes('rose') || name.includes('jigarthanda') || name.includes('kulfi')) {
    template = foodTemplates.dessert;
  } else if (name.includes('sea foods') || name.includes('fish') || name.includes('prawn')) {
    template = foodTemplates.seafood;
  } else if (name.includes('bakery') || name.includes('sweets')) {
    template = foodTemplates.bakery;
  }

  // Common properties
  template.forEach(item => {
    finalData.push([
      item.name,
      item.price,
      item.original_price,
      item.category,
      rest.name,
      (4 + Math.random()).toFixed(1), // random rating between 4.0 and 5.0
      Math.floor(Math.random() * 500) + 50, // random reviews
      item.veg,
      Math.random() > 0.5, // random popular
      Math.random() > 0.7, // random bestseller
      Math.floor(Math.random() * 400) + 100, // calories
      Math.floor(Math.random() * 15) + 10 + ' mins', // prep time
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80', // generic food image
      'Yes',
      'Yes',
      'Yes',
      1
    ]);
  });
});

const insertSql = `
INSERT INTO food_items 
(name, price, original_price, category, restaurant_name, rating, review_count, veg, popular, bestseller, calories, prep_time, image_url, morning, afternoon, evening, night)
VALUES ?
`;

db.query(insertSql, [finalData], (err, results) => {
  if (err) {
    console.error('Error inserting sample data:', err);
  } else {
    console.log(`Successfully inserted ${finalData.length} food items across all restaurants.`);
  }
  process.exit();
});
