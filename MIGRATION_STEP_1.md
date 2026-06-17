# コーラすごろく Web移植 — Step 1

## 今回行ったこと

Codea版の最新コードを、現在のCodea Liteエンジンへ移す前に、必要APIの差分を確認しました。

## 追加済みの互換機能

- `tween()`
- 必要な7種類のeasing
- `clip()`
- `fontSize()`
- `LEFT` / `RIGHT`
- 行列変換に追従する`text()`
- 任意の`resized()`コールバック

## まだ作品コード変換時に行うこと

- Lua table → JavaScript object / array
- `math.*` → `Math.*`
- `table.insert/remove` → `push/splice`
- `pairs/ipairs` → `Object.values` / array iteration
- `#array` → `array.length`
- `tostring()` → `String()`
- `_G` → 通常のJavaScript変数

## 次のStep

`works/cola-roll/sketch.js`を作り、まずは次の範囲だけ移植します。

1. `CONFIG`
2. `INGREDIENTS`
3. `EVENT_DIE`
4. `BOARD_NODES`
5. `gameState`
6. タイトル画面
7. 盤面・王冠・グラスの静的表示

この段階では、まだゲーム進行やTweenを接続しません。まず画面の土台とデータ変換が正しいか確認します。
