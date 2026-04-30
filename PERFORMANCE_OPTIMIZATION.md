# Performance Optimization Notes

Last updated: 2026-05-01

このメモは、処理落ち改善のために実施した軽量化内容を整理したものです。
主な方針は、ゲーム内容や見た目を大きく変えずに、毎フレーム発生する余分な走査、GC、Canvas状態保存、AudioNode接続を減らすことです。

## コードから確認できる既存の軽量化

この章は、過去スレッド本文ではなく、現時点のコードとコメントから確認できる既存対策を整理したものです。
過去に実施済みと思われる内容の棚卸しとして扱います。

### 1. 基本エンティティのObjectPool化

対象:

- `js/main.js`
- `js/utils.js`

既に以下の主要エンティティは `ObjectPool` 管理になっています。

- `enemyPool`
- `particlePool`
- `ringPool`
- `enemyBulletPool`
- `playerBulletPool`
- `scorePopupPool`

狙い:

- 弾、敵、パーティクル、リング、スコア表示などの生成破棄を抑える
- GC発生を減らしてフレーム時間のばらつきを抑える

補足:

- 敵オブジェクトには多数のプロパティが事前定義されています。
- これはHidden Classの変化を抑え、実行時にオブジェクト形状が頻繁に変わらないようにする意図があります。

### 2. 画質プリセットによる負荷調整

対象:

- `js/config.js`
- `js/setting.js`
- `js/input_handler.js`

`ULTRA` / `HIGH` / `MEDIUM` / `LOW` の画質プリセットが用意されています。

主な調整項目:

- `gridSpacing`
- `explosionMag`
- `starCount`
- `nebulaeCount`
- `resScale`

狙い:

- 端末性能に応じて描画解像度、星数、星雲数、爆発量を調整する
- モバイル端末や低性能端末での処理落ちを抑える

補足:

- 入力側にも `MEDIUM` / `LOW` 適用処理があり、端末や状況に応じて画質を下げる導線があります。

### 3. 背景描画のキャッシュ化とforループ化

対象:

- `js/render_background.js`
- `js/effect_system.js`
- `js/textures.js`

既存の背景描画では、星雲や星を毎回ベクター描画せず、キャッシュ画像を使う形になっています。

確認できる対策:

- 星雲をオフスクリーンCanvasに生成して `drawImage()` で描画
- 星を `getStarTexture()` で画像キャッシュ化
- 星描画を `forEach` ではなく `for` ループ化
- 画面外に近い星は描画しない

狙い:

- 背景の大量描画でCanvasパス生成やグラデーション生成を繰り返さない
- 毎フレームの背景描画コストを一定に抑える

### 4. テクスチャ生成とキャッシュ管理

対象:

- `js/textures.js`
- `js/render_boss.js`
- `js/render_projectile.js`

ゲーム内の複数の描画要素は、事前生成したCanvasテクスチャを再利用しています。

確認できるキャッシュ:

- アイテムテクスチャ
- 自機弾テクスチャ
- 敵弾テクスチャ
- レーザーミサイルテクスチャ
- 星テクスチャ
- パーティクルテクスチャ
- 小惑星テクスチャ
- ボスフレームテクスチャ

狙い:

- 毎フレームの複雑な図形描画を `drawImage()` に置き換える
- グローや複雑な線画の再計算を避ける

補足:

- 小惑星テクスチャにはキャッシュ上限管理があり、iOSのメモリリーク対策コメントがあります。
- ボスフレームは `OffscreenCanvas` が使える場合はそれを使い、使えない場合は通常Canvasにフォールバックしています。

### 5. グリッド更新の表示範囲限定

対象: `js/effect_system.js`

背景グリッドの更新は、全ワールドではなく現在の表示範囲とバッファ周辺に限定されています。

確認できる対策:

- `camera` と `cameraScale` から表示範囲を計算
- 必要なグリッド点だけ更新
- 静止に近い点は原点へ戻して速度を0にする
- 距離計算では、必要な場合以外は平方根を避ける

