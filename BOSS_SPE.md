# BOSS Specification

Neon Gravity のボス仕様まとめ。実装上の主な参照先は `js/logic_boss.js`, `js/logic_enemy.js`, `js/config.js`, `js/scene_manager.js`。

## 1. ボス種別

### 1.1 通常BOSS

- 内部タイプ: `boss`
- 主なAI: `updateBossAI(e, options = {})`
- 出現ステージ: 通常ステージ終盤、および Stage 9 のボスラッシュ
- 出現演出:
  - `isSpawning = true`
  - `spawnMax = 150`
  - 出現中は位置固定、移動と攻撃なし
  - 出現完了後に `attackPattern = 0`, `aliveTimer = 0`, `orbitDir` を初期化
- HP:
  - 通常出現: `variant.hp + (stage - 1) * 10`
  - Boss Rush: `variant.hp * 1.2`
- 速度:
  - `1.2 * variant.speedFactor * SPEED_SCALE * (1.0 + (stage - 1) * 0.08)`
- 撃破スコア: `30000`
- ドロップ: `shield`

### 1.2 GENESIS-ARK

- 内部タイプ: `battleship`
- 主なAI: `updateBattleshipAI(e)`
- 出現ステージ: Stage 10、および Extreme Time Attack 後半
- 出現位置:
  - Stage 10: ワールド中央
  - 通常の警告経由では `battleship` 指定時に中央出現
- 出現演出:
  - `isSpawning = true`
  - `spawnMax = 240`
  - 出現完了後にボスUIを `GENESIS-ARK` 表示へ更新
- HP: `1000`
- 速度: `variant.speedFactor * SPEED_SCALE`
- 撃破スコア: `100000`
- ドロップ: なし

## 2. BOSS Variants

`BOSS_VARIANTS` は `js/config.js` に定義される。通常BOSSはステージに応じて `(stage - 1) % BOSS_VARIANTS.length` で選ばれる。Stage 9 の Boss Rush では `rushBossIndex` に対応する 8体を順番に使用する。

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

## 3. 通常BOSS AI

### 3.1 基本移動

通常BOSSはプレイヤー周囲を旋回しながら距離を保つ。

- 目標距離:
  - iPhone系解像度: `300`
  - それ以外: `360`
- 許容距離:
  - iPhone系解像度: `85`
  - それ以外: `110`
- 攻撃中は接近と横移動が強く、重力チャージ中は減速する
- 現在の最大速度:
  - Pressure Phase: `e.speed * 7.0 * angerFactor * movementSpeedMult`
  - その他: `e.speed * 5.8 * angerFactor * movementSpeedMult`

### 3.2 ステージ別移動パターン

通常BOSSの移動は `getBossMovementPatternKey(e)` で A-D に分類する。Stage 9 の Boss Rush では現在の `stage = 9` ではなく、出現中ボスの `BOSS_VARIANTS` index から元ステージ相当の A-D を割り当てる。

| Pattern | Stage | Boss | 移動仕様 |
|---|---|---|---|
| A | 1, 5 | TRI-FORTRESS / HEPTA-GATE | 基本は左右移動。自機とのY距離が遠い場合は近づき、近すぎる場合は離れる。適正距離内では左右へ大きめに流れる |
| B | 2, 6 | DIAMOND-CORE / OCTAGON-COMMAND | 自機とのX/Y軸距離を比較する。Y軸距離が大きい場合はX軸を自機へ合わせつつ左右に微揺れし、X軸距離が大きい場合はY軸を合わせて上下に動く |
| C | 3, 7 | PENTA-BASE / NONA-REVEALER | 自機の周囲を一定距離で旋回する。エリア外枠に当たった場合は `orbitDir` を反転して回転方向を変える |
| D | 4, 8 | HEXAGON-NEST / DECA-DECIMATOR | 自機の周囲を旋回しながら、一定間隔で短い突進アタックを行う |

#### A: Horizontal Keeper

- 使用ステージ: Stage 1, Stage 5
- 基本は `orbitDir` 方向へ左右に流れる
- 左右流れに加えて、一定間隔で左右交互に切り替わる逃げ方向加速を足す
- 自機とのY距離で接近/離脱を判断する
- Y距離が遠い場合: 自機へ近づく
- Y距離が近すぎる場合: 自機から離れる
- 適正距離内: Y速度を落とし、左右へ大きめに流れる
- 重力チャージ中はY速度を減衰する

#### B: Axis Matcher

- 使用ステージ: Stage 2, Stage 6
- `abs(player.y - e.y) >= abs(player.x - e.x)` の場合:
  - X座標を自機へ合わせる
  - 一定間隔で左右交互に切り替わる `170` 幅の逃げ位置を足し、自機ショットを避けるように左右へ移動する
  - 同じ逃げ方向に横加速を追加する
  - Y速度は減衰
- X軸距離のほうが大きい場合:
  - Y座標を自機へ合わせる
  - 同じ揺れを使って上下へ微移動する
  - X速度は減衰
- 重力チャージ中はX/Y速度を減衰する

#### C: Orbiter

