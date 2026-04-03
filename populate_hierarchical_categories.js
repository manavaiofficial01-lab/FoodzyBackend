const db = require('./config/db');

const data = [
  {
    group: 'Grocery & Kitchen',
    categories: [
      {
        name: 'Fruits & Vegetables',
        sub_categories: ['Vegetables', 'Fruits', 'Leaves & Herbs', 'Flowers'],
      },
      {
        name: 'Diary,Bread & Eggs',
        sub_categories: ['Milk', 'Breads & Buns', 'Eggs', 'Curds & Probiotics', 'Batter & mixes', 'Paneer & Cream', 'Butter', 'Cheese', 'Milk drinks'],
      },
      {
        name: 'Atta,Rice,Oil & Dals',
        sub_categories: ['Rice', 'Oil', 'Atta', 'Maida & Rava', 'Ghee'],
      },
      {
        name: 'Meat, Fish & Eggs',
        sub_categories: ['Chicken', 'Fish', 'Sea Food', 'Mutton', 'Quail'],
      },
      {
        name: 'Masala & Dry Fruits',
        sub_categories: ['Powders & Pastes', 'Dry Fruits & Nuts', 'Dates & Seeds', 'Whole Spices', 'Salt & Sugar'],
      },
      {
        name: 'Breakfast & Sauces',
        sub_categories: ['Breakfast Cereals', 'Ketchup & Sauces', 'Muesli & Oats', 'Honey & Spreads', 'Peanut Butter'],
      },
      {
        name: 'Package Food',
        sub_categories: ['Noodles', 'Vermicelli', 'Pasta & Soups', 'Papads & Pickels', 'Cerelac', 'Ready to Cook', 'Baking Mixes', 'Dessert Mixes'],
      },
    ],
  },
  {
    group: 'Snacks & Drinks',
    categories: [
      {
        name: 'Tea, Coffee & More',
        sub_categories: ['Tea', 'Coffee', 'Kids Nutrition', 'Adults Nutrition', 'Green Herbal', 'Cold Coffee', 'Non'],
      },
      {
        name: 'Ice Cream & More',
        sub_categories: ['Sticks', 'Cones', 'Gourmet Ice Cream', 'Cups', 'Bulks', 'Cakes & Sandwich', 'Kulfi'],
      },
      {
        name: 'Frozen Food',
        sub_categories: ['Veg Snacks', 'Non Veg Snacks', 'Frozen Veggies', 'Momo\'s & more', 'Roti & Paratha', 'Raw Meats', 'Sausages & Salami'],
      },
      {
        name: 'Sweet Cravings',
        sub_categories: ['Chocolates', 'Premium Chocolates', 'Indian Mithai', 'Pastries & Cakes', 'Candies & Gums', 'Dates Bites'],
      },
      {
        name: 'Cold Drinks & Juices',
        sub_categories: ['Soft Drinks', 'Soda & Mixers', 'Fruit Juices', 'Hydration Water', 'Energy Drinks'],
      },
      {
        name: 'Munchies',
        sub_categories: ['Chips & Crisps', 'Nimkee\'s', 'Nachos', 'Dry Fruits', 'Popcorn', 'Energy Bars'],
      },
      {
        name: 'Biscuit & Cookies',
        sub_categories: ['Cream fills', 'Cookies', 'Crackers', 'Wafers', 'Glucose & Marie', 'Digestives', 'Rusk & Khari'],
      },
    ],
  },
  {
    group: 'Fashion & Lifestyle',
    categories: [
      {
        name: 'Apparel',
        sub_categories: ['Men\'s', 'Women\'s', 'Innerwear', 'Footwear', 'Accessories'],
      },
      {
        name: 'Jewelry',
        sub_categories: ['Proposal Rings', 'Couple Rings', 'Oxidized', 'Festive & Ethnic', 'Earrings', 'Bangles & Bracelets', 'Necklace', 'Rings', 'Men\'s Jewelry'],
      },
    ],
  },
  {
    group: 'Beauty & Personal Care',
    categories: [
      {
        name: 'Personal Care Studio',
        sub_categories: ['Makeup', 'Skin', 'Hair', 'Bath', 'Fragrance'],
      },
      {
        name: 'Baby care',
        sub_categories: ['Diaper', 'Baby Bath', 'Baby Skin', 'Baby Wipes', 'Baby Feeding', 'Baby Oral', 'Baby Hygiene', 'Baby Mom Gifts', 'Mom Care', 'Baby Health', 'Baby Nursery', 'Infant Clothing', 'Baby Gear', 'Baby Safety'],
      },
      {
        name: 'Protein & Nutrition',
        sub_categories: ['Whey Blend', 'Whey Concentration', 'Whey Isolates', 'Protein Drinks', 'Vegan Protein'],
      },
      {
        name: 'Pharmacy & Wellness',
        sub_categories: ['Cough, Cold & Fever', 'Vitamin & Supplements', 'Pain Relief', 'Elderly Care', 'Ayurved Immunity', 'Stomach Care', 'Derma Care', 'Medical Devices', 'First Aid', 'Protein & Supplements', 'Handwash & Sanitizer', 'Sexual Wellness'],
      },
      {
        name: 'Feminine Hygiene',
        sub_categories: ['Sanitary Pads', 'Napkins', 'Menstrual Cups', 'Tampons', 'Intimate Care', 'Hygiene'],
      },
    ],
  },
  {
    group: 'Household Essentials',
    categories: [
      {
        name: 'Home needs',
        sub_categories: ['Home Furnishing', 'Home Decor', 'Home Utility', 'Bath & Laundry', 'Storage & Organizers', 'Gardening Essentials', 'Hardware & fittings', 'Essential Tools', 'Pooja & festive', 'Party Needs', 'Cleaning Aids & Tissues'],
      },
      {
        name: 'Kitchen & Dining',
        sub_categories: ['Pressure Cooker', 'Cookware Set', 'Bottles & Flasks', 'Gas Stove & Accessories', 'Kitchen Aids', 'Kitchen Storage', 'Tableware & More', 'Steel Utensils', 'Lunch Boxes', 'Kitchen Tools', 'Drinkware & Bar'],
      },
      {
        name: 'Cleaning Essentials',
        sub_categories: ['Repellent', 'Liquid Detergent', 'Winter Laundry', 'Detergent Powder', 'Laundry Additives', 'Dishwash Gels & Bar', 'Floor & Surface', 'Toilet & Bathroom', 'Kitchen Cleaning', 'Freshness', 'Toilet Hyginus', 'Shoe Care'],
      },
      {
        name: 'Electronics & Appliances',
        sub_categories: ['Mobiles', 'Juicers & Mixers', 'Smart Watches', 'Speakers & Soundbars', 'Kitchen Appliances', 'Earphones & Headsets', 'Trimmers', 'Powerbanks & Chargers', 'Home Appliances', 'Mobile Cases'],
      },
      {
        name: 'Pet Care',
        sub_categories: ['Cat Food', 'Dog Food', 'Pet Treats & Toys', 'Premium Pet Foods', 'Small Pet Foods'],
      },
      {
        name: 'Toys & Care',
        sub_categories: ['Electronic Toys', 'Educational Toys'],
      },
      {
        name: 'Stationary & Books',
        sub_categories: ['Writing Essentials', 'Notebooks & Journals', 'Office Supplies', 'School Supplies', 'Craft & Hobbies', 'Books'],
      },
    ],
  },
];

