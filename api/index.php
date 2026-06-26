<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = trim((string) ($_GET['route'] ?? ''), '/');

if ($path === '' && !empty($_SERVER['PATH_INFO'])) {
    $path = trim((string) $_SERVER['PATH_INFO'], '/');
}

if ($path === '') {
    $uri = (string) ($_SERVER['REQUEST_URI'] ?? '');
    if (preg_match('#/api/(?:index\.php/)?([^?]+)#', $uri, $matches)) {
        $path = trim($matches[1], '/');
    }
}

try {
    match (true) {
        $path === 'auth/login' && $method === 'POST' => handle_auth_login(),
        $path === 'auth/logout' && $method === 'POST' => handle_auth_logout(),
        $path === 'auth/session' && $method === 'GET' => handle_auth_session(),
        $path === 'properties' && $method === 'GET' => handle_properties_list(),
        $path === 'properties' && $method === 'POST' => handle_properties_create(),
        preg_match('#^properties/(\d+)$#', $path, $m) && $method === 'GET' => handle_properties_get((int) $m[1]),
        preg_match('#^properties/(\d+)$#', $path, $m) && $method === 'PUT' => handle_properties_update((int) $m[1]),
        preg_match('#^properties/(\d+)$#', $path, $m) && $method === 'DELETE' => handle_properties_delete((int) $m[1]),
        $path === 'projects' && $method === 'GET' => handle_projects_list(),
        $path === 'projects' && $method === 'POST' => handle_projects_create(),
        preg_match('#^projects/(\d+)$#', $path, $m) && $method === 'GET' => handle_projects_get((int) $m[1]),
        preg_match('#^projects/(\d+)$#', $path, $m) && $method === 'PUT' => handle_projects_update((int) $m[1]),
        preg_match('#^projects/(\d+)$#', $path, $m) && $method === 'DELETE' => handle_projects_delete((int) $m[1]),
        $path === 'reviews' && $method === 'GET' => handle_reviews_list(),
        $path === 'reviews' && $method === 'POST' => handle_reviews_create(),
        preg_match('#^reviews/(\d+)$#', $path, $m) && $method === 'PUT' => handle_reviews_update((int) $m[1]),
        preg_match('#^reviews/(\d+)$#', $path, $m) && $method === 'DELETE' => handle_reviews_delete((int) $m[1]),
        $path === 'upload' && $method === 'POST' => handle_upload(),
        $path === 'videos' && $method === 'GET' => handle_videos_list(),
        $path === 'videos' && $method === 'DELETE' => handle_videos_delete(),
        default => json_error('Endpoint nenalezen.', 404),
    };
} catch (PDOException $e) {
    json_error('Chyba databáze: ' . $e->getMessage(), 500);
}

function handle_auth_login(): void
{
    $body = read_json_body();
    $email = trim((string) ($body['email'] ?? ''));
    $password = (string) ($body['password'] ?? '');

    if ($email === '' || $password === '') {
        json_error('Zadejte e-mail a heslo.', 400);
    }

    $pdo = get_pdo();
    $stmt = $pdo->prepare('SELECT id, email, password_hash FROM admin_users WHERE email = :email LIMIT 1');
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        json_error('Neplatný e-mail nebo heslo.', 401);
    }

    $session = create_session((int) $user['id']);

    json_response([
        'token' => $session['token'],
        'expires_at' => $session['expires_at'],
        'user' => ['email' => $user['email']],
    ]);
}

function handle_auth_logout(): void
{
    $token = bearer_token();
    if ($token) {
        $pdo = get_pdo();
        $stmt = $pdo->prepare('DELETE FROM admin_sessions WHERE token = :token');
        $stmt->execute(['token' => hash('sha256', $token)]);
    }

    json_response(['ok' => true]);
}

function handle_auth_session(): void
{
    $user = require_auth();
    json_response(['user' => ['email' => $user['email']]]);
}

function handle_properties_list(): void
{
    $pdo = get_pdo();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    $admin = bearer_token() !== null;

    if ($id > 0) {
        handle_properties_get($id);
    }

    if ($admin) {
        try {
            require_auth();
            $stmt = $pdo->query('SELECT * FROM properties ORDER BY name ASC');
        } catch (Throwable) {
            json_error('Neautorizováno – přihlaste se.', 401);
        }
    } else {
        $stmt = $pdo->query(
            "SELECT * FROM properties WHERE status IN ('active', 'reserved', 'sold') ORDER BY created_at DESC"
        );
    }

    $rows = $stmt->fetchAll();
    json_response(array_map('property_row_to_api', $rows));
}

