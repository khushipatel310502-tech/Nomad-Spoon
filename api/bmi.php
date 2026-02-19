<?php

declare(strict_types=1);

require_once __DIR__ . '/../backend/db.php';

function bmi_category(float $bmi): array
{
    if ($bmi < 18.5) {
        return [
            'category' => 'Under Weight',
            'color' => '#00A6AA',
            'background' => 'rgba(0, 166, 170, 0.15)',
            'description' => 'Based on your BMI, we recommend nutrient-dense meals with increased calorie intake for healthy weight gain.',
            'tag' => 'gain',
        ];
    }

    if ($bmi < 25) {
        return [
            'category' => 'Normal',
            'color' => '#2E7D32',
            'background' => 'rgba(46, 125, 50, 0.15)',
            'description' => 'Great range. We recommend balanced meals to maintain stamina, strength, and hydration on your treks.',
            'tag' => 'maintain',
        ];
    }

    if ($bmi < 30) {
        return [
            'category' => 'Over Weight',
            'color' => '#F57C00',
            'background' => 'rgba(245, 124, 0, 0.15)',
            'description' => 'We recommend lower-calorie, high-fiber meals with good protein to support gradual fat loss and endurance.',
            'tag' => 'loss',
        ];
    }

    return [
        'category' => 'Obese',
        'color' => '#C62828',
        'background' => 'rgba(198, 40, 40, 0.15)',
        'description' => 'We recommend portion-controlled, high-protein options and consistent activity. Consider medical guidance as needed.',
        'tag' => 'loss',
    ];
}

try {
    $input = get_json_input();

    $age = (int)($input['age'] ?? 0);
    $height = (float)($input['height'] ?? 0);
    $weight = (float)($input['weight'] ?? 0);
    $gender = (string)($input['gender'] ?? 'Unknown');
    $unit = (string)($input['unit'] ?? 'Metric');
    $exerciseIndex = (int)($input['exerciseIndex'] ?? 2);

    if ($age <= 0 || $height <= 0 || $weight <= 0) {
        json_response(['error' => 'Invalid BMI input.'], 422);
    }

    if (strtolower($unit) === 'us') {
        // Assume inches and pounds in US mode.
        $height = $height * 2.54;
        $weight = $weight * 0.45359237;
    }

    $bmi = $weight / (($height / 100) ** 2);
    $bmi = round($bmi, 1);

    $meta = bmi_category($bmi);

    $pdo = db();
    $insert = $pdo->prepare('INSERT INTO bmi_calculations (age, height_cm, weight_kg, gender, unit_system, exercise_index, bmi_value, bmi_category) VALUES (:age, :height_cm, :weight_kg, :gender, :unit_system, :exercise_index, :bmi_value, :bmi_category)');
    $insert->execute([
        'age' => $age,
        'height_cm' => $height,
        'weight_kg' => $weight,
        'gender' => $gender,
        'unit_system' => $unit,
        'exercise_index' => $exerciseIndex,
        'bmi_value' => $bmi,
        'bmi_category' => $meta['category'],
    ]);

    $suggestStmt = $pdo->prepare('SELECT id, slug, name, weight_g, price, mrp, rating, review_count, value_proposition, category_tag, image_url FROM products WHERE category_tag = :tag ORDER BY rating DESC LIMIT 6');
    $suggestStmt->execute(['tag' => $meta['tag']]);
    $suggestions = $suggestStmt->fetchAll();

    json_response([
        'bmi' => $bmi,
        'category' => $meta['category'],
        'color' => $meta['color'],
        'background' => $meta['background'],
        'description' => $meta['description'],
        'suggestions' => $suggestions,
    ]);
} catch (Throwable $e) {
    json_response(['error' => $e->getMessage()], 500);
}
