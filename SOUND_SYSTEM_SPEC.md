# NEON GRAVITY - BGM再生仕様書 & カスタム実装ガイド

このドキュメントは、ゲーム内のBGM切り替えロジックの現状分析と、特定のステージ（Stage 6）における演出変更のガイドラインです。

## 1. BGM再生ロジック一覧（現状仕様）

現在のコードにおけるBGMの切り替えタイミングは以下の通りです。

| シーン / イベント | 再生されるBGM (Key) | タイミング詳細 | 備考 |
| :--- | :--- | :--- | :--- |
| **タイトル画面** | `title` | `returnToTitle()` 実行時 | 起動時はユーザー操作後に再生開始 |
| **通常ステージ (1-8)** | `stage[0-7]` | `startStage()` 内 | `(stage - 1) % 8` で算出 |
| **ボスラッシュ (9)** | `boss` | `startStage()` 内 | Stage 9判定時に即座に切り替え |
| **ラスボス (10)** | `last` | `startStage()` 内 | Stage 10判定時に即座に切り替え |
| **ステージクリア** | `clear` | `checkStageClear()` | クリアフラグが立った瞬間に再生 |
| **エンディング** | `clear` | `destroyEnemy()` | ラスボス（Battleship）撃破時に再生 |
| **ゲームオーバー** | **停止 (無音)** | `showGameOver()` | 名前入力・ランキング表示中はBGMなし |
| **ポーズ中** | **一時停止** | `setPaused(true)` | 再開時にポーズした位置から継続 |

---

## 2. Stage 6 「アステロイド・ステルス」実装ガイド

Stage 6において、アステロイド、Tadpole、Phantomを褐色（#f40）に変更し、カモフラージュ効果を高めるためのコード修正箇所です。

### A. 敵生成時の色変更 (spawnEnemy)
`spawnEnemy` 関数内で、Stage 6 の場合に色プロパティを上書きします。

```javascript
// tadpole の色変更
} else if (type === 'tadpole') {
    enemies.push({
        // ... 他のプロパティ
        color: (stage === 6) ? '#f40' : '#0ff', // Stage 6なら褐色
        // ...
    });

// asteroid の色変更
} else if (type === 'bubble' || type === 'asteroid') {
    enemies.push({
        // ... 他のプロパティ
        color: (type === 'bubble') ? '#0ff' : (stage === 6 ? '#f40' : '#fff'),
        // ...
    });

// phantom の色変更
} else if (type === 'phantom') {
    enemies.push({
        // ... 他のプロパティ
        color: (stage === 6) ? '#f40' : '#0ff',
        // ...
    });
