<?php
declare(strict_types=1);

/**
 * Jednorázová webová instalace tabulek (záloha, když SQL import z panelu nejde).
 * Po úspěchu soubor ze serveru SMAŽTE.
 *
 * Otevřete: https://vase-domena.cz/api/install.php?key=VASE_TAJNE_HESLO
 */

$installKey = 'zmente-toto-heslo-pred-spustenim';

$configPath = __DIR__ . '/config.local.php';
if (is_file($configPath)) {
    $cfg = require $configPath;
    if (!empty($cfg['install_key'])) {
        $installKey = (string) $cfg['install_key'];
    }
}

header('Content-Type: text/html; charset=utf-8');

$key = $_GET['key'] ?? '';
if (!hash_equals($installKey, $key)) {
    http_response_code(403);
    echo '<h1>403 – neplatný instalační klíč</h1>';
    exit;
}

if (!is_file($configPath)) {
    echo '<h1>Chybí config.local.php</h1>';
    exit;
}

require __DIR__ . '/bootstrap.php';

$sqlFile = __DIR__ . '/setup.sql';
if (!is_file($sqlFile)) {
    echo '<h1>Chybí setup.sql</h1>';
    exit;
}

$raw = file_get_contents($sqlFile);
$statements = array_filter(
    array_map('trim', preg_split('/;\s*\n/', $raw) ?: []),
    static function (string $stmt): bool {
        if ($stmt === '') {
            return false;
        }
        $lines = preg_split('/\r?\n/', $stmt) ?: [];
        $code = implode("\n", array_filter($lines, static fn ($l) => !str_starts_with(ltrim($l), '--')));
        return trim($code) !== '';
    }
);

$pdo = get_pdo();
$ok = [];
$errors = [];

foreach ($statements as $stmt) {
    $preview = preg_replace('/\s+/', ' ', $stmt);
    $preview = substr($preview, 0, 80) . '…';
    try {
        $pdo->exec($stmt);
        $ok[] = $preview;
    } catch (PDOException $e) {
        $errors[] = $preview . ' → ' . $e->getMessage();
    }
}

echo '<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><title>Instalace DB</title></head><body>';
echo '<h1>Instalace databáze</h1>';

if ($ok) {
    echo '<h2>Úspěšně provedeno (' . count($ok) . ')</h2><ul>';
    foreach ($ok as $line) {
        echo '<li>' . htmlspecialchars($line) . '</li>';
    }
    echo '</ul>';
}

if ($errors) {
    echo '<h2>Chyby (' . count($errors) . ')</h2>';
    echo '<p>Pokud vidíte <strong>#1142 CREATE command denied</strong>, použijte import SQL přes ';
    echo '<a href="https://client.wedos.com/">Wedos administraci</a>.</p><ul>';
    foreach ($errors as $line) {
        echo '<li>' . htmlspecialchars($line) . '</li>';
    }
    echo '</ul>';
} elseif ($ok) {
    echo '<p><strong>Hotovo.</strong> Vytvořte admin účet přes setup-admin.php a soubor install.php ze serveru smažte.</p>';
}

echo '</body></html>';
