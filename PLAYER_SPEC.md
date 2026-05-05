# PLAYER_SPEC

## iPhoneタップ操作時の攻撃力調整

### 目的

iPhoneのタップ操作では、物理コントローラーやキーボードに比べて照準の微調整が難しい。
そのため、タップ操作時は通常弾の攻撃性能を少し高め、操作難度の差を補正する。

### 現在の実装

攻撃力調整は `js/config.js` の `BULLET_CONFIG.PLAYER` で管理する。

```js
const BULLET_CONFIG = {
    PLAYER: {
        SPEED: 32.0,
        LIFE: 60,
        BASE_LIFE: 60,
        TOUCH_LIFE: 70,
        POWER: 1.5,
        BASE_POWER: 1.5,
        TOUCH_POWER: 1.8
    }
};
```

通常弾の実ダメージは `js/logic_projectile.js` で計算する。

```js
const powerRatio = Math.max(0, b.life / maxLife);
const damage = basePower * powerRatio;
```

弾の残り寿命が多いほど威力が高く、遠くまで飛んで寿命が減るほど威力が下がる。

### 操作別パラメータ

| 操作状態 | POWER | LIFE | 意味 |
|---|---:|---:|---|
| ゲームパッド接続時 | 1.5 | 60 | 標準攻撃力 |
| ゲームパッド未接続時 | 1.8 | 70 | タッチ操作向け強化 |

現在の判定は「iPhoneかどうか」ではなく、「ゲームパッドが接続されているか」で切り替わる。
そのため、iPhoneタップ操作だけでなく、ゲームパッド未接続のPCキーボード操作でも `TOUCH_POWER` / `TOUCH_LIFE` が使われる。

### 発射間隔

通常弾の発射間隔は `js/control_player.js` で管理する。

```js
const fireInterval = (player.laserTimer > 0 || player.overdriveTimer > 0) ? 4 : 6;
```

通常状態では6フレームごとに発射する。
レーザー中またはオーバードライブ中は4フレームごとに発射する。

タップ操作向け補正は、発射間隔ではなく `POWER` と `LIFE` を上げる形で行う。

### 通常弾の弾数

弾数は `player.weaponLevel` によって変わる。

| WEAPON LEVEL | 発射方向 |
|---:|---|
| 1 | 前方2Way |
| 2 | 前方3Way |
| 3 | 前方3Way + 後方1Way |
| 4 | 前方3Way + 後方2Way |
| 5 | 前方5Way + 後方2Way |
| 6 | 前方5Way + 後方2Way + 横2Way |
| 7 | 前方5Way + 後方2Way + 横2Way |

横方向・後方弾は寿命が短くなる。

```js
const bulletLife = Math.abs(offset) > (Math.PI / 4) ? baseLife * 0.7 : baseLife;
```

タップ操作時は `TOUCH_LIFE` が大きいため、前方弾だけでなく横・後方弾も相対的に届きやすくなる。

### 調整方針

タップ操作時の強化は、以下の範囲で調整する。

| 項目 | 推奨範囲 | 現在値 | 備考 |
|---|---:|---:|---|
| `TOUCH_POWER` | 1.6 - 2.0 | 1.8 | 近距離火力の調整 |
| `TOUCH_LIFE` | 65 - 85 | 70 | 射程と遠距離火力の調整 |
| `BASE_POWER` | 1.5固定 | 1.5 | パッド/標準操作の基準 |
| `BASE_LIFE` | 60固定 | 60 | パッド/標準操作の基準 |

強すぎる場合は、まず `TOUCH_POWER` を下げる。
遠距離で強すぎる場合は、`TOUCH_LIFE` を下げる。
近距離は良いがボス戦で削りすぎる場合は、ボス側のHPではなく `TOUCH_POWER` を微調整する。

### iPhone専用にする場合の仕様案

現在の実装はゲームパッド未接続判定なので、厳密なiPhone専用補正ではない。
iPhoneタップ操作だけに限定したい場合は、次の条件に変更する。

- `currentResolution.key` が `iPhone_P` または `iPhone_L`
- かつゲームパッド未接続

この場合、PCキーボード操作は `BASE_POWER` / `BASE_LIFE` に戻る。

### 影響範囲

対象になる攻撃:

- 通常弾

対象外の攻撃:

- レーザーアイテム中のレーザー
- オーバードライブ中のレーザー
- オーバードライブ中のホーミングレーザー
- サテライト発射
- BOMB

### 現在の結論

iPhoneタップ操作の補正として、通常弾は以下の設定を基準値とする。

```js
BASE_POWER: 1.5
BASE_LIFE: 60
TOUCH_POWER: 1.8
TOUCH_LIFE: 70
```

この設定により、タップ操作時は標準操作より通常弾の近距離火力が1.2倍になり、弾の寿命は約1.17倍になる。
操作の難しさを補うための補正であり、レーザーやBOMBなどの強攻撃は補正しない。