const categoryImages = {
  'Fruits & Vegetables': 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fveg.png?alt=media',
  'Tea, Coffee & More': 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Ftea.png?alt=media',
  'Ice Cream & More': 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Ficecream.png?alt=media',
  'Meat, Fish & Eggs': 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fchicken.png?alt=media',
  'Package Food': 'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/Project%20Assets%2FCategories%2Fnoodles.png?alt=media',
  // Default for others
};

async function setupDatabase() {
  try {
    const promiseDb = db.promise();
    
    await promiseDb.query('SET FOREIGN_KEY_CHECKS = 0');
    await promiseDb.query('DROP TABLE IF EXISTS sub_categories');
    await promiseDb.query('DROP TABLE IF EXISTS product_categories');
    await promiseDb.query('DROP TABLE IF EXISTS category_groups');

    await promiseDb.query(`
      CREATE TABLE IF NOT EXISTS category_groups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        position INT DEFAULT 0
      )
    `);

    await promiseDb.query(`
      CREATE TABLE IF NOT EXISTS product_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_id INT,
        name VARCHAR(255) NOT NULL,
        image VARCHAR(500),
        position INT DEFAULT 0,
        FOREIGN KEY (group_id) REFERENCES category_groups(id) ON DELETE CASCADE
      )
    `);

    await promiseDb.query(`
      CREATE TABLE IF NOT EXISTS sub_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_category_id INT,
        name VARCHAR(255) NOT NULL,
        image VARCHAR(500),
        position INT DEFAULT 0,
        FOREIGN KEY (product_category_id) REFERENCES product_categories(id) ON DELETE CASCADE
      )
    `);

    console.log('Tables initialized.');

    for (let i = 0; i < data.length; i++) {
        const group = data[i];
        const [groupResult] = await promiseDb.query(
            'INSERT INTO category_groups (name, position) VALUES (?, ?)',
            [group.group, i + 1]
        );
        const groupId = groupResult.insertId;

        for (let j = 0; j < group.categories.length; j++) {
            const category = group.categories[j];
            const categoryImage = categoryImages[category.name] || `https://loremflickr.com/200/200/${encodeURIComponent(category.name.replace(/ & /g, ','))}?random=${j}`;
            const [catResult] = await promiseDb.query(
                'INSERT INTO product_categories (group_id, name, image, position) VALUES (?, ?, ?, ?)',
                [groupId, category.name, categoryImage, j + 1]
            );
            const categoryId = catResult.insertId;

            for (let k = 0; k < category.sub_categories.length; k++) {
                const subName = category.sub_categories[k];
                const subImage = `https://loremflickr.com/100/100/${encodeURIComponent(subName.replace(/ & /g, ','))}?random=${k}`;
                await promiseDb.query(
                    'INSERT INTO sub_categories (product_category_id, name, image, position) VALUES (?, ?, ?, ?)',
                    [categoryId, subName, subImage, k + 1]
                );
            }
        }
    }

    await promiseDb.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Database population completed successfully with 28 categories and sub-categories.');
    process.exit(0);

  } catch (err) {
    console.error('Error setting up database:', err);
    process.exit(1);
  }
}

setupDatabase();
