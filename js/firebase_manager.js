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
const SCORES_COLLECTION = "neon_gravity_scores";

// HTML要素の取得
const rankingOverlay = document.getElementById("ranking-overlay");
const rankingBody = document.getElementById("ranking-list-body");
const loadingEl = document.getElementById("loading-ranking");
const tableEl = document.getElementById("ranking-table");
const closeRankingBtn = document.getElementById("close-ranking-btn");

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
        const q = query(collection(db, SCORES_COLLECTION), orderBy("score", "desc"), limit(10));
        return await getDocs(q);
    },

    // 10位以内かどうかの判定用
    checkRankIn: async (currentScore) => {
        const q = query(collection(db, SCORES_COLLECTION), orderBy("score", "desc"), limit(10));
        const snapshot = await getDocs(q);

        // データが10件未満なら無条件でランクイン
        if (snapshot.size < 10) return true;

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

// --- ランキング表示関数 (引数 onClose で閉じた後の処理を受け取る) ---
window.showRanking = async function (onClose = null) {
    if (!rankingOverlay) return;

    // 他のオーバーレイを閉じる
    if (ui.titleOverlay) ui.titleOverlay.style.display = "none";
    if (ui.gameoverOverlay) ui.gameoverOverlay.style.display = "none";
    if (ui.ost) ui.ost.style.display = "none";
    if (ui.nameInputArea) ui.nameInputArea.style.display = "none";

    // ランキング表示
    rankingOverlay.style.display = "flex";

    // 初期状態
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

    // 閉じた後のアクション保存
    onRankingCloseAction = onClose;

    try {
        const snapshot = await window.firebaseOps.getRanking();

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

        if (loadingEl) {
            loadingEl.style.display = "none";
        }

        if (tableEl) {
            tableEl.style.display = "table";
        }

        if (window.refreshMenuButtons) {
            window.refreshMenuButtons();
        }

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

// 初期化完了時、名前の読み込み
const saved = localStorage.getItem("neonGravity_last_name");
const nameInput = document.getElementById("player-name-input");
if (saved && nameInput) nameInput.value = saved;

// タイトル画面のランキングボタン（閉じた後は何もしない）
const btnRanking = document.getElementById("btn-ranking");
if (btnRanking) btnRanking.onclick = () => window.showRanking(null);

// CLOSEボタンの動作設定
closeRankingBtn.onclick = () => {
    rankingOverlay.style.display = "none";

    if (typeof onRankingCloseAction === "function") {
        const action = onRankingCloseAction;
        onRankingCloseAction = null;
        action();
    } else {
        if (ui.titleOverlay) ui.titleOverlay.style.display = "flex";
    }
};


// 準備完了イベント発火
window.dispatchEvent(new Event('firebase-ready'));