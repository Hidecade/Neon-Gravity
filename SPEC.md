# SPEC.md
## NEON GRAVITY: ORBITAL

- Repository baseline: `main` branch audit on March 16, 2026
- Spec target version: **1.3.15**
- Genre: 全方位ツインスティック・アクションシューティング
- Platform: Web Browser / Mobile Browser / iOS PWA / Gamepad support
- Display orientation: Landscape recommended, PWA standalone supported

---

## 1. 概要

### 1.1 コンセプト
**NEON GRAVITY: ORBITAL** は、重力歪曲空間「ネオン・グリッド」を舞台にした全方位シューティングである。プレイヤーは次元潜行型特務戦闘機 **エメラルド・フェニックス** を操作し、宇宙を幾何学的秩序へ変換する機械生命体 **アキシオム** の中枢破壊を目指す。

### 1.2 コア体験
- **ツインスティック戦闘**: 移動と照準を独立して扱う
- **サテライト・システム**: 防御兼ボムの二役を担うリソース管理
- **重力演出**: 爆発・ワームホール・ボムで背景グリッドが歪む
- **高密度アーケード進行**: ステージ制、ボスラッシュ、最終ボスまで一気に駆け抜ける

---

## 2. モード構成

### 2.1 タイトルメニュー
タイトル画面から以下へ遷移できる。
- START GAME
- HOW TO PLAY
- WORLD RANKING
- SOUNDTRACK
- ARCHIVE (STORY)

### 2.2 メインゲーム
- 全 **10 ステージ** 構成
- ステージごとに敵傾向と演出が変化
- Stage 9 は **BOSS RUSH**
- Stage 10 は **GENESIS-ARK** 戦
- 残機制ではなく **SHIELD 制**
- SHIELD が 0 になると DYING → GAME OVER へ遷移

### 2.3 HOW TO PLAY
- 操作説明画面
- ここから **TRAINING** を開始できる

### 2.4 TRAINING MODE
- 基本操作・武器確認用の練習モード
- タイトル復帰は `START` 系操作で行う

### 2.5 STORY / ARCHIVE
- 世界観テキスト閲覧モード
- 英日併記の縦スクロール形式
- 公式アーカイブ資料として実装

### 2.6 WORLD RANKING
- Firebase を使用したオンラインランキング表示
- ゲームオーバーまたはクリア後にスコア登録導線あり

### 2.7 SOUNDTRACK
- 楽曲鑑賞用オーバーレイ
- BGM をゲーム外から再生できる

---

## 3. 操作仕様

### 3.1 キーボード
- **移動**: `W` `A` `S` `D`
- **照準**: 矢印キー
- **射撃**: 照準入力時に自動射撃 / `Space` / `Z`
- **サテライト発射（Bomb / Launch）**: `X`
- **開始 / 決定**: タイトルでは `Space`
- **デバッグ**:
  - `F3`: Debug overlay 表示切替
  - `F4`: Hitbox 表示切替
  - `F5`: Enemy target line 表示切替
  - `F6`: Spawn point 表示切替

### 3.2 タッチ操作
- 画面左: 仮想スティックで移動
- 画面右: 仮想スティックで照準
- 専用ボタン: `LAUNCH`（サテライト一斉発射）
- 専用ボタン: `PAUSE`

### 3.3 ゲームパッド
- 左スティック: 移動
- 右スティック: 照準
- `A`: 射撃 / 決定
- `B` / `X` / `RB` / `RT`: Bomb
- `START`: ポーズ / 再開 / 画面遷移

### 3.4 フォーカス・システム制御
- タブ非表示・blur 時は自動ポーズ
- 復帰時は BGM 再開を試行
- 初回操作で AudioContext のロック解除を行う

---

## 4. プレイヤー仕様

### 4.1 基本ステータス
- 自機名: **Emerald Phoenix**
- パラメータ:
  - 座標 / 速度 / 向き
  - `shield`
  - `weaponLevel`
  - `invuln`
  - `laserTimer`
  - `satellites[]`

### 4.2 移動
- 360 度自由移動
- 画面内ではなく **worldSize ベースのワールド空間** を移動
- ワールド境界外へは出られない

### 4.3 通常ショット
- 発射間隔:
  - 通常時 `6` フレーム間隔
  - レーザー時 `4` フレーム間隔
- 武器レベルに応じて発射角度パターンが増える
- **最大 Lv7**
- 高レベル時は前方だけでなく後方・側方にも弾を持つ多方向構成

### 4.4 レーザー
- `laserTimer > 0` の間は通常弾の代わりにレーザーを発射
- 貫通型の高威力攻撃

