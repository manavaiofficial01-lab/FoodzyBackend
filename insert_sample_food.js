const db = require('./config/db');

const foodItems = [
  {
    name: 'Ginger Tea Flask [Serves 3-6]',
    price: 99.00,
    original_price: 120.00,
    category: 'Recommended',
    restaurant_name: 'Arabian Tandoor Chai',
    rating: 4.8,
    review_count: 124,
    veg: true,
    popular: true,
    bestseller: true,
    calories: 80,
    prep_time: '10-15 mins',
    image_url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=400&q=80',
    morning: '6AM-11AM',
    afternoon: '12PM-4PM',
    evening: '5PM-9PM',
    night: 0
  },
  {
    name: 'Mushroom Macaroni Red Sauce Pasta',
    price: 189.00,
    original_price: 220.00,
    category: 'Recommended',
    restaurant_name: 'Arabian Tandoor Chai',
    rating: 4.5,
    review_count: 85,
    veg: true,
    popular: false,
    bestseller: false,
    calories: 320,
    prep_time: '20-25 mins',
    image_url: 'https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?auto=format&fit=crop&w=400&q=80',
    morning: 'No',
    afternoon: '12PM-4PM',
    evening: '5PM-9PM',
    night: 1
  },
  {
    name: 'Paneer Tikka Roll',
    price: 149.00,
    original_price: 170.00,
    category: 'Quick Bites',
    restaurant_name: 'Arabian Tandoor Chai',
    rating: 4.2,
    review_count: 50,
    veg: true,
    popular: true,
    bestseller: false,
    calories: 280,
    prep_time: '10-15 mins',
    image_url: 'https://images.unsplash.com/photo-1626777553760-0a2b0051e5e0?auto=format&fit=crop&w=400&q=80',
    morning: 'No',
    afternoon: '12PM-4PM',
    evening: '5PM-11PM',
    night: 1
  }
];

const insertSql = `
INSERT INTO food_items 
(name, price, original_price, category, restaurant_name, rating, review_count, veg, popular, bestseller, calories, prep_time, image_url, morning, afternoon, evening, night)
VALUES ?
`;

const values = foodItems.map(item => [
  item.name, item.price, item.original_price, item.category, item.restaurant_name, 
  item.rating, item.review_count, item.veg, item.popular, item.bestseller, 
  item.calories, item.prep_time, item.image_url, item.morning, item.afternoon, 
  item.evening, item.night
]);

db.query(insertSql, [values], (err, results) => {
  if (err) {
    console.error('Error inserting sample data:', err);
  } else {
    console.log('Sample food items inserted successfully.');
  }
  process.exit(0);
});
