<?php

declare(strict_types=1);

require_once __DIR__ . '/../backend/db.php';

try {
    $pdo = db();

    if (isset($_GET['all']) && (string)$_GET['all'] === '1') {
        $allProducts = $pdo->query('SELECT * FROM products ORDER BY id ASC')->fetchAll();
        json_response(['products' => $allProducts]);
    }

    $slug = trim((string)($_GET['slug'] ?? 'berry-nut-energy-bar'));
    if ($slug === '') {
        $slug = 'berry-nut-energy-bar';
    }

    $stmt = $pdo->prepare('SELECT * FROM products WHERE slug = :slug LIMIT 1');
    $stmt->execute(['slug' => $slug]);
    $product = $stmt->fetch();

    if (!$product) {
        $product = $pdo->query('SELECT * FROM products ORDER BY id ASC LIMIT 1')->fetch();
    }

    if (!$product) {
        json_response(['error' => 'No product data found. Please seed the database first.'], 404);
    }

    $similarStmt = $pdo->prepare('SELECT * FROM products WHERE id <> :id ORDER BY rating DESC, id ASC LIMIT 6');
    $similarStmt->execute(['id' => $product['id']]);
    $similar = $similarStmt->fetchAll();

    $reviewStmt = $pdo->prepare('SELECT user_name, review_text, rating, created_at FROM reviews WHERE product_id = :id ORDER BY created_at DESC LIMIT 20');
    $reviewStmt->execute(['id' => $product['id']]);
    $reviews = $reviewStmt->fetchAll();

    $now = new DateTimeImmutable('now');
    foreach ($reviews as &$review) {
        $created = new DateTimeImmutable((string)$review['created_at']);
        $days = max(1, (int)$created->diff($now)->days);
        $review['created_label'] = $days === 1 ? '1 day ago' : $days . ' days ago';
    }

    $categoryTag = (string)$product['category_tag'];
    $suggestStmt = $pdo->prepare('SELECT * FROM products WHERE category_tag = :tag ORDER BY rating DESC, id ASC LIMIT 6');
    $suggestStmt->execute(['tag' => $categoryTag]);
    $suggestions = $suggestStmt->fetchAll();

    json_response([
        'product' => $product,
        'similar' => $similar,
        'reviews' => $reviews,
        'suggestions' => $suggestions,
    ]);
} catch (Throwable $e) {
    json_response(['error' => $e->getMessage()], 500);
}