- 使用ステージ: Stage 3, Stage 7
- 既存の `updateBossCombatMovement` を使用
- 自機から一定距離を保つ
- 近すぎる場合は後退、遠すぎる場合は接近
- 常に接線方向へ加速して周回する
- ワールド境界に当たると `orbitDir` を反転する

#### D: Orbit And Dash

- 使用ステージ: Stage 4, Stage 8
- 通常時はCに近い旋回移動
- Pressure Phase中、クールダウンが切れると `28` フレームの突進アタックを開始する
- 突進後は `150 - 239` フレームのランダムクールダウン
- 突進中は自機方向へ強く加速し、最大速度は `e.speed * 11.0 * angerFactor`
- 突進していない間は通常旋回より少し横移動が強い

#### Stage 9 / Stage 10

- Stage 9 Boss Rush:
  - 1体目から8体目まで、元ステージ相当の A, B, C, D, A, B, C, D を使用
  - 攻撃解禁は `stage = 9` 扱いのため高ステージ攻撃を使用する
  - 1〜4体目相当のボスは重力場を使用しない
- Stage 10 GENESIS-ARK:
  - `updateBattleshipAI` の専用移動
  - 通常BOSSの A-D 移動は使わない

### 3.3 怒り補正

- `aliveTimer > 1800`、約30秒経過で開始
- `angerFactor = 1.0 + min(0.9, (aliveTimer - 1800) * 0.0007)`
- 最大値は `1.9`
- 影響対象:
  - 移動加速度
  - 最大移動速度
  - 回転速度
  - ホーミングレーザー旋回性能
  - 重力吸引力。ただし吸引計算では `min(angerFactor, 1.6)` で上限あり

### 3.4 メルトダウン

- 条件: `aliveTimer > 7200`、約120秒経過
- 通常AIを停止し、暴走自爆シーケンスへ移行
- 挙動:
  - 色を赤へ変更
  - 高速回転
  - その場で振動しながら停止
  - 4フレームごとに16方向へ赤弾を発射
- 終了:
  - `aliveTimer > 7500` で `hp = 0`
  - 大爆発とグリッド歪曲を発生

## 4. 通常BOSS攻撃サイクル

1サイクルは `360` フレーム。`fireTimer` により以下のフェーズを進行する。

| Phase | Frame | 内容 |
|---|---:|---|
| Main Attack | `0 - 139` | 選択中の攻撃パターンを実行 |
| Brake / Gravity | `140 - 299` | 減速、Stage 5以降は重力吸引 |
| Finisher | `300 - 329` | ミサイルまたは衝撃波 |
| Cooldown | `330 - 359` | 次サイクルへ向けたクールダウン |

### 4.1 Pattern 0: Homing Laser

- ステージに応じて複数回発射
  - Stage 1-2: 2回
  - Stage 3-4: 3回
  - Stage 5以降: 3回
- 発射数は `variant.sides` に依存
- 初速: `10.0 * SPEED_SCALE * bulletSpeedMult`
- 目標速度: `25.0 * SPEED_SCALE * bulletSpeedMult`
- 追尾旋回: `0.035 * angerFactor`
- `isBossHomingLaser = true`
- `isLaserMissile = true`

### 4.2 Pattern 1: Aimed 3-Way

- プレイヤー方向へ照準を合わせる
- 20フレームごとに3WAY弾
- 弾速: `22.5 * SPEED_SCALE * bulletSpeedMult`
- 弾寿命: `300`
- 弾色: `#ffaa00`

### 4.3 Pattern 2: Rotating Crossfire

- Stage 6以降から抽選対象
- 逆回転しながら4方向へ発射
- 12フレームごとに発射
- 弾速: `10 * SPEED_SCALE * bulletSpeedMult`
- 弾寿命: `180`
- `isLaserMissile = true`

### 4.4 Gravity

- Stage 5以降で有効
- 頻度は2サイクルに1回
- フレーム `140 - 259` の間に発生
- 吸引範囲: `1700`
- 吸引力: `7.5 * SPEED_SCALE * gameSpeed * min(angerFactor, 1.6)`
- グリッド歪曲と吸引パーティクルを発生

### 4.5 Finisher

- Pattern 0、または Stage 3以下:
  - ホーミングミサイル
  - Stage 6以降では `fireTime + 14` に追加ボレーあり
- Pattern 1 / 2 の高ステージ:
  - 12方向ショックウェーブリング
  - 弾速: `12 * SPEED_SCALE * bulletSpeedMult`
  - 弾寿命: `250`

### 4.6 Pattern抽選

サイクル終了時に `attackPattern` を更新する。

- Stage 1-2: Pattern 0 のみ
- Stage 3-5: Pattern 0 / 1 を 50% ずつ
- Stage 6以降: Pattern 0 / 1 / 2 を約33%ずつ

### 4.7 通常BOSS攻撃SE

| 攻撃 | SE |
|---|---|
| Dパターン突進 | `boss_dash` |
| Homing Laser | `boss_laser` |
| Aimed 3-Way | `boss_3way` |
| Rotating Crossfire | `boss_cross` |
| Gravity | `gravity_boss` |
| Homing Missile Finisher | `boss_homing` |
| Shockwave Ring Finisher | `boss_shockwave` |

