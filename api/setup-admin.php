<?php
declare(strict_types=1);

/**
 * Jednorázové vytvoření admin účtu přes prohlížeč (bez SSH na Wedosu).
 * Po úspěchu soubor ze serveru SMAŽTE.
 *
 * https://monikazelena.cz/api/setup-admin.php?key=KLIC&email=vas@email.cz&password=VaseHeslo
 */

$installKey = 'monika-setup-2026';

$configPath = __DIR__ . '/config.local.php';
if (is_file($configPath)) {
    $cfg = require $configPath;
    if (!empty($cfg['install_key'])) {
        $installKey = (string) $cfg['install_key'];
    }
}

header('Content-Type: text/html; charset=utf-8');

$key = $_GET['key'] ?? '';
$email = trim((string) ($_GET['email'] ?? ''));
$password = (string) ($_GET['password'] ?? '');

if (!hash_equals($installKey, $key)) {
    http_response_code(403);
    echo '<h1>403 – neplatný klíč</h1>';
    echo '<p>Použijte URL ve tvaru:<br><code>setup-admin.php?key=KLIC&email=vas@email.cz&password=VaseHeslo</code></p>';
    exit;
}

if (!is_file($configPath)) {
    echo '<h1>Chybí api/config.local.php</h1>';
    exit;
}

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo '<h1>Chybí e-mail</h1>';
    exit;
}

if (strlen($password) < 6) {
    echo '<h1>Heslo je příliš krátké</h1>';
    exit;
}

require __DIR__ . '/bootstrap.php';

$pdo = get_pdo();
$hash = password_hash($password, PASSWORD_DEFAULT);

try {
    $stmt = $pdo->prepare('INSERT INTO admin_users (email, password_hash) VALUES (:email, :hash)');
    $stmt->execute(['email' => $email, 'hash' => $hash]);
    echo '<h1>Admin účet vytvořen</h1>';
    echo '<p>Přihlaste se na <a href="/admin/login.html">/admin/login.html</a></p>';
    echo '<p><strong>Důležité:</strong> Smažte ze serveru <code>api/setup-admin.php</code> a <code>api/install.php</code>.</p>';
} catch (PDOException $e) {
    if ((int) $e->getCode() === 23000) {
        echo '<h1>Uživatel už existuje</h1>';
    } else {
        echo '<h1>Chyba databáze</h1><pre>' . htmlspecialchars($e->getMessage()) . '</pre>';
    }
}