狙い:

- グリッド点数が増えても全点更新しない
- 物理っぽい揺れを保ちつつ、不要な計算を避ける

### 6. グリッド歪み・特殊演出の間引き

対象:

- `js/effect_system.js`
- `js/logic_enemy.js`

グリッド歪みや一部の特殊演出は、画質やフレーム数に応じて間引かれています。

確認できる対策:

- `distortGrid()` で `LOW` / `MEDIUM` / `HIGH` に応じて歪み発生を確率的にスキップ
- 一部の敵演出でグリッド歪みを数フレームに1回へ間引き
- パーティクル生成も状況に応じて数フレームに1回へ間引き

狙い:

- 見た目の派手さを残しつつ、重い演出を毎フレーム発生させない

### 7. パーティクル数の画質連動

対象: `js/effect_system.js`

爆発パーティクル数は画質に応じて減るようになっています。

確認できる倍率:

- `LOW`: 少なめ
- `MEDIUM`: 中程度
- `HIGH`: やや多め
- `ULTRA`: 最大寄り

狙い:

- 爆発演出の密度を端末性能に合わせる
- パーティクル更新・描画・生成の負荷をまとめて抑える

### 8. パーティクル描画のスタンプ化

対象:

- `js/effect_system.js`
- `js/textures.js`

通常火花はパーティクルテクスチャを使ったスタンプ描画になっています。

確認できる対策:

- `getParticleTexture()` による画像キャッシュ
- 通常火花は `save/restore` を使わず、`translate` / `rotate` を手動で戻す
- active数が多い場合は線描画の軽量モードへ切り替え
- さらに多い場合は一部フレームで描画を間引く

狙い:

- 大量火花の描画を軽くする
- 状況に応じて見た目よりフレーム安定を優先する

### 9. ワームホール描画のグラデーションキャッシュ

対象: `js/effect_system.js`

ワームホール描画では、放射グラデーションを毎フレーム生成せずキャッシュしています。

確認できる対策:

- `cachedWormholeGrad`
- 初回だけ `createRadialGradient()` を実行
- 以降は同じグラデーションを再利用

狙い:

- CanvasGradientの毎フレーム生成を避ける
- 小さいが継続的なGC/描画準備コストを削減する

### 10. 弾・レーザー判定の平方根削減

対象:

- `js/logic_projectile.js`
- `js/control_player.js`

当たり判定や距離比較で、平方根を避けて距離の2乗を比較する実装が入っています。

確認できる対策:

- `Math.hypot()` の代わりに `dx * dx + dy * dy`
- レーザー長判定で距離の2乗を利用
- 点と直線の距離判定も平方根を使わない形に最適化

狙い:

- 弾数が多い場面の当たり判定を軽くする
- 毎フレーム大量に呼ばれる距離判定のコストを抑える

### 11. 敵更新の画面外/混雑時スロットリング

対象: `js/logic_enemy.js`

敵の更新処理では、画面外や混雑状況に応じた処理間引きが入っています。

確認できる対策:

- `inActiveRange` による処理対象の判定
- `enemyCrowdLevel` に応じて処理頻度を下げる
- 画面外かつ混雑時の敵は数フレームに1回更新
- 分離処理などもフレーム間引き

狙い:

- 画面外や重要度の低い敵に毎フレーム同じ密度の処理をしない
- 敵数が多い場面のCPU負荷を抑える

### 12. ボス描画のフレームレイヤーキャッシュ

対象: `js/render_boss.js`

ボスの複雑なワイヤーフレーム部分は、フレームテクスチャとしてキャッシュされています。

確認できる対策:

- `bossFrameTextureCache`
- `getBossFrameTexture()`
- `createBossFrameCanvas()`
- ボス本体のフレーム部分をキャッシュCanvasに描画

狙い:

- ボスの複雑な線画を毎フレーム全て描き直さない
- ダメージ演出や色レイヤーだけ必要に応じて上乗せする

### 13. UI描画/DOM要素のキャッシュ

