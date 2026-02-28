const CACHE_NAME = 'neon-gravity-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    
    // 画像
    './img/NeonGravity.png',
    './img/NeonGravity.ico',

    // 音楽ファイル (これらをキャッシュしないとオフラインで再生されません)
    './audio/Neon_Gravity_Title.mp3',
    './audio/Neon_Gravity_01.mp3',
    './audio/Neon_Gravity_02.mp3',
    './audio/Neon_Gravity_03.mp3',
    './audio/Neon_Gravity_04.mp3',
    './audio/Neon_Gravity_05.mp3',
    './audio/Neon_Gravity_06.mp3',
    './audio/Neon_Gravity_07.mp3',
    './audio/Neon_Gravity_08.mp3',
    './audio/Neon_Gravity_Boss.mp3',
    './audio/Neon_Gravity_Last.mp3',
    './audio/Neon_Gravity_Clear.mp3',
    './audio/Neon_Gravity_All_Clear.mp3',
    './audio/Neon_Gravity_Name.mp3'
];

// インストール処理（ファイルをキャッシュに保存）
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// リクエスト処理（オフラインならキャッシュから返す）
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
