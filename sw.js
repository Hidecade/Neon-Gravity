importScripts('./js/version.js');

// version.js をキャッシュ名の単一ソースとして使う
const CACHE_NAME = `neon-gravity-v${self.NEON_GRAVITY_VERSION || '1.0.1'}`;

// キャッシュ対象のファイル一覧
const ASSETS_TO_CACHE = [
    './',
    './index.html',

    './css/style.css',
    './css/overlay.css',
    './css/title.css',
    './css/ranking.css',
    './css/controls.css',
    './css/ost.css',
    './css/howto.css',
    './css/story.css',
    './css/settings.css',
    './css/archive.css',

    './js/audio.js',
    './js/config.js',
    './js/version.js',
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
    './js/setting.js',
    './js/story_data.js',
    './js/textures.js',
    './js/utils.js',

    './img/NeonGravity.png',
    './img/NeonGravity.ico',

    './audio/Neon_Gravity_Title.mp3',
    './audio/Neon_Gravity_Clear.mp3',
    './audio/Neon_Gravity_All_Clear.mp3',
    './audio/Neon_Gravity_Boss.mp3',
    './audio/Neon_Gravity_Last.mp3',
    './audio/Neon_Gravity_Story.mp3',
    './audio/Neon_Gravity_Story_C1.mp3',
    './audio/Neon_Gravity_Story_C2.mp3',
    './audio/Neon_Gravity_Story_C3.mp3',
    './audio/Neon_Gravity_Story_C4.mp3',
    './audio/Neon_Gravity_Story_C5.mp3',
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

                    return undefined;
                })
            );
        })
    );

    return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }

    const requestUrl = new URL(event.request.url);
    const isDevHost = requestUrl.hostname === '127.0.0.1' || requestUrl.hostname === 'localhost';
    const isDevToolAsset = requestUrl.pathname.includes('/fiveserver.js');

    if (isDevHost && isDevToolAsset) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                return response;
            }

            return fetch(event.request).catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }

                return new Response('', {
                    status: 504,
                    statusText: 'Gateway Timeout'
                });
            });
        })
    );
});