対象: `js/render_ui.js`

武器ゲージなどのUI要素は、DOM検索や生成を毎回行わないようキャッシュされています。

確認できる対策:

- `cachedWeaponBlocks`
- `cachedWeaponTimerFrame`
- `cachedWeaponTimerFill`

狙い:

- UI更新時のDOM生成・検索を減らす
- Canvas以外のDOM負荷を抑える

### 14. Web AudioのSE PCMキャッシュ

対象: `js/audio.js`

一部SEは `OfflineAudioContext` で事前レンダリングし、PCMバッファとして再生できる構造になっています。

確認できる対策:

- `prepareSEBuffers()`
- `renderSEBuffer()`
- `playCachedSE()`
- `seBuffers`

狙い:

- 毎回リアルタイムにオシレータ/ノイズ/フィルタを組む負荷を減らす
- よく使うSEをAudioBuffer再生に寄せる

補足:

- `customParam` が必要なSEはリアルタイム生成側を使う設計です。

### 15. BGMバッファキャッシュ

対象: `js/audio.js`

BGMは読み込み・デコード済みバッファをキャッシュしています。

確認できる対策:

- `bgmBuffers`
- `loadBGM()`
- 同一URLなら再デコードしない

狙い:

- BGM切り替え時の再読み込み・再デコードを避ける
- メニューやOST画面での音声操作を安定させる

### 16. Service Workerによるアセットキャッシュ

対象:

- `sw.js`
- `SPEC.md`

Service Workerにより、HTML/JS/audio/imageなどをキャッシュする構成が確認できます。

狙い:

- 再訪問時や画面遷移時のロード負荷を減らす
- ネットワーク待ちによるカクつきや音声/画像ロード遅延を抑える

## 実施済みの対策

### 1. SEエコー処理の削除

対象: `js/audio.js`

SE用の共有エコーバスを削除しました。

削除したもの:

- `SE_ECHO_CONFIG`
- `seEchoInput`
- `seEchoDelay`
- `seEchoFeedback`
- `seEchoWet`
- `setupSEEchoBus()`
- SE出力をエコーバスへ接続する処理

理由:

- 実装は `DelayNode + feedback` で、Convolver系ほど重いものではありませんでした。
- ただし全SEが通常出力に加えてエコーバスへも接続されていたため、ヒット音、爆発音、射撃音が密集する場面ではAudioNodeグラフが増えます。
- フレーム安定を優先するため、音の広がりより負荷削減を優先しました。

効果:

- SE再生ごとの追加接続が減る
- 常時動くDelay/Feedback系ノードを削減
- 低性能端末やモバイルでの音声処理負荷を抑制

### 2. 弾と敵の当たり判定グリッド最適化

対象: `js/logic_projectile.js`

プレイヤー弾、レーザー、敵との当たり判定で使う敵グリッドを最適化しました。

変更内容:

- 弾用の敵グリッドを1フレーム内で使い回すように変更
- `Map` + 文字列キーのグリッドから、固定配列バケット方式へ変更
- クエリ結果配列を毎回生成せず、共通配列を再利用
- `queryProjectileEnemyGrid()` / `queryProjectileEnemyGridRect()` の一時生成を削減

理由:

- 以前は `updatePlayerBullets()` と `updateLasers()` でそれぞれ敵グリッドを構築していました。
- `Map` の文字列キー生成は、弾が多い状況ではGCとハッシュ処理の原因になります。
- 当たり判定は毎フレーム必ず走るため、小さな削減でも効果が積み上がります。

効果:

- 1フレーム中の敵グリッド構築回数を削減
- 文字列キー生成を削減
- クエリ結果配列のGCを削減

### 3. 配列 `filter()` のin-place圧縮化

対象:

- `js/utils.js`
- `js/logic_projectile.js`
- `js/logic_enemy.js`
- `js/scene_manager.js`

寿命切れオブジェクトの削除で使っていた `filter()` を、必要な箇所でin-place圧縮に置き換えました。

