# BOSS Specification

Neon Gravity のボス仕様。主な参照実装は `js/logic_boss.js`, `js/logic_enemy.js`, `js/logic_projectile.js`, `js/render_boss.js`, `js/config.js`, `js/scene_manager.js`。

## 1. ボス種別

### 1.1 通常BOSS

- 内部タイプ: `boss`
- AI: `updateBossAI(e, options = {})`
- 出現ステージ: 通常ステージ終盤、および Stage 9 の Boss Rush
- 出現演出:
  - `isSpawning = true`
  - `spawnMax = 150`
  - 出現中は移動と攻撃を停止
  - 出現完了時に `attackPattern = 0`, `aliveTimer = 0`, `orbitDir` を初期化
- HP:
  - 通常出現: `variant.hp + (stage - 1) * 10`
  - Boss Rush: `variant.hp`
- 速度:
  - `1.2 * variant.speedFactor * SPEED_SCALE * (1.0 + (stage - 1) * 0.08)`
- 撃破スコア: `30000`
- ドロップ: `shield`

### 1.2 GENESIS-ARK

- 内部タイプ: `battleship`
- AI: `updateBattleshipAI(e)`
- 出現ステージ: Stage 10、および Extreme Time Attack 後半
- 出現位置:
  - Stage 10: ワールド中央
  - 警告経由の `battleship` 指定時も中央出現
- 出現演出:
  - `isSpawning = true`
  - `spawnMax = 240`
  - 出現完了後にボスUIを `GENESIS-ARK` 表示へ更新
- HP: `1000`
- 速度: `variant.speedFactor * SPEED_SCALE`
- 撃破スコア: `100000`
- ドロップ: なし

## 2. BOSS Variants

`BOSS_VARIANTS` は `js/config.js` に定義される。通常BOSSはステージに応じて `(stage - 1) % BOSS_VARIANTS.length` で選ばれる。Stage 9 の Boss Rush では `rushBossIndex` に対応する 0-7 番の通常BOSSを順番に使用する。`GENESIS-ARK` は通常BOSSのローテーションではなく、`battleship` 専用の最終ボスとして扱う。

| Index | Name | Sides | Color | Base HP | Speed Factor |
|---:|---|---:|---|---:|---:|
| 0 | TRI-FORTRESS | 3 | `#f0f` | 200 | 1.50 |
| 1 | DIAMOND-CORE | 4 | `#ffff00` | 220 | 1.44 |
| 2 | PENTA-BASE | 5 | `#0ff` | 240 | 1.38 |
| 3 | HEXAGON-NEST | 6 | `#0cc` | 260 | 1.33 |
| 4 | HEPTA-GATE | 7 | `#44f` | 280 | 1.29 |
| 5 | OCTAGON-COMMAND | 8 | `#f40` | 300 | 1.25 |
| 6 | NONA-REVEALER | 9 | `#f08` | 320 | 1.22 |
| 7 | DECA-DECIMATOR | 10 | `#fff` | 400 | 1.19 |
| 8 | GENESIS-ARK | 12 | `#00ffff` | 1000 | 1.10 |

## 3. リアクター / コア破壊システム

通常BOSSと GENESIS-ARK は、機体本体HPを直接削るのではなく、外周リアクターを破壊してから中央コアを破壊する。

### 3.1 初期化

- 初期化関数: `initBossReactors(e)`
- リアクター数: `variant.sides`
- 総リアクターHP: `maxHp * 0.75`
- リアクター1基あたりのHP: `(maxHp * 0.75) / variant.sides`
- コアHP: `maxHp * 0.25`
- `e.hp` はリアクター残HPとコア残HPの合算として同期される
- 全リアクターが破壊されるまで `coreExposed = false`

### 3.2 当たり判定

- 通常弾: `hitBossReactorAtPoint(e, x, y, damage)`
- レーザー: `hitBossReactorOnSegment(e, x1, y1, x2, y2, damage)`
- 範囲攻撃: `damageBossReactorsInRadius(e, x, y, radius, damage)`
- コア露出前:
  - 外周リアクターのみダメージを受ける
  - 中央コアへの攻撃は無効
- コア露出後:
  - 中央コアにダメージが通る
  - `coreHp <= 0` で `e.hp = 0` になり撃破演出へ移行

### 3.3 リアクター破壊演出

- 破壊されたリアクターは `destroyed = true`
- 爆発、リング、火花パーティクルを生成
- 破壊後も `updateBossReactorSparks(e)` で継続的に火花とリングを出す
- 全リアクター破壊時に `exposeBossCore(e)` が呼ばれ、中央コアが赤く露出する

### 3.4 レイアウト

- 通常BOSS:
  - `baseRadius = 45`
  - `moduleOffset = 5`
  - `moduleScale = 0.5`
  - `reactor radius = 12`
  - コア半径: `18`
