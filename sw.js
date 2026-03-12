// ★更新するたびに、ここのバージョン番号を書き換えてください
const CACHE_NAME = 'neon-gravity-v1.3.2'; // バージョンを一つ上げました

// キャッシュするファイルのリスト
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './manifest.json', // PWAに必須
    
    // JSファイル群（画像から全て抽出しました） 📂
    './js/audio.js',
    './js/config.js',
    './js/control_player.js',
    './js/effect_system.js',
    './js/firebase_manager.js',
    './js/input_handler.js',
    './js/logic_boss.js',
    './js/logic_enemy.js',
    './js/logic_projectile.js',
    './js/main.js',
    './js/ost_manager.js',
    './js/render_background.js',
    './js/render_boss.js',
    './js/render_enemy.js',
    './js/render_player.js',
    './js/render_projectile.js',
    './js/render_ui.js',
    './js/scene_manager.js',
    './js/utils.js',

    // 画像・アイコン 🖼️
    './img/NeonGravity.png',
    './img/NeonGravity.ico',

    // 音源ファイル 🎵
    './audio/Neon_Gravity_Title.mp3',
    './audio/Neon_Gravity_Clear.mp3',
    './audio/Neon_Gravity_All_Clear.mp3',
    './audio/Neon_Gravity_Boss.mp3',
    './audio/Neon_Gravity_Last.mp3',
    './audio/Neon_Gravity_Name.mp3',
    './audio/Neon_Gravity_Ending.mp3',
    './audio/Neon_Gravity_01.mp3',
    './audio/Neon_Gravity_02.mp3',
    './audio/Neon_Gravity_03.mp3',
    './audio/Neon_Gravity_04.mp3',
    './audio/Neon_Gravity_05.mp3',
    './audio/Neon_Gravity_06.mp3',
    './audio/Neon_Gravity_07.mp3',
    './audio/Neon_Gravity_08.mp3'
];

// 以下、インストール・アクティベート・フェッチ処理は元のロジックを維持
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching all assets');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[Service Worker] Removing old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
