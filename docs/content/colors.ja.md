---
title: 色の設定
weight: 30
---

まず基本色を決め、次に目立たせたい部分を調整します。

## 基本色

- **Frame**：ワークスペースを囲むバー
- **Content**：各タブ内のページ — エディター、結果、New タブ
- **Text**：すべての部分の基本の文字
- **Accent**：アクティブ表示、Primary ボタン、リンク、フォーカスの輪郭線がこの色に従います
- **Borders**：区切り線と、カード・メニュー・ダイアログ・入力欄の枠線などすべての線
- **Hover**：ポインターが乗っている箇所
- **Selection**：選択された行

その他の色はすべてこれらに従うため、基本色を決めるだけでテーマが 1 つ完成します。入力中の入力欄や Tab キーで移動したボタンには **Focus outline** 色の輪郭線が描かれ、この色は Accent に従います。

{{< shot src="images/colors-basics.png" alt="テーマ例の基本色" width="390" >}}

## 色のグループ

基本色の下のグループには、その他の共通色があります。1 つ変更すると、その色を使っている画面のすべての部分が追従します。たとえば Hover を変更すると、すべての hover が一度に変わります。

- **Surfaces**：Layer（カード、ダイアログ、メニュー）
- **Text**：Sub text、Icons、Text on color
- **Controls**：Scrollbar
- **Signals**：Success、Warning、Error、Info、Neutral のグレーとそれぞれの文字色

## 部品だけを Customize する

各共通色の下の **Using it** には、その色を使っているものがすべて表示されます。画面の部品（左バー、タブバーと開いているタブ、サイドパネル、コンソール、テーブル、入力欄、ダイアログ、メニュー、ツールチップ）と、その色にそのまま従う共通色（Frame の下の *Section headers*、Content の下の *Drawers*、Accent の下の *Primary button* と *Focus outline*）です。

各項目は **Customize** するまでその色に従います。Customize すると他の何によっても変更されなくなり、**Use \<color\>** ボタンを押すと再び従うようになります。たとえば、テーブルの hover だけを他の hover と異なる色にできます。

{{< shot src="images/using-it.png" alt="Hover の下の Using it で、テーブルの hover だけを Customize した状態" width="383" >}}

## 色が表示される場所

共通色の下には、その色がどこに表示されるかが示されます（*Tab bar · Console…* の形式で、ポインターを合わせると全一覧が表示されます）。部品の行には何に従っているかが示されます。

- 基本色の行には、一緒に変わる共通色も表示されます（Accent の下の *Moves: Primary button · Focus outline…*）。
- 計算で作られた色には、どこから来たかが表示されます（*from Content*）。
- 開始したテーマがある部品をその色の濃淡で描いている場合は、行にそのように表示されます（*follows Accent · darker, as Light has it*）。

**Selection**（選択された行）と success / warning / error / info の色は独立した色のため、Accent や Content を変更してもそのままです。

## ライトとダーク

コードエディター、チャート、ターミナルのライト／ダークの見た目は、Content の色に合わせて自動的に決まります。ライトテーマを作るには、Light プリセットから始めるのが最も手軽です。

背景色が文字色を変えることはありません。**Content** を明るい色に変更しても **Text** を変更するまで文字色はそのままで、読みにくくなった箇所はプレビュー下のコントラストチェックが知らせます。

## ページ移動

- [前へ：はじめに]({{< relref "getting-started" >}})
- [目次に戻る]({{< relref "/" >}})
- [次へ：プレビュー]({{< relref "preview" >}})