- GENESIS-ARK:
  - `baseRadius = 90`
  - `moduleOffset = 12`
  - `moduleScale = 0.8`
  - `reactor radius = 18`
  - コア半径: `30`

## 4. 通常BOSS AI

### 4.1 基本移動

通常BOSSはプレイヤー周囲を旋回しながら距離を保つ。

- 目標距離:
  - iPhone系解像度: `300`
  - それ以外: `360`
- 許容距離:
  - iPhone系解像度: `85`
  - それ以外: `110`
- 攻撃中は接近と横移動が強くなる
- 重力チャージ中は減速する
- 最大速度:
  - Pressure Phase: `e.speed * 7.0 * angerFactor * movementSpeedMult`
  - 通常: `e.speed * 5.8 * angerFactor * movementSpeedMult`

### 4.2 ステージ別移動パターン

`getBossMovementPatternKey(e)` で A-D に分類する。Stage 9 の Boss Rush では現在の `stage = 9` ではなく、出現中ボスの `BOSS_VARIANTS` index から元ステージ相当の A-D を割り当てる。

| Pattern | Stage | Boss | 移動仕様 |
|---|---|---|---|
| A | 1, 5 | TRI-FORTRESS / HEPTA-GATE | 横方向に流れながら、Y距離を保つ。一定間隔で左右回避方向を切り替える |
| B | 2, 6 | DIAMOND-CORE / OCTAGON-COMMAND | X/Y軸の距離差を見て、遠い軸を合わせつつ横回避する |
| C | 3, 7 | PENTA-BASE / NONA-REVEALER | 既存の旋回移動。プレイヤーから一定距離を保つ |
| D | 4, 8 | HEXAGON-NEST / DECA-DECIMATOR | 旋回移動に加え、Pressure Phase 中に突進する |

### 4.3 Pattern D の突進

- Pressure Phase 中、クールダウンが切れると `28` フレームの突進を開始
- 突進後は `150 - 239` フレームのランダムクールダウン
- 突進中はプレイヤー方向へ強く加速
- 最大速度: `e.speed * 11.0 * angerFactor`
- 開始時SE: `boss_dash`

### 4.4 怒り補正

- 条件: `aliveTimer > 1800`
- `angerFactor = 1.0 + min(0.9, (aliveTimer - 1800) * 0.0007)`
- 最大値: `1.9`
- 影響対象:
  - 移動加速度
  - 最大移動速度
  - 回転速度
  - ホーミングレーザー追尾性能
  - 重力吸引力。ただし重力計算では `min(angerFactor, 1.6)` で上限あり

### 4.5 メルトダウン

- 条件: `aliveTimer > 7200`
- 通常AIを停止し、暴走自爆シーケンスへ移行
- 挙動:
  - 色を赤へ変更
  - 高速回転
  - その場で振動しながら停止
  - 4フレームごとに16方向へ赤弾を発射
- 終了:
  - `aliveTimer > 7500` で `hp = 0`
  - 大爆発とグリッド歪みを発生

## 5. 通常BOSS攻撃サイクル

1サイクルは `360` フレーム。`fireTimer` により以下のフェーズを進行する。

| Phase | Frame | 内容 |
|---|---:|---|
| Main Attack | `0 - 139` | 選択中の攻撃パターンを実行 |
| Brake / Gravity | `140 - 299` | 減速、Stage 5以降は条件付きで重力場 |
| Finisher | `300 - 329` | ホーミングミサイルまたは衝撃波 |
| Cooldown | `330 - 359` | 次サイクルへのクールダウン |

### 5.1 Pattern 0: Homing Laser

- ステージに応じて複数回発射:
  - Stage 1-2: 2回
  - Stage 3以降: 3回
- 発射数: `variant.sides`
- 破壊済みリアクターに対応する角からは発射しない
- 初速: `10.0 * SPEED_SCALE * bulletSpeedMult`
- 目標速度: `25.0 * SPEED_SCALE * bulletSpeedMult`
- 追尾旋回: `0.035 * angerFactor`
- フラグ:
  - `isBossHomingLaser = true`
  - `isLaserMissile = true`
- SE: `boss_laser`

### 5.2 Pattern 1: Aimed 3-Way

- プレイヤー方向へ照準を合わせる
- 20フレームごとに3WAY弾を発射
- 弾速: `22.5 * SPEED_SCALE * bulletSpeedMult`
- 弾寿命: `300`
- 弾色: `#ffaa00`
- SE: `boss_3way`

### 5.3 Pattern 2: Rotating Crossfire

- Stage 6以降から抽選対象
- 逆回転しながら4方向へ発射
- 12フレームごとに発射
- 弾速: `10 * SPEED_SCALE * bulletSpeedMult`
- 弾寿命: `180`
- `isLaserMissile = true`
- SE: `boss_cross`