function handle_properties_get(int $id): void
{
    $pdo = get_pdo();
    $stmt = $pdo->prepare('SELECT * FROM properties WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();

    if (!$row) {
        json_error('Nemovitost nenalezena.', 404);
    }

    json_response(property_row_to_api($row));
}

function handle_properties_create(): void
{
    require_auth();
    $payload = validate_property_payload(read_json_body(), false);
    $pdo = get_pdo();

    $stmt = $pdo->prepare(
        'INSERT INTO properties (name, price, location, type, status, link, image)
         VALUES (:name, :price, :location, :type, :status, :link, :image)'
    );
    $stmt->execute($payload);

    handle_properties_get((int) $pdo->lastInsertId());
}

function handle_properties_update(int $id): void
{
    require_auth();
    $body = read_json_body();
    $pdo = get_pdo();

    $stmt = $pdo->prepare('SELECT * FROM properties WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $existing = $stmt->fetch();
    if (!$existing) {
        json_error('Nemovitost nenalezena.', 404);
    }

    $merged = merge_property_update($existing, $body);
    $payload = validate_property_payload($merged, true);

    $stmt = $pdo->prepare(
        'UPDATE properties SET
            name = :name, price = :price, location = :location,
            type = :type, status = :status, link = :link, image = :image
         WHERE id = :id'
    );
    $stmt->execute(array_merge($payload, ['id' => $id]));

    if ($existing['image'] !== $payload['image']) {
        delete_uploaded_image($existing['image'], 'properties');
    }

    handle_properties_get($id);
}

function handle_properties_delete(int $id): void
{
    require_auth();
    $pdo = get_pdo();

    $stmt = $pdo->prepare('SELECT image FROM properties WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    if (!$row) {
        json_error('Nemovitost nenalezena.', 404);
    }

    $stmt = $pdo->prepare('DELETE FROM properties WHERE id = :id');
    $stmt->execute(['id' => $id]);

    delete_uploaded_image($row['image'] ?? null, 'properties');

    json_response(['ok' => true]);
}

function handle_projects_list(): void
{
    $pdo = get_pdo();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id > 0) {
        handle_projects_get($id);
    }

    $stmt = $pdo->query('SELECT * FROM projects ORDER BY created_at DESC');
    json_response(array_map('project_row_to_api', $stmt->fetchAll()));
}

function handle_projects_get(int $id): void
{
    $pdo = get_pdo();
    $stmt = $pdo->prepare('SELECT * FROM projects WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();

    if (!$row) {
        json_error('Projekt nenalezen.', 404);
    }

    json_response(project_row_to_api($row));
}

function handle_projects_create(): void
{
    require_auth();
    $payload = validate_project_payload(read_json_body(), false);
    $pdo = get_pdo();

    $stmt = $pdo->prepare(
        'INSERT INTO projects (name, location, description, link, image, status)
         VALUES (:name, :location, :description, :link, :image, :status)'
    );
    $stmt->execute($payload);

    handle_projects_get((int) $pdo->lastInsertId());
}

function handle_projects_update(int $id): void
{
    require_auth();
    $body = read_json_body();
    $pdo = get_pdo();

    $stmt = $pdo->prepare('SELECT * FROM projects WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $existing = $stmt->fetch();
    if (!$existing) {
        json_error('Projekt nenalezen.', 404);
    }

    $merged = merge_project_update($existing, $body);
    $payload = validate_project_payload($merged, true);

    $stmt = $pdo->prepare(
        'UPDATE projects SET
            name = :name, location = :location, description = :description,
            link = :link, image = :image, status = :status
         WHERE id = :id'
    );
    $stmt->execute(array_merge($payload, ['id' => $id]));

    if ($existing['image'] !== $payload['image']) {
        delete_uploaded_image($existing['image'], 'projects');
    }

    handle_projects_get($id);
}

function handle_projects_delete(int $id): void
{
    require_auth();
    $pdo = get_pdo();

    $stmt = $pdo->prepare('SELECT image FROM projects WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    if (!$row) {
        json_error('Projekt nenalezen.', 404);
    }

    $stmt = $pdo->prepare('DELETE FROM projects WHERE id = :id');
    $stmt->execute(['id' => $id]);

    delete_uploaded_image($row['image'] ?? null, 'projects');

    json_response(['ok' => true]);
}

function handle_reviews_list(): void
{
    $pdo = get_pdo();
    $stmt = $pdo->query('SELECT id, text, author, created_at FROM reviews ORDER BY created_at DESC');
    json_response($stmt->fetchAll());
}

function handle_reviews_create(): void
{
    require_auth();
    $body = read_json_body();
    $text = trim((string) ($body['text'] ?? ''));
    $author = trim((string) ($body['author'] ?? ''));

    if ($text === '' || $author === '') {
        json_error('Text a autor jsou povinné.');
    }

    $pdo = get_pdo();
    $stmt = $pdo->prepare('INSERT INTO reviews (text, author) VALUES (:text, :author)');
    $stmt->execute(['text' => $text, 'author' => $author]);

    $id = (int) $pdo->lastInsertId();
    $stmt = $pdo->prepare('SELECT id, text, author, created_at FROM reviews WHERE id = :id');
    $stmt->execute(['id' => $id]);
    json_response($stmt->fetch(), 201);
}

function handle_reviews_update(int $id): void
{
    require_auth();
    $body = read_json_body();
    $text = trim((string) ($body['text'] ?? ''));
    $author = trim((string) ($body['author'] ?? ''));

    if ($text === '' || $author === '') {
        json_error('Text a autor jsou povinné.');
    }

    $pdo = get_pdo();
    $stmt = $pdo->prepare('UPDATE reviews SET text = :text, author = :author WHERE id = :id');
    $stmt->execute(['text' => $text, 'author' => $author, 'id' => $id]);

    if ($stmt->rowCount() === 0) {
        json_error('Recenze nenalezena.', 404);
    }

    $stmt = $pdo->prepare('SELECT id, text, author, created_at FROM reviews WHERE id = :id');
    $stmt->execute(['id' => $id]);
    json_response($stmt->fetch());
}

function handle_reviews_delete(int $id): void
{
    require_auth();
    $pdo = get_pdo();
    $stmt = $pdo->prepare('DELETE FROM reviews WHERE id = :id');
    $stmt->execute(['id' => $id]);

    if ($stmt->rowCount() === 0) {
        json_error('Recenze nenalezena.', 404);
    }

    json_response(['ok' => true]);
}

function handle_videos_list(): void
{
    global $CONFIG;

    $type = trim((string) ($_GET['type'] ?? 'social'));
    if (!in_array($type, ['social', 'presentation'], true)) {
        json_error('Neplatný typ videa (social / presentation).', 400);
    }

    $videosCfg = $CONFIG['videos'][$type] ?? null;
    if (!is_array($videosCfg)) {
        json_response([]);
    }

    $dir = rtrim((string) ($videosCfg['dir'] ?? ''), DIRECTORY_SEPARATOR);
    $urlPrefix = rtrim((string) ($videosCfg['url_prefix'] ?? ''), '/');
    if ($dir === '' || $urlPrefix === '') {
        json_response([]);
    }

    json_response(list_videos_in_directory($dir, $urlPrefix));
}

function list_videos_in_directory(string $dir, string $urlPrefix): array
{
    $allowed = ['mp4', 'webm', 'mov', 'm4v'];

    if (!is_dir($dir)) {
        return [];
    }

    $files = [];
    foreach (scandir($dir) ?: [] as $filename) {
        if ($filename === '.' || $filename === '..') {
            continue;
        }

        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        if (!in_array($ext, $allowed, true)) {
            continue;
        }

        $path = $dir . DIRECTORY_SEPARATOR . $filename;
        if (!is_file($path)) {
            continue;
        }

        $files[] = [
            'filename' => $filename,
            'url' => $urlPrefix . '/' . rawurlencode($filename),
            'name' => (string) pathinfo($filename, PATHINFO_FILENAME),
        ];
    }

    usort(
        $files,
        static fn (array $a, array $b): int => strnatcasecmp($a['filename'], $b['filename'])
    );

    return array_map(
        static fn (array $file): array => [
            'url' => $file['url'],
            'name' => $file['name'],
            'filename' => $file['filename'],
        ],
        $files
    );
}

function handle_videos_delete(): void
{
    require_auth();

    $type = trim((string) ($_GET['type'] ?? ''));
    if (!in_array($type, ['social', 'presentation'], true)) {
        json_error('Neplatný typ videa (social / presentation).', 400);
    }

    $filename = basename((string) ($_GET['filename'] ?? ''));
    if ($filename === '' || preg_match('/[\/\\\\]/', $filename)) {
        json_error('Neplatný název souboru.', 400);
    }

    $cfg = video_config($type);
    $dir = rtrim((string) ($cfg['dir'] ?? ''), DIRECTORY_SEPARATOR);
    if ($dir === '') {
        json_error('Složka pro videa není nakonfigurována.', 500);
    }

    $path = $dir . DIRECTORY_SEPARATOR . $filename;
    if (!is_file($path)) {
        json_error('Video nenalezeno.', 404);
    }

    if (!@unlink($path)) {
        json_error('Smazání souboru se nezdařilo.', 500);
    }

    json_response(['ok' => true]);
}

function handle_upload(): void
{
    require_auth();

    $bucket = trim((string) ($_POST['bucket'] ?? $_GET['bucket'] ?? 'properties'));
    if (in_array($bucket, ['social', 'presentation'], true)) {
        handle_video_upload($bucket);
        return;
    }

    if (!in_array($bucket, ['properties', 'projects'], true)) {
        json_error('Neplatný typ uploadu (properties / projects / social / presentation).');
    }

    $cfg = upload_config($bucket);

    if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
        json_error('Nebyl nahrán žádný soubor.');
    }

    $file = $_FILES['file'];
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        json_error(upload_error_message((int) ($file['error'] ?? UPLOAD_ERR_NO_FILE)));
    }

    $maxBytes = (int) ($cfg['max_bytes'] ?? 5 * 1024 * 1024);
    if (($file['size'] ?? 0) > $maxBytes) {
        json_error('Soubor je příliš velký (max. ' . format_bytes($maxBytes) . ').');
    }

    $allowed = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']) ?: '';
    if (!isset($allowed[$mime])) {
        json_error('Povolené formáty: JPEG, PNG, WebP, GIF.');
    }

    $uploadDir = rtrim((string) $cfg['dir'], DIRECTORY_SEPARATOR);
    if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
        json_error('Nelze vytvořit složku pro upload.', 500);
    }

    $filename = time() . '-' . bin2hex(random_bytes(4)) . '.' . $allowed[$mime];
    $target = $uploadDir . DIRECTORY_SEPARATOR . $filename;

    if (!move_uploaded_file($file['tmp_name'], $target)) {
        json_error('Uložení souboru se nezdařilo.', 500);
    }

    $urlPrefix = rtrim((string) ($cfg['url_prefix'] ?? '/uploads/' . $bucket), '/');
    json_response(['url' => $urlPrefix . '/' . $filename]);
}

