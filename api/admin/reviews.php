<?php

declare(strict_types=1);

require_once __DIR__ . '/../../backend/db.php';

function validate_review_payload(array $payload, bool $partial = false): array
{
    $required = ['product_id', 'user_name', 'review_text', 'rating'];
    if (!$partial) {
        foreach ($required as $field) {
            if (!array_key_exists($field, $payload)) {
                json_response(['error' => "Missing field: {$field}"], 422);
            }
        }
    }

    return [
        'product_id' => isset($payload['product_id']) ? (int)$payload['product_id'] : null,
        'user_name' => isset($payload['user_name']) ? trim((string)$payload['user_name']) : null,
        'review_text' => isset($payload['review_text']) ? trim((string)$payload['review_text']) : null,
        'rating' => isset($payload['rating']) ? (float)$payload['rating'] : null,
    ];
}

try {
    $pdo = db();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
        $productId = isset($_GET['product_id']) ? (int)$_GET['product_id'] : null;

        if ($id) {
            $stmt = $pdo->prepare('SELECT r.*, p.name AS product_name FROM reviews r JOIN products p ON p.id = r.product_id WHERE r.id = :id LIMIT 1');
            $stmt->execute(['id' => $id]);
            $review = $stmt->fetch();
            if (!$review) {
                json_response(['error' => 'Review not found'], 404);
            }
            json_response(['review' => $review]);
        }

        if ($productId) {
            $stmt = $pdo->prepare('SELECT r.*, p.name AS product_name FROM reviews r JOIN products p ON p.id = r.product_id WHERE r.product_id = :product_id ORDER BY r.created_at DESC');
            $stmt->execute(['product_id' => $productId]);
            json_response(['reviews' => $stmt->fetchAll()]);
        }

        $rows = $pdo->query('SELECT r.*, p.name AS product_name FROM reviews r JOIN products p ON p.id = r.product_id ORDER BY r.id DESC')->fetchAll();
        json_response(['reviews' => $rows]);
    }

    if ($method === 'POST') {
        $input = validate_review_payload(get_json_input());

        $check = $pdo->prepare('SELECT id FROM products WHERE id = :id LIMIT 1');
        $check->execute(['id' => $input['product_id']]);
        if (!$check->fetch()) {
            json_response(['error' => 'Invalid product_id'], 422);
        }

        $stmt = $pdo->prepare('INSERT INTO reviews (product_id, user_name, review_text, rating) VALUES (:product_id, :user_name, :review_text, :rating)');
        $stmt->execute([
            'product_id' => $input['product_id'],
            'user_name' => $input['user_name'],
            'review_text' => $input['review_text'],
            'rating' => $input['rating'],
        ]);

        $id = (int)$pdo->lastInsertId();
        json_response(['id' => $id, 'message' => 'Review created'], 201);
    }

    if ($method === 'PUT') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id <= 0) {
            json_response(['error' => 'Missing id'], 422);
        }

        $input = validate_review_payload(get_json_input(), true);

        if (isset($input['product_id']) && $input['product_id'] !== null) {
            $check = $pdo->prepare('SELECT id FROM products WHERE id = :id LIMIT 1');
            $check->execute(['id' => $input['product_id']]);
            if (!$check->fetch()) {
                json_response(['error' => 'Invalid product_id'], 422);
            }
        }

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

        $sql = 'UPDATE reviews SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        json_response(['message' => 'Review updated']);
    }

    if ($method === 'DELETE') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id <= 0) {
            json_response(['error' => 'Missing id'], 422);
        }

        $stmt = $pdo->prepare('DELETE FROM reviews WHERE id = :id');
        $stmt->execute(['id' => $id]);

        json_response(['message' => 'Review deleted']);
    }

    json_response(['error' => 'Method not allowed'], 405);
} catch (Throwable $e) {
    json_response(['error' => $e->getMessage()], 500);
}