### 4.5 シールド
- ダメージを受けると減少
- 0 以下で撃墜
- 低下時は HUD バーで管理
- 0 時はスロー演出・爆発・SE を伴って DYING 状態へ遷移

### 4.6 無敵
- `invuln` 中は被弾無効
- 一部敵には接触ダメージを与えながら押し返しが発生

---

## 5. サテライト・システム

### 5.1 取得
- 緑クリスタル取得でサテライトを 1 基補充
- サテライトは自機周囲を公転
- 最大数は **12** を前提に爆風半径計算を行う

### 5.2 防御
- 敵との接触判定を持つ
- 雑魚敵は相打ちで撃破
- ボス / ドラゴンにはダメージを与えて消滅

### 5.3 Launch（Bomb）
- 保有サテライトをすべて消費
- 半径は保有数に応じて増加
- 画面可視範囲ベースで最大半径を算出
- 効果:
  - 範囲内雑魚敵を即死
  - ボス級へダメージ
  - 敵弾消去
  - 波紋リング生成
  - 背景グリッド歪曲

---

## 6. アイテム仕様

### 6.1 パワーアップ種別
- `W`: Weapon Level Up
- `L`: Special Laser
- `S`: Shield Recover
- `I`: Invincible
- `Crystal`: Satellite 補充 + スコア加算

### 6.2 ドロップ
- README 記述上、**CUBE** はアイテムキャリア
- 特定敵や編隊からパワーアップが出現する設計

---

## 7. 敵仕様

### 7.1 共通
- 敵は `enemies[]` で管理
- ワームホール出現演出を伴う個体がいる
- ステージ進行に応じて敵速度や圧力が上昇

### 7.2 主な敵タイプ
- **TRIANGLE**
  - 編隊行動
  - リーダー / フォロワー構造あり
- **CUBE**
  - アイテムキャリア
- **TADPOLE**
  - 慣性付き追尾
  - 尾を引く履歴エフェクトあり
- **DRAGON**
  - 多関節ボディ
  - 頭部主導で体節が追従
- **HUNTER**
  - 高速接近 → 停止 → 狙撃 → 離脱
- **PHANTOM**
  - ステルス系
- **ECLIPSE**
  - 重力場 / ブラックホール系の演出を担う要塞級
- **JELLYFISH**
  - 浮遊型
- **ASTEROID**
  - 障害物系
  - 分裂挙動あり
- **BUBBLE**
  - README 上で分裂・反射系障害物として定義
- **SENTINEL / FIGHTER JET**
  - README で定義される追加敵カテゴリ

---

## 8. ボス仕様

### 8.1 共通
- ボスは `boss` または `battleship` 型で管理
- 出現時は `isSpawning` による無敵演出あり
- 被弾時は `flashTimer` で点滅
- `aliveTimer` により時間経過ベースの強化を行う

### 8.2 Anger Mode
- 一部ボスは **30 秒経過後** から怒り補正を開始
- 移動速度・圧力が段階的に上昇
- 雑魚 / 召喚体にも怒り倍率が波及する設計あり

### 8.3 Meltdown
- `aliveTimer > 7200`（約 120 秒）で **メルトダウン / 暴走自爆** 系シーケンスへ移行する仕様を持つ

### 8.4 Stage 9: Boss Rush
- 既存ボスの連戦ステージ
- `rushBossIndex` で進行管理

### 8.5 Stage 10: Genesis-Ark
- 最終ボス
- README 上では巨大戦艦・演算コアとして描写
- 高火力、多方向攻撃、増援召喚を伴う最終決戦

---

## 9. ステージ構成

| Stage | Name | Theme / Note |
|---|---|---|
| 1 | NEON PERIMETER | 基本操作導入 |
| 2 | SILICON SWARM | 群体処理 |
| 3 | ELECTRON OCEAN | 浮遊障害物 |
| 4 | PHANTOM SECTOR | 不可視系対応 |
| 5 | HUNTER'S GROUND | 高速狙撃戦 |
| 6 | ASTEROID BELT | 分裂障害物処理 |
| 7 | ORBITAL ECLIPSE | 重力系圧力 |
| 8 | VOID ARCHIVE | 総力戦 |
| 9 | EVENT HORIZON | Boss Rush |
| 10 | GENESIS ARK | Final Boss |

---

## 10. UI / UX 仕様

### 10.1 HUD
- SCORE
- STAGE
- WEAPON 表示
- SHIELD バー
- ENEMY / BOSS バー
- MINIMAP
- FPS 表示（簡易表示切替あり）

### 10.2 ミニマップ
- ワールド境界を矩形で表示
- ワームホールを点で表示
- プレイヤー / 敵 / ボス等の位置把握用

### 10.3 オーバーレイ
- TITLE
- HOW TO
- STORY
- OST
- PAUSE
- GAME OVER
- RANKING
- NAME INPUT / RESULT