function handle_video_upload(string $type): void
{
    $cfg = video_config($type);

    if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
        json_error('Nebyl nahrán žádný soubor.');
    }

    $file = $_FILES['file'];
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        json_error(upload_error_message((int) ($file['error'] ?? UPLOAD_ERR_NO_FILE)));
    }

    $maxBytes = (int) ($cfg['max_bytes'] ?? 100 * 1024 * 1024);
    if (($file['size'] ?? 0) > $maxBytes) {
        json_error('Video je příliš velké (max. ' . format_bytes($maxBytes) . ').');
    }

    $allowed = [
        'video/mp4' => 'mp4',
        'video/webm' => 'webm',
        'video/quicktime' => 'mov',
        'video/x-m4v' => 'm4v',
    ];

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']) ?: '';
    if (!isset($allowed[$mime])) {
        json_error('Povolené formáty: MP4, WebM, MOV, M4V.');
    }

    $uploadDir = rtrim((string) ($cfg['dir'] ?? ''), DIRECTORY_SEPARATOR);
    if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
        json_error('Nelze vytvořit složku pro videa.', 500);
    }

    $filename = time() . '-' . bin2hex(random_bytes(4)) . '.' . $allowed[$mime];
    $target = $uploadDir . DIRECTORY_SEPARATOR . $filename;

    if (!move_uploaded_file($file['tmp_name'], $target)) {
        json_error('Uložení videa se nezdařilo.', 500);
    }

    $urlPrefix = rtrim((string) ($cfg['url_prefix'] ?? ''), '/');
    $url = $urlPrefix . '/' . rawurlencode($filename);

    json_response([
        'url' => $url,
        'name' => (string) pathinfo($filename, PATHINFO_FILENAME),
        'filename' => $filename,
    ], 201);
}