## 5. GENESIS-ARK AI

### 5.1 通常状態

- HP 50% 超で通常状態
- プレイヤーをゆっくり追尾
- 攻撃サイクルは `1380` フレーム
- `cycle >= 900 && cycle < 1200` は突進気味の移動へ変化
- 150フレームごとに30%の確率でアステロイドを召喚

### 5.2 Critical状態

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
- 召喚敵は赤色へ変更される

### 5.3 攻撃パターン

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
- 弾速: `24 * SPEED_SCALE * BATTLESHIP_PROJECTILE_SPEED_MULT`
- `BATTLESHIP_PROJECTILE_SPEED_MULT = 1.05`
- 弾寿命: `200`
- `isLaserMissile = true`

#### ファイター展開

- `cycle === 320` と `cycle === 460` で展開
- 展開数: `8`
- タイプ: `fighter`
- HP: `3`
- 速度: `1.0`
- 初速は低速で射出される
- 目標包囲半径: `400`

#### Phantom召喚

- `cycle 600 - 899`
- `cycle % 140 === 0` でワームホール生成
- 0.6秒後に `phantom` を召喚

#### 回転連射

- `cycle 900 - 1199`
- 10フレームごとに8方向弾
- 弾速: `4 * BATTLESHIP_PROJECTILE_SPEED_MULT`
- 弾寿命: `200`
- `isLaserMissile = true`

### 5.4 GENESIS-ARK攻撃SE

| 攻撃 | SE |
|---|---|
| 全方位レーザー | `ark_laser` |
| ファイター展開 | `ark_fighter` |
| Phantom召喚ワームホール | `ark_summon` |
| 回転連射 | `ark_rotary` |
| Critical召喚の実体化 | `launch` |

## 6. Stage 9: Boss Rush

- ステージ名: `EVENT HORIZON`
- 進行管理: `rushBossIndex`
- クリア条件: `rushBossIndex >= 8`
- ボスがいない状態で `rushIntervalTimer > 180` になると次ボス出現
- 出現位置:
  - ワールド中心から半径 `500`
  - `rushBossIndex` に応じた角度で配置
- 出現するボス:
  - `BOSS_VARIANTS[0]` から `BOSS_VARIANTS[7]` までの8体
- ラッシュ補正:
  - HPが `variant.hp * 1.2`
  - `updateBossSpecialAI(e)` を経由するが、現在は `updateBossAI(e)` と同一
  - 1〜4体目相当のボスは重力場なし

### 6.1 Boss Rush雑魚出現

- 出現判定: 60フレームごと
- 1回の出現数: 1体
- ワームホール演出から実体化まで: 400ms
- 画面内の最大雑魚数: 8体まで
- `lightcycle` は最大生存数2体に制限

## 7. UI / 演出

- ボスHPバーは `render_ui.js` でアクティブな `boss` または `battleship` を検索して表示
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
  - 出現地点に歪曲演出
- ボス戦カメラ:
  - 端末種別や縦横向きでは分岐しない
  - プレイヤー中心とボス中心を含む矩形を計算し、ボスの中心点が画面内に入る倍率までズームアウトする
  - 通常BOSSは `55`、GENESIS-ARK は `90` の小さい余白を加えてフィット計算する
  - ズーム下限は `0.48`
  - 出現直後は `cameraLerpTimer` で滑らかに通常カメラからフィットカメラへ遷移する
- 被弾:
  - `flashTimer`
  - `boss_hit` SE
- 撃破:
  - ボス級は即時削除せず `isDying = true`
  - `dyingTimer = 60`
  - 敵弾を消去し、スローモーションと爆発演出を発生

## 8. 調整用定数

`js/logic_boss.js` 側:

- `BOSS_PROJECTILE_SPEED_MULT = 1.15`
- `BOSS_ANGER_MAX_BONUS = 0.9`
- `BATTLESHIP_PROJECTILE_SPEED_MULT = 1.05`

`js/config.js` 側:

- `BULLET_CONFIG.BOSS_LASER.SPEED = 9.0`
- `BULLET_CONFIG.BOSS_LASER.LIFE = 300`
- `BULLET_CONFIG.BOSS_HOMING.SPEED = 10.0`
- `BULLET_CONFIG.BOSS_HOMING.LIFE = 300`
- `ENEMY_HITBOX.BOSS = 45`
- `ENEMY_SCORES.boss = 30000`
- `ENEMY_SCORES.battleship = 100000`

## 9. 調整方針メモ

- 難易度を下げたい場合:
  - `BOSS_PROJECTILE_SPEED_MULT` を下げる
  - `BOSS_ANGER_MAX_BONUS` を下げる
  - Pattern 1 / 2 の発射間隔を長くする
  - Gravity の `maxPullDist` または `pullStrength` を下げる
  - GENESIS-ARK の召喚間隔を長くする
- 難易度を上げたい場合:
  - Pattern 0 の追加ボレー条件を低ステージにも広げる
  - `BATTLESHIP_PROJECTILE_SPEED_MULT` を上げる
  - Boss Rush のHP倍率を上げる
  - Critical状態の召喚間隔を短くする
