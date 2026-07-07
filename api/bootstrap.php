<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

$configPath = __DIR__ . '/config.local.php';
if (!is_file($configPath)) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Chybí api/config.local.php – zkopírujte config.example.php a doplňte údaje z Wedos.',
    ]);
    exit;
}

/** @var array<string, mixed> $CONFIG */
$CONFIG = require $configPath;

function json_response(mixed $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_error(string $message, int $status = 400): void
{
    json_response(['error' => $message], $status);
}

function get_pdo(): PDO
{
    global $CONFIG;

    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $db = $CONFIG['db'];
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        $db['host'],
        $db['name'],
        $db['charset'] ?? 'utf8mb4'
    );

    $pdo = new PDO($dsn, $db['user'], $db['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        json_error('Neplatný JSON v těle požadavku.', 400);
    }

    return $data;
}

function bearer_token(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
        return trim($matches[1]);
    }
    return null;
}

function require_auth(): array
{
    $token = bearer_token();
    if (!$token) {
        json_error('Neautorizováno – přihlaste se.', 401);
    }

    $pdo = get_pdo();
    $stmt = $pdo->prepare(
        'SELECT u.id, u.email
         FROM admin_sessions s
         INNER JOIN admin_users u ON u.id = s.user_id
         WHERE s.token = :token AND s.expires_at > NOW()
         LIMIT 1'
    );
    $stmt->execute(['token' => hash('sha256', $token)]);
    $user = $stmt->fetch();

    if (!$user) {
        json_error('Neplatná nebo expirovaná session – přihlaste se znovu.', 401);
    }

    return $user;
}

function create_session(int $userId): array
{
    global $CONFIG;

    $token = bin2hex(random_bytes(32));
    $ttlDays = (int) ($CONFIG['session_ttl_days'] ?? 7);
    $expiresAt = (new DateTimeImmutable("+{$ttlDays} days"))->format('Y-m-d H:i:s');

    $pdo = get_pdo();
    $stmt = $pdo->prepare(
        'INSERT INTO admin_sessions (token, user_id, expires_at) VALUES (:token, :user_id, :expires_at)'
    );
    $stmt->execute([
        'token' => hash('sha256', $token),
        'user_id' => $userId,
        'expires_at' => $expiresAt,
    ]);

    return [
        'token' => $token,
        'expires_at' => $expiresAt,
    ];
}

function property_row_to_api(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'name' => $row['name'],
        'price' => $row['price'] !== null ? (int) $row['price'] : null,
        'location' => $row['location'],
        'type' => $row['type'],
        'status' => $row['status'],
        'link' => $row['link'],
        'image' => $row['image'],
        'created_at' => $row['created_at'],
    ];
}

function project_row_to_api(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'name' => $row['name'],
        'location' => $row['location'],
        'description' => $row['description'],
        'link' => $row['link'],
        'image' => $row['image'],
        'status' => $row['status'],
        'created_at' => $row['created_at'],
    ];
}

function validate_property_payload(array $data, bool $isUpdate = false): array
{
    $name = trim((string) ($data['name'] ?? ''));
    $location = trim((string) ($data['location'] ?? ''));
    $link = trim((string) ($data['link'] ?? ''));
    $image = trim((string) ($data['image'] ?? ''));

    if (!$isUpdate || array_key_exists('name', $data)) {
        if ($name === '') {
            json_error('Název je povinný.');
        }
    }

    if (!$isUpdate || array_key_exists('location', $data)) {
        if ($location === '') {
            json_error('Lokalita je povinná.');
        }
    }

    if (!$isUpdate || array_key_exists('link', $data)) {
        if ($link === '') {
            json_error('Odkaz je povinný.');
        }
    }

    if (!$isUpdate || array_key_exists('image', $data)) {
        if ($image === '') {
            json_error('Obrázek je povinný.');
        }
    }

    $type = (string) ($data['type'] ?? 'sale');
    if (!in_array($type, ['sale', 'rent'], true)) {
        json_error('Neplatný typ nabídky.');
    }

    $status = (string) ($data['status'] ?? 'active');
    if (!in_array($status, ['active', 'reserved', 'sold'], true)) {
        json_error('Neplatný stav nemovitosti.');
    }

    $price = $data['price'] ?? null;
    if ($price === '' || $price === null) {
        $price = null;
    } else {
        $price = (int) $price;
        if ($price < 0) {
            json_error('Cena musí být nezáporná.');
        }
    }

    return [
        'name' => $name,
        'price' => $price,
        'location' => $location,
        'type' => $type,
        'status' => $status,
        'link' => $link,
        'image' => $image,
    ];
}