### 10.4 ストーリースキップ
- STAGE_INTRO 中にスキップ可能
- キーボード / ゲームパッド両対応

### 10.5 モバイル最適化
- iOS に対して「ブラウザで開く」「ホーム画面に追加」の案内プロンプトを表示
- PWA 化時はフルスクリーン横画面プレイを前提とする

---

## 11. 描画・演出仕様

### 11.1 描画パイプライン
描画順は概ね以下。
1. Background
2. World bounds
3. Wormholes
4. Enemies
5. Enemy projectiles
6. Player systems
7. Lasers
8. Player bullets
9. Items
10. Visual effects
11. Debug overlay
12. Minimap
13. Score popup

### 11.2 演出
- 爆発パーティクル
- 着弾火花
- 壁ヒットエフェクト
- 波紋リング
- グリッド歪曲
- スローモーション
- タイピング / フェード / 警告演出

### 11.3 背景
- 星
- 星雲
- 星団
- グリッドポイント
- ワームホール

---

## 12. サウンド仕様

### 12.1 構成
- `AudioContext` + HTMLAudioElement 併用
- SE は Web Audio
- BGM は Audio 要素再生

### 12.2 BGM
- タイトル / ステージ / ボス / ラスト / クリア / エンディング / ネーム入力 などを切替
- OST モードでは曲送り再生に対応
- 一部キーはループなし

### 12.3 SE
- 連続再生抑制あり
- ノード管理とフェード停止処理あり
- iOS の suspended / interrupted 状態からの再開に対応

---

## 13. データ保存・外部連携

### 13.1 Firebase
- スコア登録
- ランキング取得
- 登録データ: `name`, `score`, `stage`, `timestamp`

### 13.2 LocalStorage
- 直近プレイヤー名保存
- iOS インストールプロンプトのクローズ状態保存

---

## 14. PWA / 配布仕様

### 14.1 manifest.json
- `display: standalone`
- `orientation: landscape`
- `theme_color: #00ffff`
- ホーム画面追加対応

### 14.2 Service Worker
- キャッシュ名: `neon-gravity-v1.3.15`
- HTML / JS / audio / image を事前キャッシュ
- activate 時に旧キャッシュ削除
- fetch は cache-first

---

## 15. 実装ファイル構成

### 15.1 主要ディレクトリ
- `audio/`
- `css/`
- `img/`
- `js/`

### 15.2 JS モジュール
- `main.js`: グローバル変数、初期化、メインループ、描画統括
- `scene_manager.js`: フロー、開始、終了、画面遷移
- `input_handler.js`: キー / タッチ / パッド / UI バインド
- `control_player.js`: 自機移動、射撃、被弾、サテライト
- `logic_enemy.js`: 雑魚 AI
- `logic_boss.js`: ボス AI / 怒り / メルトダウン
- `logic_projectile.js`: 弾・当たり判定
- `render_*`: 背景 / 敵 / 自機 / 弾 / UI 描画
- `audio.js`: 音声制御
- `firebase_manager.js`: ランキング I/O

---

## 16. ストーリー仕様

アーカイブ本文は英日併記で、少なくとも以下の要素を含む。
- 人類文明と AGI / シンギュラリティ
- 重力制御技術とネオン・グリッドの発生
- アキシオムの思想と宇宙再構築
- エメラルド・フェニックスによる最終反攻

README / STORY 画面の物語設定は、ゲームの世界観資料として実装済みコンテンツ扱いとする。

---

## 17. 更新履歴（整理後）

- **旧 SPEC.md** は `1.3.13` 表記
- **Service Worker** は `1.3.15` キャッシュ名
- **README** は `version1.30` 表記

今後は仕様書側の基準バージョンを **1.3.15** に統一し、README・キャッシュ名・ゲーム内表記の同期を推奨する。

---

## 18. 仕様書更新メモ

### 18.1 今回反映した実装修正点
- タイトルメニュー実装内容を明文化
- HOW TO から TRAINING へ入る導線を反映
- キーボード / タッチ / ゲームパッドの実装入力を反映
- デバッグキーを追記
- サテライトの防御機能と Bomb 半径計算を反映
- Boss Anger / Meltdown を明文化
- iOS / PWA 導線を反映
- AudioContext + HTMLAudio の二層構成を反映
- Firebase の登録項目を明文化
- JS モジュール構成を現行リポジトリに合わせて更新

### 18.2 別途修正推奨
- README / SPEC / キャッシュバージョンの表記統一
- `sw.js` の `./scc/style.css` はパス確認推奨
- `SOUND_SYSTEM_SPEC.md` は現状の `audio.js` 実装に合わせて再作成推奨
