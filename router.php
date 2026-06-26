<?php
/**
 * Router pro PHP vestavěný server: php -S localhost:8080 router.php
 */
declare(strict_types=1);

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if (empty($_SERVER['HTTP_AUTHORIZATION'])) {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    foreach ($headers as $name => $value) {
        if (strcasecmp($name, 'Authorization') === 0) {
            $_SERVER['HTTP_AUTHORIZATION'] = $value;
            break;
        }
    }
}

if (str_starts_with($uri, '/api/index.php')) {
    require __DIR__ . '/api/index.php';
    return true;
}

if (preg_match('#^/api/(.+)$#', $uri, $matches)) {
    $_GET['route'] = $matches[1];
    parse_str(parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_QUERY) ?: '', $query);
    unset($query['route']);
    $_GET = array_merge($_GET, $query);
    require __DIR__ . '/api/index.php';
    return true;
}

$file = __DIR__ . rawurldecode($uri);
if ($uri !== '/' && is_file($file)) {
    return false;
}

if (str_ends_with($uri, '/') && is_file(__DIR__ . $uri . 'index.html')) {
    header('Content-Type: text/html; charset=utf-8');
    readfile(__DIR__ . $uri . 'index.html');
    return true;
}

return false;
