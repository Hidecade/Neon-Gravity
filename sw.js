const CACHE_NAME = 'neon-gravity-v1';
const ASSETS_TO_CACHE = [
    './',
    './NeonGravity.html',  // ★重要：ここを実際のファイル名にする
    './manifest.json',

    // ▼ ここにアイコン画像のパスを追加してください（imgフォルダの中にある場合）
    // './img/icon-192.png',
    // './img/icon-512.png',

    // ▼ オフラインでも音を鳴らしたい場合は、audioフォルダの中身も記述が必要です
    // './audio/Neon_Gravity_Title.mp3',
    // './audio/Neon_Gravity_01.mp3',
    // ...必要なファイルをすべて列挙...
];

// インストール処理
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// リクエスト処理（キャッシュがあればそれを返す）
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});