### 5.4 Gravity

- Stage 5以降で有効
- 2サイクルに1回発生
- フレーム `140 - 259` の間に発生
- Boss Rush では元ステージ相当が 1-4 のボスは重力を使わない
- 吸引範囲: `1700`
- 吸引力: `7.5 * SPEED_SCALE * gameSpeed * min(angerFactor, 1.6)`
- グリッド歪みと吸引パーティクルを発生
- SE: `gravity_boss`

### 5.5 Finisher

- Pattern 0 または Stage 3未満:
  - ホーミングミサイル
  - 破壊済みリアクターに対応する角からは発射しない
  - Stage 6以降では `fireTime`, `fireTime + 14`, `fireTime + 28` の最大3ボレー
  - SE: `boss_homing`
- Pattern 1 / 2 の高ステージ:
  - 12方向ショックウェーブリング
  - 弾速: `12 * SPEED_SCALE * bulletSpeedMult`
  - 弾寿命: `250`
  - SE: `boss_shockwave`

### 5.6 Pattern抽選

サイクル終了時に `attackPattern` を更新する。

- Stage 1-2: Pattern 0 のみ
- Stage 3-5: Pattern 0 / 1 を50%ずつ
- Stage 6以降: Pattern 0 / 1 / 2 を約33%ずつ

### 5.7 コア露出時の追加攻撃

`coreExposed = true` になると `updateBossCoreAttack(e, bulletSpeedMult, angerFactor)` が通常攻撃に追加される。

- コア攻撃タイマー: `coreAttackTimer`
- 中央コア位置から攻撃を発生
- 通常BOSSと GENESIS-ARK の両方で有効
- コア露出後も、コアHPを削り切るまでは通常AIと通常攻撃を継続する

## 6. GENESIS-ARK AI

### 6.1 通常状態

- HP 50% 超で通常状態
- プレイヤーをゆっくり追尾
- 攻撃サイクル: `1380` フレーム
- `cycle >= 900 && cycle < 1200` は突進気味の移動へ変化
- 150フレームごとに30%の確率でアステロイドを召喚

### 6.2 Critical状態

- 条件: `hp / maxHp <= 0.50`
- 表示名: `CRITICAL: EVENT HORIZON`
- 色とUIをマゼンタ系へ変更
- 移動速度を減衰し、その場で高速回転
- 60フレームごとにワームホールを生成し、0.5秒後に敵を召喚
- 召喚候補:
  - `triangle`
  - `tadpole`
  - `dragon`
  - `asteroid`
- 召喚敵は赤色に変更される
- 召喚実体化SE: `launch`

### 6.3 攻撃パターン

GENESIS-ARK の攻撃は `fireTimer % 1380` で管理する。

| Cycle | 内容 |
|---:|---|
| `0 - 299` | 全方位レーザー |
| `300 - 599` | ファイター展開 |
| `600 - 899` | ワームホール + Phantom召喚 |
| `900 - 1199` | 回転連射 |
| `1200 - 1379` | 小休止 |

#### 全方位レーザー

- 60フレームごとに発射
- `variant.sides` 方向へ、各方向3WAY
- 破壊済みリアクターに対応する方向からは発射しない
- 弾速: `24 * SPEED_SCALE * BATTLESHIP_PROJECTILE_SPEED_MULT`
- `BATTLESHIP_PROJECTILE_SPEED_MULT = 1.05`
- 弾寿命: `200`
- `isLaserMissile = true`
- SE: `ark_laser`

#### ファイター展開

- `cycle === 320` と `cycle === 460` で展開
- 展開数: `8`
- タイプ: `fighter`
- HP: `3`
- 速度: `1.0`
- 初速は低速で射出される
- 目標包囲半径: `400`
- SE: `ark_fighter`

#### Phantom召喚

- `cycle 600 - 899`
- `cycle % 140 === 0` でワームホール生成
- 0.6秒後に `phantom` を出現
- SE: `ark_summon`
- 実体化SE: `launch`

#### 回転連射

- `cycle 900 - 1199`
- 10フレームごとに8方向弾
- 8方向をリアクター列へ対応付け、対応リアクターが破壊済みならその方向は発射しない
- 弾速: `4 * BATTLESHIP_PROJECTILE_SPEED_MULT`
- 弾寿命: `200`
- `isLaserMissile = true`
- SE: `ark_rotary`

## 7. Stage 9: Boss Rush

- ステージ名: `EVENT HORIZON`
- 進行管理: `rushBossIndex`
- クリア条件: `rushBossIndex >= 8`
- ボス不在状態で `rushIntervalTimer > 180` になると次ボスを出現
- 出現位置: ワールド中央
- 出現演出:
  - 中央にワームホール
  - `life = 300`, `maxLife = 300`
  - グリッド歪み
