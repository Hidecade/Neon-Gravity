import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCRjHe893FZopPErdjtgX8KJ8KPT_rmgnI",
    authDomain: "stellar-gravity.firebaseapp.com",
    projectId: "stellar-gravity",
    storageBucket: "stellar-gravity.firebasestorage.app",
    messagingSenderId: "936422140891",
    appId: "1:936422140891:web:d4e55c30507570602515fe",
    measurementId: "G-0FWP5X8T2T"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// config.jsからバージョンを取得 (例: "1.4.5")
const fullVersion = window.GAME_VERSION || "1.0.0";

// ドットで区切って最初の数字(メジャーバージョン)だけを取り出す (例: "1")
const majorVersion = fullVersion.split('.')[0];

// コレクション名にメジャーバージョンを結合 (例: "neon_gravity_scores_v1")
const SCORES_COLLECTION = `neon_gravity_scores_v${majorVersion}`;

// HTML要素の取得
const rankingOverlay = document.getElementById("ranking-overlay");
const rankingBody = document.getElementById("ranking-list-body");
const loadingEl = document.getElementById("loading-ranking");
const tableEl = document.getElementById("ranking-table");
const closeRankingBtn = document.getElementById("close-ranking-btn");

// --- 定数の定義 ---
const RANKING_LIMIT = 20; // ランキングの表示・保持件数

// 閉じた後の動作を保存する変数
let onRankingCloseAction = null;

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// --- ゲーム側から呼び出すための「窓口」オブジェクト ---
window.firebaseOps = {
    isReady: true, // 準備完了フラグ

    // ランキング取得（表示用）
    getRanking: async () => {
        const q = query(collection(db, SCORES_COLLECTION), orderBy("score", "desc"), limit(RANKING_LIMIT));
        return await getDocs(q);
    },
    
    // 旧ランキング取得（表示専用）
    getOldRanking: async () => {
        // 古いコレクション名（neon_gravity_scores）を直接指定して読み込む
        const q = query(collection(db, "neon_gravity_scores"), orderBy("score", "desc"), limit(RANKING_LIMIT));
        return await getDocs(q);
    },

    // 10位以内かどうかの判定用
    checkRankIn: async (currentScore) => {
        const q = query(collection(db, SCORES_COLLECTION), orderBy("score", "desc"), limit(RANKING_LIMIT));
        const snapshot = await getDocs(q);

        // データがRANKING_LIMIT件未満なら無条件でランクイン
        if (snapshot.size < RANKING_LIMIT) return true;

        // 10位（リストの最後）のスコアを取得
        const tenthData = snapshot.docs[snapshot.size - 1].data();
        const tenthScore = tenthData.score;

        // 現在のスコアが10位より大きければランクイン
        return currentScore > tenthScore;
    },

    // 送信 ＆ 11位以下の削除処理
    submitAndCleanup: async (score, stage, name) => {
        // 1. スコアの追加（ここは確実に実行させる）
        await addDoc(collection(db, SCORES_COLLECTION), {
            name: name,
            score: score,
            stage: stage,
            timestamp: serverTimestamp()
        });
    }
};

