<?php
/**
 * Zkopírujte jako config.local.php a doplňte údaje z Wedos administrace.
 * Soubor config.local.php necommitujte (je v .gitignore).
 */
return [
    'db' => [
        'host' => 'mdXXX.wedos.net',
        'name' => 'dXXXXX',
        'user' => 'wXXXXX',
        'pass' => 'HESLO_Z_WEDOS',
        'charset' => 'utf8mb4',
    ],
    'base_url' => 'https://monikazelena.cz',
    'session_ttl_days' => 7,
    // Volitelný klíč pro jednorázové skripty install.php a setup-admin.php (po použití smažte skripty)
    // 'install_key' => 'vymyslete-silne-tajne-heslo',
    'upload' => [
        'properties' => [
            'dir' => __DIR__ . '/../uploads/properties',
            'url_prefix' => '/uploads/properties',
            'max_bytes' => 5 * 1024 * 1024,
        ],
        'projects' => [
            'dir' => __DIR__ . '/../uploads/projects',
            'url_prefix' => '/uploads/projects',
            'max_bytes' => 5 * 1024 * 1024,
        ],
    ],
    'videos' => [
        'social' => [
            'dir' => __DIR__ . '/../videa',
            'url_prefix' => '/videa',
            'max_bytes' => 100 * 1024 * 1024,
        ],
        'presentation_portrait' => [
            'dir' => __DIR__ . '/../videa-prezentace-na-vysku',
            'url_prefix' => '/videa-prezentace-na-vysku',
            'max_bytes' => 100 * 1024 * 1024,
        ],
        'presentation_landscape' => [
            'dir' => __DIR__ . '/../videa-prezentace',
            'url_prefix' => '/videa-prezentace',
            'max_bytes' => 100 * 1024 * 1024,
        ],
        'presentation' => [
            'dir' => __DIR__ . '/../videa-prezentace',
            'url_prefix' => '/videa-prezentace',
            'max_bytes' => 100 * 1024 * 1024,
        ],
    ],
];