追加した主なヘルパー:

- `compactLiveArray(list, predicate)`
- `keepLifePositive(item)`
- `keepWormholeVisible(item)`

置き換えた主な対象:

- `lasers`
- `homingLasers`
- `crystals`
- `powerups`
- `wormholes`

理由:

- `array.filter()` は新しい配列を作るため、毎フレーム使うとGCの原因になります。
- オブジェクトプール化していない配列でも、配列自体を使い回せばGCを減らせます。

効果:

- 寿命切れ整理時の新規配列生成を削減
- フレーム中のGC発生を抑制

### 4. `ObjectPool` の `activeCount` 化

対象:

- `js/utils.js`
- `js/effect_system.js`
- `js/logic_projectile.js`
- `js/logic_enemy.js`
- `js/control_player.js`
- `js/scene_manager.js`

`ObjectPool` に `activeCount` を持たせ、`getActiveCount()` を全走査から即時返却に変更しました。

変更内容:

- `ObjectPool.activeCount` を追加
- `get()` で `activeCount++`
- `release(obj)` を追加し、返却時に `activeCount--`
- `clearAll()` で `activeCount = 0`
- `getActiveCount()` は `return this.activeCount`

置き換えた主な返却処理:

- `particlePool.release(p)`
- `ringPool.release(r)`
- `enemyPool.release(e)`
- `enemyBulletPool.release(eb)`
- `playerBulletPool.release(b)`
- `scorePopupPool.release(s)`

注意:

- `input.move.active` や `wormhole.active` など、ObjectPool管理外の `active` は変更していません。
- プール管理対象だけ `release()` に寄せています。

効果:

- `getActiveCount()` が O(n) から O(1) になる
- デバッグ表示、スポーン判定、描画負荷判定の余分な全走査を削減

### 5. `crystals` の軽いObjectPool化

対象:

- `js/main.js`
- `js/logic_enemy.js`
- `js/logic_projectile.js`
- `js/scene_manager.js`

クリスタルの中身を `crystalPool` から借りる形にしました。
既存の `crystals` 配列は残し、描画やワープ回収処理との互換性を維持しています。

追加したもの:

- `createCrystal()`
- `crystalPool`
- `spawnCrystalObj(options)`

変更内容:

- `crystals.push({ ... })` を `spawnCrystalObj(...)` に変更
- 寿命切れ/回収済みクリスタルを `crystalPool.release()` で返却
- リセット時に `crystalPool.clearAll()` を追加

理由:

- クリスタルは大量ドロップしやすく、生成頻度が高い候補です。
- 構造が単純なので、低リスクでプール化できます。
- `crystals` 配列を残したため、既存の描画・ワープ処理を大きく変えずに済みます。

効果:

- クリスタル生成時のオブジェクト確保を削減
- 大量ドロップ場面のGCを抑制

### 6. パーティクル描画の `getActiveCount()` 二重走査対策

対象: `js/effect_system.js`

パーティクル/リング描画で `getActiveCount()` を呼ばず、`activeCount` を直接参照するようにしました。

変更内容:

- `particlePool.getActiveCount()` を `particlePool.activeCount` に変更
- `ringPool.getActiveCount()` を `ringPool.activeCount` に変更
- active数が0のとき、パーティクル/リングの描画走査をスキップ
- リングの画面内判定で `{ x, y }` の一時オブジェクト生成をやめ、直接座標比較に変更

理由:

- パーティクルプールは大きく、描画前に数えるためだけの走査が重複していました。
- `ObjectPool.activeCount` 化により、カウントは直接参照できます。
- リング判定の一時オブジェクトも、毎フレーム積み上がるGC要因です。

効果:

- 描画前カウントの全走査を削減
- active数0のときの不要なプール走査を回避
- 小さな一時オブジェクト生成を削減

### 7. 敵描画の外側 `save/restore` 削減

対象: `js/render_enemy.js`

`drawEnemies()` の敵1体ごとの外側 `ctx.save()` / `ctx.restore()` を削除しました。