window.showRanking = async function (onClose = null, isOld = false) {
    if (!rankingOverlay) return;

    // 他のオーバーレイを閉じる
    if (ui.titleOverlay) ui.titleOverlay.style.display = "none";
    if (ui.gameoverOverlay) ui.gameoverOverlay.style.display = "none";
    if (ui.ostOverlay) ui.ostOverlay.style.display = "none";
    if (ui.nameInputArea) ui.nameInputArea.style.display = "none";

    // 初期状態
    rankingOverlay.style.display = "flex";
    rankingOverlay.style.opacity = "0";

    // タイトルと切り替えボタンのテキストを変更
    const titleMain = document.querySelector("#ranking-overlay .overlay-title-main");
    const toggleBtn = document.getElementById("toggle-ranking-btn");
    
    if (titleMain) {
        // 古い方を見ている時はタイトルを変える
        titleMain.innerText = isOld ? "OLD RECORDS" : "TOP COMMANDERS";
    }
    
    if (toggleBtn) {
        // ボタンのテキストを反転させる
        toggleBtn.innerText = isOld ? "CURRENT" : "OLD";
        // ボタンを押したら、現在とは逆（!isOld）のランキングを再読み込みする
        toggleBtn.onclick = () => window.showRanking(onClose, !isOld);
    }

    if (loadingEl) {
        loadingEl.style.display = "block";
        loadingEl.innerText = "CONNECTING...";
    }

    if (tableEl) {
        tableEl.style.display = "none";
    }

    if (rankingBody) {
        rankingBody.innerHTML = "";
    }

    onRankingCloseAction = onClose;

    try {
        const snapshot = isOld 
            ? await window.firebaseOps.getOldRanking() 
            : await window.firebaseOps.getRanking();

        if (rankingBody) {
            if (!snapshot || snapshot.empty) {
                rankingBody.innerHTML = `
                    <tr>
                        <td class="col-rank"></td>
                        <td class="col-name" colspan="3" style="text-align:center;">NO DATA</td>
                    </tr>
                `;
            } else {
                let rank = 1;

                snapshot.forEach(doc => {
                    const data = doc.data();
                    const tr = document.createElement("tr");

                    let rankClass = "";
                    let rankText = "#" + rank;

                    if (rank === 1) {
                        rankClass = "rank-1";
                        rankText = "1ST";
                    } else if (rank === 2) {
                        rankClass = "rank-2";
                        rankText = "2ND";
                    } else if (rank === 3) {
                        rankClass = "rank-3";
                        rankText = "3RD";
                    }

                    const stageVal = data.stage;
                    let stageText = "-";
                    let stageClass = "";

                    if (stageVal === "CLEAR" || stageVal === "ALL") {
                        stageText = "ALL";
                        stageClass = "stage-all-clear";
                    } else if (typeof stageVal === "number" || !isNaN(stageVal)) {
                        stageText = "ST." + stageVal;
                    }

                    tr.innerHTML = `
                        <td class="col-rank ${rankClass}">${rankText}</td>
                        <td class="col-name">${escapeHtml(data.name || "NO NAME")}</td>
                        <td class="col-stage ${stageClass}">${stageText}</td>
                        <td class="col-score">${Number(data.score || 0).toLocaleString()}</td>
                    `;

                    rankingBody.appendChild(tr);
                    rank++;
                });
            }
        }

        if (loadingEl) loadingEl.style.display = "none";
        if (tableEl) tableEl.style.display = "table";

        if (window.refreshMenuButtons) {
            window.refreshMenuButtons();
        }

        // フェードイン開始
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                rankingOverlay.style.opacity = "1";
            });
        });

    } catch (e) {
        console.error("Ranking Error:", e);

        if (loadingEl) {
            loadingEl.style.display = "block";
            loadingEl.innerText = "CONNECTION ERROR";
        }

        if (tableEl) {
            tableEl.style.display = "none";
        }
    }
};

function hideRanking() {
    if (!rankingOverlay) return;

    rankingOverlay.style.opacity = "0";

    setTimeout(() => {
        rankingOverlay.style.display = "none";

        if (typeof onRankingCloseAction === "function") {
            const action = onRankingCloseAction;
            onRankingCloseAction = null;
            action();
        } else {
            if (ui.titleOverlay) ui.titleOverlay.style.display = "flex";
            gameState = "TITLE";
        }

        if (window.refreshMenuButtons) {
            window.refreshMenuButtons();
        }
    }, 300);
}

const btnRanking = document.getElementById("btn-ranking");
if (btnRanking) btnRanking.onclick = () => window.showRanking(null);

if (closeRankingBtn) closeRankingBtn.onclick = hideRanking;

// 初期化完了時、名前の読み込み
const saved = localStorage.getItem("neonGravity_last_name");
const nameInput = document.getElementById("player-name-input");
if (saved && nameInput) nameInput.value = saved;



// 準備完了イベント発火
window.dispatchEvent(new Event('firebase-ready'));