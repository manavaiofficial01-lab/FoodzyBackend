const db = require('./config/db');

const createTableQuery = `
CREATE TABLE IF NOT EXISTS food_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2) NULL,
    
    category TEXT NOT NULL,
    restaurant_name TEXT NOT NULL,
    
    rating DECIMAL(2,1) DEFAULT 4.5,
    review_count INT DEFAULT 0,
    
    veg BOOLEAN DEFAULT TRUE,
    popular BOOLEAN DEFAULT FALSE,
    bestseller BOOLEAN DEFAULT FALSE,
    
    calories INT NULL,
    prep_time TEXT NULL,
    image_url TEXT NULL,
    
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    profit DECIMAL(10,2) NULL,
    food_position INT DEFAULT 0,
    
    -- changed from BOOLEAN → INTEGER
    morning INT DEFAULT 0,
    afternoon INT DEFAULT 0,
    evening INT DEFAULT 0,
    
    night BOOLEAN DEFAULT FALSE,
    
    zone_name TEXT NULL,
    stock BOOLEAN NOT NULL DEFAULT TRUE
);
`;

db.query(createTableQuery, (err, results) => {
    if (err) {
        console.error('Error creating table:', err);
    } else {
        console.log('Table food_items created successfully or already exists.');
    }
    process.exit(0);
});
