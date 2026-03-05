// ★更新するたびに、ここのバージョン番号を書き換えてください（v1 -> v2 -> v3...）
const CACHE_NAME = 'neon-gravity-v1.0.1a';

// キャッシュするファイルのリスト
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './js/config.js',
    './js/audio.js',
    './js/firebase_manager.js',
    './js/main.js',
    './img/NeonGravity.png',
    './img/NeonGravity.ico',
    // 音声ファイルも含める場合はここに追加
    './audio/Neon_Gravity_Title.mp3',
    './audio/Neon_Gravity_Clear.mp3',
    './audio/Neon_Gravity_All_Clear.mp3',
    './audio/Neon_Gravity_Boss.mp3',
    './audio/Neon_Gravity_Last.mp3',
    './audio/Neon_Gravity_Name.mp3',
    // ステージ曲
    './audio/Neon_Gravity_01.mp3',
    './audio/Neon_Gravity_02.mp3',
    './audio/Neon_Gravity_03.mp3',
    './audio/Neon_Gravity_04.mp3',
    './audio/Neon_Gravity_05.mp3',
    './audio/Neon_Gravity_06.mp3',
    './audio/Neon_Gravity_07.mp3',
    './audio/Neon_Gravity_08.mp3'
];

// インストール処理
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching all assets');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    // 待機せずにすぐにアクティブにする
    self.skipWaiting();
});

// アクティベート処理（ここで古いキャッシュを消す！）
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    // 現在のCACHE_NAMEと異なるキー（＝古いバージョンのキャッシュ）は削除
                    if (key !== CACHE_NAME) {
                        console.log('[Service Worker] Removing old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    // すべてのクライアント（タブ）を制御下に置く
    return self.clients.claim();
});

// フェッチ処理（キャッシュがあればそれを使い、なければネットに取りに行く）
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // キャッシュヒットならそれを返す、なければネットワークへ
            return response || fetch(event.request);
        })
    );
});