- 出現するボス:
  - `BOSS_VARIANTS[0]` から `BOSS_VARIANTS[7]` までの8体
- ラッシュ補正:
  - HPは `variant.hp`
  - `spawnMax = 150`
  - `scale = 1.5 + (variant.sides * 0.1)`
  - リアクターを再初期化
  - AIは `updateBossSpecialAI(e)` 経由だが、実体は `updateBossAI(e)`
  - 1-4体目相当のボスは重力場を使わない

### 7.1 Boss Rush雑魚出現

- 出現判定: 60フレームごと
- 最大同時雑魚数: `8`
- 1回の基本出現数: `1`
- ワームホールから実体化まで: `400ms`
- 雑魚候補は `STAGE_ENEMIES[rushBossIndex + 1]`
- `lightcycle` は抽選補正あり
- `lightcycle` 最大生存数: `2`

## 8. UI / 演出

- ボスHPバーは `render_ui.js` 側でアクティブな `boss` または `battleship` を検索して表示
- 通常BOSS:
  - ラベルは `variant.name`
  - HPバー色は `variant.color`
- GENESIS-ARK:
  - ラベルは `GENESIS-ARK`
  - Critical中は `CRITICAL: EVENT HORIZON`
- 出現警告:
  - `triggerBossEncounter(bossType = 'boss')`
  - `warningTimer = 180`
  - `BOSS APPROACHING` 表示
  - 出現地点に歪み演出
- ボス戦カメラ:
  - 端末種別や画面向きで分岐
  - プレイヤー中心とボス中心を含む矩形を計算し、ボスの大きさぶん余白を加えてフィット
  - 通常BOSSのフィット余白: `55`
  - GENESIS-ARKのフィット余白: `90`
  - 通常BOSSの表示比率目標: 約 `86%`
  - GENESIS-ARKの表示比率目標: 約 `76%`
  - ズーム範囲:
    - 通常BOSS: `0.48 - 1.52`
    - GENESIS-ARK: `0.48 - 1.28`
- 被弾:
  - `flashTimer`
  - `boss_hit` SE
- 撃破:
  - ボス級は即時削除せず `isDying = true`
  - `dyingTimer = 60`
  - 敵弾を全消去
  - Stage 9以外ではスローモーション
  - フェードアウト、誘爆、破片、グリッド歪みを発生

## 9. 描画仕様

### 9.1 通常BOSS

- 描画関数: `drawBossEnemy(ctx, e)`
- 静的フレームと発光色レイヤーを分けて描画
- `bossFrameTextureCache` でフレーム部分をキャッシュ
- 外周リアクターは破壊状態に応じて暗色化
- コア露出前:
  - 多角形のダイヤモンドコア
  - ボス色で発光
- コア露出後:
  - 赤い丸形の露出コア
  - 被弾時は赤系でフラッシュ

### 9.2 GENESIS-ARK

- 描画関数: `drawBattleshipBoss(ctx, e)`
- 通常BOSSより大きい `G_SCALE * 1.5`
- フレームキャッシュキー: `battleship:genesis-ark`
- シアン外殻と深紅リアクターを持つ
- コア露出後は通常BOSS同様に赤い中央コアを描画

## 10. 調整用定数

`js/logic_boss.js` 側:

- `BOSS_PROJECTILE_SPEED_MULT = 1.15`
- `BOSS_ANGER_MAX_BONUS = 0.9`
- `BATTLESHIP_PROJECTILE_SPEED_MULT = 1.05`
- `BOSS_REACTOR_DEAD_COLOR = '#050505'`

`js/config.js` 側:

- `BULLET_CONFIG.BOSS_LASER.SPEED = 9.0`
- `BULLET_CONFIG.BOSS_LASER.LIFE = 300`
- `BULLET_CONFIG.BOSS_HOMING.SPEED = 10.0`
- `BULLET_CONFIG.BOSS_HOMING.LIFE = 300`
- `ENEMY_HITBOX.BOSS = 45`
- `ENEMY_SCORES.boss = 30000`
- `ENEMY_SCORES.battleship = 100000`

## 11. 調整メモ

難易度を下げたい場合:

- `BOSS_PROJECTILE_SPEED_MULT` を下げる
- `BOSS_ANGER_MAX_BONUS` を下げる
- Pattern 1 / 2 の発射間隔を長くする
- Gravity の `maxPullDist` または `pullStrength` を下げる
- GENESIS-ARK の召喚間隔を長くする
- リアクター総HPまたはコアHPの比率を下げる

難易度を上げたい場合:

- Pattern 0 の追加ボレー条件を低ステージにも広げる
- `BATTLESHIP_PROJECTILE_SPEED_MULT` を上げる
- Boss Rush のHP補正を上げる
- Critical状態の召喚間隔を短くする
- コア露出後の `updateBossCoreAttack` を強化する
