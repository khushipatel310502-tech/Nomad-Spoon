# PHP + MySQL backend setup

This backend powers:
- dynamic product/review data from MySQL
- BMI calculation via backend API (`/api/bmi.php`)

## 0) Prerequisites

Install PHP MySQL extension (required for PDO MySQL):

```bash
sudo apt update
sudo apt install -y php8.1-mysql
php -m | grep -Ei 'pdo|mysql'
```

Expected modules include `PDO` and `pdo_mysql`.

## 1) Create database user + database

If `root` authentication is restricted on your system, create an app user:

```sql
CREATE DATABASE IF NOT EXISTS nomad_spoon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'nomad_app'@'127.0.0.1' IDENTIFIED BY 'Nomad@1234';
GRANT ALL PRIVILEGES ON nomad_spoon.* TO 'nomad_app'@'127.0.0.1';
FLUSH PRIVILEGES;
```

## 2) Seed schema + data

From MySQL client:

```sql
SOURCE backend/schema.sql;
```

Notes:
- `backend/schema.sql` now reseeds full `products` + `reviews` snapshot.
- `bmi_calculations` does **not** need seed rows (BMI is computed at request time).

## 3) Start PHP server with environment variables

From the `Nomad-Spoon` folder:

```bash
DB_HOST=127.0.0.1 DB_PORT=3306 DB_NAME=nomad_spoon DB_USER=nomad_app DB_PASS='Nomad@1234' php -S localhost:8000
```

## 4) Verify backend

In a new terminal:

```bash
curl -i "http://localhost:8000/api/product.php?all=1"
curl -i "http://localhost:8000/api/product.php?slug=berry-nut-energy-bar"
```

Both should return `200` with JSON.

## 5) Open frontend pages

- `http://localhost:8000/main.html`
- `http://localhost:8000/product.html`
- `http://localhost:8000/BMI.html`
- `http://localhost:8000/admin.html`

## API endpoints

- `GET /api/product.php?all=1`
- `GET /api/product.php?slug=berry-nut-energy-bar`
- `POST /api/bmi.php`
  - Body JSON: `{ age, height, weight, gender, unit, exerciseIndex }`

## Admin CRUD APIs

### Products

- `GET /api/admin/products.php` (list)
- `GET /api/admin/products.php?id=1` (single)
- `POST /api/admin/products.php` (create)
- `PUT /api/admin/products.php?id=1` (update)
- `DELETE /api/admin/products.php?id=1` (delete)

### Reviews

- `GET /api/admin/reviews.php` (list)
- `GET /api/admin/reviews.php?id=1` (single)
- `GET /api/admin/reviews.php?product_id=1` (list by product)
- `POST /api/admin/reviews.php` (create)
- `PUT /api/admin/reviews.php?id=1` (update)
- `DELETE /api/admin/reviews.php?id=1` (delete)

## Troubleshooting

- `{"error":"could not find driver"}`
  - install/enable `php8.1-mysql`
- `SQLSTATE[HY000] [1045] Access denied`
  - wrong DB credentials or host mismatch
  - prefer `nomad_app@127.0.0.1` and `DB_HOST=127.0.0.1`
- After changing PHP extensions/env vars, restart the PHP server.