function validate_project_payload(array $data, bool $isUpdate = false): array
{
    $name = trim((string) ($data['name'] ?? ''));
    $location = trim((string) ($data['location'] ?? ''));
    $description = trim((string) ($data['description'] ?? ''));
    $link = trim((string) ($data['link'] ?? ''));
    $image = trim((string) ($data['image'] ?? ''));

    if (!$isUpdate || array_key_exists('name', $data)) {
        if ($name === '') {
            json_error('Název je povinný.');
        }
    }

    if (!$isUpdate || array_key_exists('location', $data)) {
        if ($location === '') {
            json_error('Lokalita je povinná.');
        }
    }

    if (!$isUpdate || array_key_exists('link', $data)) {
        if ($link === '') {
            json_error('Odkaz je povinný.');
        }
    }

    if (!$isUpdate || array_key_exists('image', $data)) {
        if ($image === '') {
            json_error('Obrázek je povinný.');
        }
    }

    $status = (string) ($data['status'] ?? 'active');
    if (!in_array($status, ['active', 'realized'], true)) {
        json_error('Neplatný stav projektu.');
    }

    return [
        'name' => $name,
        'location' => $location,
        'description' => $description,
        'link' => $link,
        'image' => $image,
        'status' => $status,
    ];
}

function merge_property_update(array $existing, array $body): array
{
    $merged = [
        'name' => $existing['name'],
        'price' => $existing['price'],
        'location' => $existing['location'],
        'type' => $existing['type'],
        'status' => $existing['status'],
        'link' => $existing['link'],
        'image' => $existing['image'],
    ];

    foreach (['name', 'location', 'link', 'image', 'type', 'status'] as $field) {
        if (array_key_exists($field, $body)) {
            $merged[$field] = $body[$field];
        }
    }

    if (array_key_exists('price', $body)) {
        $merged['price'] = $body['price'];
    }

    return $merged;
}

function merge_project_update(array $existing, array $body): array
{
    $merged = [
        'name' => $existing['name'],
        'location' => $existing['location'],
        'description' => $existing['description'],
        'link' => $existing['link'],
        'image' => $existing['image'],
        'status' => $existing['status'],
    ];

    foreach (['name', 'location', 'description', 'link', 'image', 'status'] as $field) {
        if (array_key_exists($field, $body)) {
            $merged[$field] = $body[$field];
        }
    }

    return $merged;
}

function upload_config(string $bucket): array
{
    global $CONFIG;

    $uploads = $CONFIG['upload'] ?? [];
    if (!isset($uploads[$bucket]) || !is_array($uploads[$bucket])) {
        json_error('Neplatný typ uploadu.', 400);
    }

    return $uploads[$bucket];
}

function video_config(string $type): array
{
    global $CONFIG;

    if (!in_array($type, allowed_video_types(), true)) {
        json_error('Neplatný typ videa.', 400);
    }

    $videos = $CONFIG['videos'] ?? [];
    if (!isset($videos[$type]) || !is_array($videos[$type])) {
        json_error('Konfigurace videí chybí.', 500);
    }

    return $videos[$type];
}

function allowed_video_types(): array
{
    return ['social', 'presentation', 'presentation_portrait', 'presentation_landscape'];
}

function video_manifest_type(string $type): string
{
    if (in_array($type, ['presentation', 'presentation_landscape'], true)) {
        return 'presentation_landscape';
    }

    return $type;
}

function upload_error_message(int $code): string
{
    return match ($code) {
        UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Soubor je příliš velký pro nastavení serveru (upload_max_filesize / post_max_size).',
        UPLOAD_ERR_PARTIAL => 'Soubor byl nahrán jen částečně – zkuste to znovu.',
        UPLOAD_ERR_NO_FILE => 'Nebyl nahrán žádný soubor.',
        UPLOAD_ERR_NO_TMP_DIR => 'Chybí dočasná složka na serveru.',
        UPLOAD_ERR_CANT_WRITE => 'Nelze zapsat soubor na disk.',
        UPLOAD_ERR_EXTENSION => 'Nahrání zablokovalo rozšíření PHP.',
        default => 'Nahrání souboru se nezdařilo.',
    };
}

