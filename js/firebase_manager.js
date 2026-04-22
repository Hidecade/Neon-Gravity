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

const MODE_NORMAL = 'NORMAL';
const MODE_EXTREME = 'EXTREME_TIME_ATTACK';

function normalizeMode(mode) {
    return mode === MODE_EXTREME ? MODE_EXTREME : MODE_NORMAL;
}

function getScoresCollection(mode) {
    const normalized = normalizeMode(mode);
    if (normalized === MODE_EXTREME) {
        return `neon_gravity_scores_v${majorVersion}_xta`;
    }
    return `neon_gravity_scores_v${majorVersion}`;
}

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
let rankingMode = MODE_NORMAL;

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function formatRankingScore(score) {
    return Number(score || 0)
        .toLocaleString()
        .split("")
        .map((char) => {
            if (char === ",") {
                return `<span class="ranking-score-digit ranking-score-comma">${char}</span>`;
            }
            return `<span class="ranking-score-digit">${char}</span>`;
        })
        .join("");
}

// --- ゲーム側から呼び出すための「窓口」オブジェクト ---
window.firebaseOps = {
    isReady: true, // 準備完了フラグ

    // ランキング取得（表示用）
    getRanking: async (mode = MODE_NORMAL) => {
        const targetCollection = getScoresCollection(mode);
        const q = query(collection(db, targetCollection), orderBy("score", "desc"), limit(RANKING_LIMIT));
        return await getDocs(q);
    },
    
    // 10位以内かどうかの判定用
    checkRankIn: async (currentScore, mode = MODE_NORMAL) => {
        const targetCollection = getScoresCollection(mode);
        const q = query(collection(db, targetCollection), orderBy("score", "desc"), limit(RANKING_LIMIT));
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
    submitAndCleanup: async (score, stage, name, mode = MODE_NORMAL, surviveSeconds = 0, isClear = false) => {
        const normalizedMode = normalizeMode(mode);
        const targetCollection = getScoresCollection(normalizedMode);

        // 1. スコアの追加（ここは確実に実行させる）
        await addDoc(collection(db, targetCollection), {
            name: name,
            score: score,
            stage: stage,
            mode: normalizedMode,
            surviveSeconds: surviveSeconds,
            clear: !!isClear,
            timestamp: serverTimestamp()
        });
    }
};

window.showRanking = async function (onClose = null, modeOverride = null) {
    if (!rankingOverlay) return;

    if (modeOverride) {
        rankingMode = normalizeMode(modeOverride);
    }

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
    const modeBtn = document.getElementById("toggle-ranking-mode-btn");
    
    if (titleMain) {
        if (rankingMode === MODE_EXTREME) {
            titleMain.innerText = "TIME ATTACK";
        } else {
            titleMain.innerText = "TOP COMMANDERS";
        }
    }

    if (modeBtn) {
        if (rankingMode === MODE_EXTREME) {
            modeBtn.innerText = "MODE: TIME ATTACK";
        } else {
            modeBtn.innerText = "MODE: NORMAL";
        }
        modeBtn.onclick = () => {
            const nextMode = rankingMode === MODE_EXTREME ? MODE_NORMAL : MODE_EXTREME;
            window.showRanking(onClose, nextMode);
        };
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
        const snapshot = await window.firebaseOps.getRanking(rankingMode);

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
                    } else if (typeof stageVal === 'string' && stageVal.startsWith('TA')) {
                        stageText = stageVal;
                    }

                    if ((data.mode || MODE_NORMAL) === MODE_EXTREME) {
                        const sec = Number(data.surviveSeconds || 0);
                        stageText = `${sec}s`;
                    }

                    tr.innerHTML = `
                        <td class="col-rank ${rankClass}">${rankText}</td>
                        <td class="col-name">${escapeHtml(data.name || "NO NAME")}</td>
                        <td class="col-stage ${stageClass}">${stageText}</td>
                        <td class="col-score ranking-score-cell">${formatRankingScore(data.score)}</td>
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
if (btnRanking) btnRanking.onclick = () => window.showRanking(null, MODE_NORMAL);

if (closeRankingBtn) closeRankingBtn.onclick = hideRanking;

// 初期化完了時、名前の読み込み
const saved = localStorage.getItem("neonGravity_last_name");
const nameInput = document.getElementById("player-name-input");
if (saved && nameInput) nameInput.value = saved;



// 準備完了イベント発火
window.dispatchEvent(new Event('firebase-ready'));