変更内容:

- `enemyPool.pool.forEach(...)` を通常の `for` ループに変更
- 敵1体ごとの外側 `ctx.save()` / `ctx.restore()` を削除
- 外側で必要だった `globalAlpha` だけ手動復元

理由:

- 各敵タイプの描画関数内ですでに `save/restore` しているため、`drawEnemies()` 側の外側ペアはほぼ `globalAlpha` 保護用途でした。
- 敵数が多い場面では、敵1体ごとのCanvas状態スタック操作が積み上がります。
- `forEach` のコールバックも描画ホットパスでは避けた方が安定します。

効果:

- 表示中の敵1体につき外側 `save/restore` 1ペアを削減
- 描画ループのコールバック呼び出しを削減

注意:

- 各敵タイプ内部の `save/restore` はまだ残しています。
- 内部の削減は見た目崩れのリスクが高いため、重い敵タイプを特定してから個別対応する方針です。

### 8. スポーン判定周辺の `filter(...).length` 削減

対象:

- `js/utils.js`
- `js/logic_enemy.js`
- `js/scene_manager.js`

カウント目的だけの `filter(...).length` をループカウントに置き換えました。

追加したもの:

- `countActiveWormholes()`
- `countActiveLightcycles()`

理由:

- `filter()` は新しい配列を作るため、カウント目的では不要なGCが発生します。
- スポーン判定やクリア判定はゲーム中に頻繁に呼ばれます。

効果:

- カウント時の一時配列生成を削減
- スポーン判定の軽量化

## 確認したこと

主に以下の構文チェックを実施しました。

```text
node --check js/audio.js
node --check js/utils.js
node --check js/main.js
node --check js/logic_projectile.js
node --check js/logic_enemy.js
node --check js/effect_system.js
node --check js/render_enemy.js
node --check js/control_player.js
node --check js/scene_manager.js
git diff --check
```

`effect_system.js` で改行コード警告が出る場合がありますが、構文エラーや空白エラーではありません。

## 次に検討する候補

### 1. `homingLasers` のObjectPool化

候補理由:

- `trail` 配列を持つため、生成と破棄のGCが出やすい
- ミサイルが多い場面で効果が出る可能性あり

注意:

- ターゲット、軌跡、寿命、壁衝突など状態がやや複雑
- `trail.length = 0` で配列再利用する設計が必要

### 2. `powerups` のObjectPool化

候補理由:

- 構造は比較的単純
- `crystals` と同じ方針で配列互換を残しながら対応可能

注意:

- 種類ごとの挙動があるため、リセット漏れに注意

### 3. 敵タイプ別の描画最適化

候補理由:

- `render_enemy.js` 内部にはまだ多数の `save/restore`、`forEach`、`Math.sin`、描画状態変更があります。
- 敵が多いステージでは描画負荷が大きい可能性があります。

優先候補:

- 出現数が多い敵タイプ
- 軌跡やパーティクルを持つ敵タイプ
- `lightcycle`
- `jellyfish`
- `sweeper`
- `dragon`

注意:

- 内部の `save/restore` 削減は見た目崩れのリスクがあります。
- 先に重い敵タイプを実測またはデバッグ表示で絞る方が安全です。

### 4. パーティクル描画のさらなる整理

候補理由:

- 通常火花はかなり最適化済みですが、特殊パーティクルは個別 `save/restore` が残っています。
- 大量発生時に特殊パーティクル比率が高い場合は効く可能性があります。

注意:

- 見た目への影響が出やすいため、LOW/MEDIUM時だけ簡略化するなど段階的対応が安全です。

## 現時点の方針まとめ

- 低リスクで効きやすいGC削減はかなり進めました。
- すでに `ObjectPool.activeCount` 化により、カウント系の全走査は大きく減っています。
- 次の大きな改善候補は、未プール配列よりも描画そのものの重い箇所です。
- ただし描画最適化は見た目崩れのリスクがあるため、敵タイプ単位で小さく進めるのが安全です。
