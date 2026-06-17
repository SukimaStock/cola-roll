# Codea Lite Rakugaki Starter

Codeaで作った「触れるらくがき」を、できるだけ少ない作業でWebへ移植するための最小スターターです。

## 目的

毎回Yakitori Warsのようにフルリメイクするのではなく、Web側にCodea風APIを用意して、AI変換で移植しやすくすることを目指します。

## ファイル構成

```text
index.html
engine/
  codea-lite.js
works/
  impossible-button/
    sketch.js
prompts/
  codea_to_web_conversion.md
```

## 動かし方

まずはそのまま `index.html` をブラウザで開いてください。

ローカルでうまく動かない場合は、VS CodeのLive Serverや、GitHub Pagesに置くと安定します。

## 現在あるCodea風API

- `setup()`
- `draw()`
- `touched(touch)`
- `WIDTH`
- `HEIGHT`
- `DeltaTime`
- `ElapsedTime`
- `vec2()`
- `color()`
- `background()`
- `fill()`
- `noFill()`
- `stroke()`
- `noStroke()`
- `strokeWidth()`
- `rect()`
- `ellipse()`
- `line()`
- `text()`
- `textSize()` / `fontSize()`
- `pushMatrix()`
- `popMatrix()`
- `translate()`
- `rotate()`
- `scale()`
- `clip()`
- `tween()` と主要easing
- `LEFT` / `RIGHT` / `CENTER`
- `resized()`（任意）
- `random()`
- `map()`
- `dist()`
- `lerp()`

## 方針

作品側の `sketch.js` では、できるだけCanvas APIを直接使わないでください。

良い例：

```js
fill(200, 200, 205)
ellipse(x, y, 100)
```

避けたい例：

```js
ctx.beginPath()
ctx.arc(...)
ctx.fill()
```

Canvas APIは `engine/codea-lite.js` の中だけで使います。

## 次にやること

1. 「絶対に押せないボタン」のCodea版に近づける
2. 足りないAPIを `codea-lite.js` に追加する
3. AI変換プロンプトを使って、次の作品を移植する
4. 変換時に毎回つまずいた点をエンジンに吸収する

## コーラすごろく移植に向けて追加した互換機能

- Codea形式の `tween(duration, object, target, easing, callback)`
- `tween.easing.linear / quadIn / quadOut / quadInOut / sineInOut / bounceOut / bounceInOut`
- `clip(x, y, w, h)` と、引数なし `clip()` による解除
- `fontSize()` エイリアス
- `LEFT` / `RIGHT` の文字揃え
- translate / rotate / scale に追従する文字描画
- ブラウザリサイズ時に呼ばれる任意の `resized()`