function format_bytes(int $bytes): string
{
    if ($bytes >= 1024 * 1024) {
        return round($bytes / (1024 * 1024)) . ' MB';
    }

    if ($bytes >= 1024) {
        return round($bytes / 1024) . ' KB';
    }

    return $bytes . ' B';
}

function delete_uploaded_image(?string $imageUrl, string $bucket = 'properties'): void
{
    $cfg = upload_config($bucket);
    $prefix = rtrim((string) ($cfg['url_prefix'] ?? ''), '/');
    if (!$imageUrl || $prefix === '' || !str_starts_with($imageUrl, $prefix . '/')) {
        return;
    }

    $filename = basename(parse_url($imageUrl, PHP_URL_PATH) ?: '');
    if ($filename === '') {
        return;
    }

    $path = rtrim((string) $cfg['dir'], DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $filename;
    if (is_file($path)) {
        @unlink($path);
    }
}

function normalize_video_orientation(mixed $value): ?string
{
    $orientation = is_string($value) ? strtolower(trim($value)) : '';

    return in_array($orientation, ['portrait', 'landscape'], true) ? $orientation : null;
}

function video_manifest_path(string $type): string
{
    $cfg = video_config($type);
    $dir = rtrim((string) ($cfg['dir'] ?? ''), DIRECTORY_SEPARATOR);

    return $dir . DIRECTORY_SEPARATOR . 'manifest.json';
}

function read_video_manifest(string $type): array
{
    $path = video_manifest_path($type);
    if (!is_file($path)) {
        return [];
    }

    $raw = file_get_contents($path);
    $data = is_string($raw) ? json_decode($raw, true) : null;
    $files = $data['files'] ?? null;

    return is_array($files) ? $files : [];
}

function write_video_manifest(string $type, array $files): void
{
    $cfg = video_config($type);
    $dir = rtrim((string) ($cfg['dir'] ?? ''), DIRECTORY_SEPARATOR);
    $path = video_manifest_path($type);

    if ($files === []) {
        if (is_file($path)) {
            @unlink($path);
        }

        return;
    }

    $payload = json_encode(
        ['files' => $files],
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
    );
    file_put_contents($path, $payload);
}

function set_video_manifest_entry(string $type, string $filename, array $entry): void
{
    $files = read_video_manifest($type);

    if ($entry === []) {
        unset($files[$filename]);
    } else {
        $files[$filename] = array_merge($files[$filename] ?? [], $entry);
    }

    write_video_manifest($type, $files);
}

function remove_video_manifest_entry(string $type, string $filename): void
{
    $files = read_video_manifest($type);
    if (!isset($files[$filename])) {
        return;
    }

    unset($files[$filename]);
    write_video_manifest($type, $files);
}

function is_video_upload_bucket(string $bucket): bool
{
    return in_array($bucket, ['social', 'presentation', 'presentation_portrait', 'presentation_landscape'], true);
}

function normalize_video_upload_bucket(string $bucket): string
{
    if ($bucket === 'presentation') {
        return 'presentation_landscape';
    }

    return $bucket;
}

function default_video_orientation(string $type): ?string
{
    return match ($type) {
        'presentation_portrait' => 'portrait',
        'presentation_landscape', 'presentation' => 'landscape',
        default => null,
    };
}

function enrich_videos_for_type(string $type, array $videos): array
{
    if ($videos === []) {
        return $videos;
    }

    $defaultOrientation = default_video_orientation($type);
    $manifest = in_array($type, ['presentation', 'presentation_landscape'], true)
        ? read_video_manifest(video_manifest_type($type))
        : [];

    return array_map(
        static function (array $video) use ($defaultOrientation, $manifest): array {
            if ($defaultOrientation !== null) {
                $video['orientation'] = $defaultOrientation;
            }

            $filename = (string) ($video['filename'] ?? '');
            if ($filename !== '' && isset($manifest[$filename])) {
                $orientation = normalize_video_orientation($manifest[$filename]['orientation'] ?? null);
                if ($orientation !== null) {
                    $video['orientation'] = $orientation;
                }
            }

            return $video;
        },
        $videos
    );
}
