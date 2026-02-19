CREATE DATABASE IF NOT EXISTS nomad_spoon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nomad_spoon;

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  weight_g INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  mrp DECIMAL(10,2) NOT NULL,
  rating DECIMAL(3,1) NOT NULL DEFAULT 4.0,
  review_count INT NOT NULL DEFAULT 0,
  value_proposition VARCHAR(255) NOT NULL,
  category_tag ENUM('gain','maintain','loss') NOT NULL DEFAULT 'maintain',
  image_url TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  user_name VARCHAR(120) NOT NULL,
  review_text TEXT NOT NULL,
  rating DECIMAL(2,1) NOT NULL DEFAULT 4.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bmi_calculations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  age INT NOT NULL,
  height_cm DECIMAL(8,2) NOT NULL,
  weight_kg DECIMAL(8,2) NOT NULL,
  gender VARCHAR(20) NULL,
  unit_system VARCHAR(20) NOT NULL DEFAULT 'Metric',
  exercise_index TINYINT NOT NULL DEFAULT 2,
  bmi_value DECIMAL(5,2) NOT NULL,
  bmi_category VARCHAR(40) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Full reseed of current catalog + reviews data (latest snapshot).
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM reviews;
DELETE FROM products;
SET FOREIGN_KEY_CHECKS = 1;

ALTER TABLE products AUTO_INCREMENT = 1;
ALTER TABLE reviews AUTO_INCREMENT = 1;

INSERT INTO products (id, slug, name, description, weight_g, price, mrp, rating, review_count, value_proposition, category_tag, image_url)
VALUES
(1, 'berry-nut-energy-bar', 'Berry Nut Energy Bar', 'Trail-ready bar with nuts, berries, and steady-release carbs for long hikes.', 50, 70.00, 80.00, 4.3, 212, 'Lightweight, Nutritious', 'maintain', 'https://placehold.co/530x580'),
(2, 'salted-cheese-trail-mix', 'Salted Cheese Trail Mix', 'Savory mix designed for recovery and sustained mountain energy.', 150, 250.00, 280.00, 4.2, 189, 'Savory + Protein Rich', 'gain', 'https://placehold.co/360x253'),
(3, 'mango-chilli-energy-bar', 'Mango Chilli Energy Bar', 'Tangy-sweet energy bar ideal for high-output trek sections.', 50, 70.00, 85.00, 4.1, 174, 'Quick Energy', 'maintain', 'https://placehold.co/360x253'),
(4, 'poha-meal', 'Poha Meal', 'Ready-to-eat poha meal with balanced carbs and trail-friendly hydration support.', 75, 150.00, 170.00, 4.4, 201, 'Balanced Trek Meal', 'maintain', 'https://placehold.co/265x253'),
(5, 'moong-dal-khichdi-meal', 'Moong Dal Khichdi Meal', 'Comfort meal with protein and easy digestibility for high-altitude recovery.', 75, 150.00, 170.00, 4.5, 226, 'Recovery Support', 'gain', 'https://placehold.co/265x253'),
(6, 'lean-protein-mix', 'Lean Protein Mix', 'Low-calorie, high-protein mix formulated for fat-loss phases.', 120, 220.00, 250.00, 4.0, 132, 'High Protein, Lower Calorie', 'loss', 'https://placehold.co/265x253');

INSERT INTO reviews (id, product_id, user_name, review_text, rating, created_at)
VALUES
(1, 1, 'Sarah J.', 'Absolutely love this! It has completely transformed my skin texture. Highly recommend.', 4.5, '2026-02-17 15:45:02'),
(2, 1, 'Arjun P.', 'Great taste and easy to carry. Perfect for long treks.', 4.0, '2026-02-15 15:45:02'),
(3, 1, 'Nisha K.', 'Loved the ingredients and energy boost. Will order again.', 4.5, '2026-02-12 15:45:02');
