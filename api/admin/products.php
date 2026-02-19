<?php

declare(strict_types=1);

require_once __DIR__ . '/../../backend/db.php';

function validate_product_payload(array $payload, bool $partial = false): array
{
    $required = ['slug', 'name', 'description', 'weight_g', 'price', 'mrp', 'rating', 'review_count', 'value_proposition', 'category_tag'];
    if (!$partial) {
        foreach ($required as $field) {
            if (!array_key_exists($field, $payload)) {
                json_response(['error' => "Missing field: {$field}"], 422);
            }
        }
    }

    $validTags = ['gain', 'maintain', 'loss'];
    if (isset($payload['category_tag']) && !in_array($payload['category_tag'], $validTags, true)) {
        json_response(['error' => 'category_tag must be one of gain|maintain|loss'], 422);
    }

    return [
        'slug' => isset($payload['slug']) ? trim((string)$payload['slug']) : null,
        'name' => isset($payload['name']) ? trim((string)$payload['name']) : null,
        'description' => isset($payload['description']) ? trim((string)$payload['description']) : null,
        'weight_g' => isset($payload['weight_g']) ? (int)$payload['weight_g'] : null,
        'price' => isset($payload['price']) ? (float)$payload['price'] : null,
        'mrp' => isset($payload['mrp']) ? (float)$payload['mrp'] : null,
        'rating' => isset($payload['rating']) ? (float)$payload['rating'] : null,
        'review_count' => isset($payload['review_count']) ? (int)$payload['review_count'] : null,
        'value_proposition' => isset($payload['value_proposition']) ? trim((string)$payload['value_proposition']) : null,
        'category_tag' => $payload['category_tag'] ?? null,
        'image_url' => isset($payload['image_url']) ? trim((string)$payload['image_url']) : null,
    ];
}

try {
    $pdo = db();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
        if ($id) {
            $stmt = $pdo->prepare('SELECT * FROM products WHERE id = :id LIMIT 1');
            $stmt->execute(['id' => $id]);
            $product = $stmt->fetch();
            if (!$product) {
                json_response(['error' => 'Product not found'], 404);
            }
            json_response(['product' => $product]);
        }

        $rows = $pdo->query('SELECT * FROM products ORDER BY id DESC')->fetchAll();
        json_response(['products' => $rows]);
    }

    if ($method === 'POST') {
        $input = validate_product_payload(get_json_input());

        $stmt = $pdo->prepare('INSERT INTO products (slug, name, description, weight_g, price, mrp, rating, review_count, value_proposition, category_tag, image_url) VALUES (:slug, :name, :description, :weight_g, :price, :mrp, :rating, :review_count, :value_proposition, :category_tag, :image_url)');
        $stmt->execute([
            'slug' => $input['slug'],
            'name' => $input['name'],
            'description' => $input['description'],
            'weight_g' => $input['weight_g'],
            'price' => $input['price'],
            'mrp' => $input['mrp'],
            'rating' => $input['rating'],
            'review_count' => $input['review_count'],
            'value_proposition' => $input['value_proposition'],
            'category_tag' => $input['category_tag'],
            'image_url' => $input['image_url'],
        ]);

        $id = (int)$pdo->lastInsertId();
        json_response(['id' => $id, 'message' => 'Product created'], 201);
    }

    if ($method === 'PUT') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id <= 0) {
            json_response(['error' => 'Missing id'], 422);
        }

        $input = validate_product_payload(get_json_input(), true);
        $fields = [];
        $params = ['id' => $id];
        foreach ($input as $key => $value) {
            if ($value !== null) {
                $fields[] = "{$key} = :{$key}";
                $params[$key] = $value;
            }
        }

        if (count($fields) === 0) {
            json_response(['error' => 'No fields to update'], 422);
        }

        $sql = 'UPDATE products SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        json_response(['message' => 'Product updated']);
    }

    if ($method === 'DELETE') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id <= 0) {
            json_response(['error' => 'Missing id'], 422);
        }

        $stmt = $pdo->prepare('DELETE FROM products WHERE id = :id');
        $stmt->execute(['id' => $id]);

        json_response(['message' => 'Product deleted']);
    }

    json_response(['error' => 'Method not allowed'], 405);
} catch (Throwable $e) {
    json_response(['error' => $e->getMessage()], 500);
}
