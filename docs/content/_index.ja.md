---
title: Theme Builder
weight: 10
---

machbase-neo の Web UI のカラーテーマを、ライブプレビューを見ながら自分で作成し、ワンクリックで切り替えられます。組み込みの Dark、またはパッケージに含まれるプリセット **Light**、**Cyberpunk**、**Aemeath**、**Cement 98** のいずれかから始めてください。プリセットはそのまま使うこともできます。パッケージをインストールすると **Settings → Theme** に表示されます。

| Dark | Light |
| --- | --- |
| ![Dark の New タブ]({{< asset "images/newtab-dark.png" >}}) | ![Light の New タブ]({{< asset "images/newtab-light.png" >}}) |
| **Cyberpunk** | **Aemeath** |
| ![Cyberpunk の New タブ]({{< asset "images/newtab-cyberpunk.png" >}}) | ![Aemeath の New タブ]({{< asset "images/newtab-aemeath.png" >}}) |
| **Cement 98** | |
| ![Cement 98 の New タブ]({{< asset "images/newtab-cement98.png" >}}) | |

machbase-neo 8.7.2 以降が必要です。

## 開く

App Store からパッケージをインストールしたあと、**Settings**（左バー下部の歯車アイコン）→ **Theme** → **Open Theme Builder** の順に開きます。PACKAGES 一覧からパッケージを開くこともできます。

{{< shot src="images/settings-menu.png" alt="Theme を強調表示した Settings メニュー" width="230" >}}

{{< shot src="images/theme-dialog.png" alt="Open Theme Builder ボタンのある Theme ダイアログ" width="480" >}}

## テーマを作成する

{{< shot src="images/builder-overview.png" alt="左に設定の手順、右にライブプレビューがある Theme Builder の画面" >}}

1. **Start from** で開始するテーマを選びます。現在使用中のテーマ、Dark、プリセット、自作のテーマから選択できます。プリセット自体は変更されません。何かを変更して保存すると、自分のコピーになります。

   {{< shot src="images/start-from.png" alt="Dark と 4 つのプリセットがある Start from セクション" width="400" >}}

2. **Colors** — まず基本色を決めます。**Frame**（ワークスペースを囲むバー）、**Content**（各タブ内のページ — エディター、結果、New タブ）、**Text**、**Accent**、**Borders**（区切り線と、カード・メニュー・ダイアログ・入力欄の枠線などすべての線）、そして 2 つの状態色 **Hover**（ポインターが乗っている箇所）と **Selection**（選択された行）です。その他の色はすべてこれらに従うため、基本色を決めるだけでテーマが 1 つ完成します。入力中の入力欄や Tab キーで移動したボタンには **Focus outline** 色の輪郭線が描かれ、この色は Accent に従います。

   {{< shot src="images/colors-basics.png" alt="テーマ例の基本色" width="390" >}}

3. 次に、目立たせたい部分を調整します。
   - **基本色の下のグループ** — **Surfaces**（Layer: カード、ダイアログ、メニュー）、**Text**（Sub text、Icons、Text on color）、**Controls**（Scrollbar）、**Signals**（Success、Warning、Error、Info、Neutral のグレーとそれぞれの文字色）があります。1 つ変更すると、その色を使っている画面のすべての部分が追従します。たとえば Hover を変更すると、すべての hover が一度に変わります。
   - **Using it** — 各共通色の下に、その色を使っているものがすべて表示されます。画面の部品（左バー、タブバーと開いているタブ、サイドパネル、コンソール、テーブル、入力欄、ダイアログ、メニュー、ツールチップ）と、その色にそのまま従う共通色（Frame の下の *Section headers*、Content の下の *Drawers*、Accent の下の *Primary button* と *Focus outline*）です。各項目は **Customize** するまでその色に従います。Customize すると他の何によっても変更されなくなり、**Use \<color\>** ボタンを押すと再び従うようになります。たとえば、テーブルの hover だけを他の hover と異なる色にできます。

   {{< shot src="images/using-it.png" alt="Hover の下の Using it で、テーブルの hover だけを Customize した状態" width="383" >}}

   共通色の下には、その色がどこに表示されるかが示されます（*Tab bar · Console…* の形式で、ポインターを合わせると全一覧が表示されます）。部品の行には何に従っているかが示されます。基本色の行には一緒に変わる共通色も表示され（Accent の下の *Moves: Primary button · Focus outline…*）、計算で作られた色にはどこから来たかが表示されます（*from Content*）。**Selection**（選択された行）と success / warning / error / info の色は独立した色のため、Accent や Content を変更してもそのままです。開始したテーマがある部品をその色の濃淡で描いている場合は、行にそのように表示されます（*follows Accent · darker, as Light has it*）。背景色が文字色を変えることはありません。**Content** を明るい色に変更しても **Text** を変更するまで文字色はそのままで、読みにくくなった箇所はプレビュー下のコントラストチェックが知らせます。

   {{< shot src="images/contrast-checks.png" alt="Content を明るくしたあとのコントラストチェック。読みにくくなった文字に LOW が表示されています" >}}

4. **プレビューを確認します。** シーンは 6 つあり、それぞれ Web UI を自分の色で描いたものです。**Workspace**（左バー、タブ、サイドパネル、エディター、結果、コンソール）、**Explorer**（サイドパネルの一覧である DB エクスプローラーとパッケージ、テーブルのページ）、**New tab**（Customize を開いた状態 — Widgets パネルがドロワーです）、**Dialogs**（背景の上のダイアログ、入力欄、ボタン、メニュー、ツールチップ）、**Status**（バッジ、ステータスドット、メッセージ、通知、ログレベル、描画に失敗したタブ、トースト）、**Sign-in** です。各タブには含まれる色の数が表示されます。

   | Workspace | Explorer |
   | --- | --- |
   | {{< shot src="images/scene-work.png" alt="Workspace シーン" >}} | {{< shot src="images/scene-explorer.png" alt="Explorer シーン" >}} |
   | **New tab** | **Dialogs** |
   | {{< shot src="images/scene-newtab.png" alt="New tab シーン" >}} | {{< shot src="images/scene-dialogs.png" alt="Dialogs シーン" >}} |
   | **Status** | **Sign-in** |
   | {{< shot src="images/scene-status.png" alt="Status シーン" >}} | {{< shot src="images/scene-login.png" alt="Sign-in シーン" >}} |

   色の行にポインターを合わせると、その色が使われているシーンが表示されて塗られた部分に輪郭線が描かれ、その色が表示されるすべてのシーンのタブが点灯します。プレビューの任意の部分をクリックすると、その色に移動します。文字が読みにくくなると、プレビュー下のコントラストチェックが警告します。

   {{< shot src="images/preview-outline.png" alt="Accent にポインターを合わせた状態。塗られた部分に輪郭線が描かれ、シーンのタブが点灯しています" >}}

5. **Sign-in page** — **Choose a picture…** ボタンで、サインインボックスの背後に自分の画像を配置できます。プレビューの *Sign-in* タブで確認できます。画像はテーマと一緒に元のまま保存されます（SVG や 10 MB を超えるファイルは、幅最大 1920 px の WebP に変換されます）。**Use the web UI's picture** を押すと画像が取り除かれます。

   {{< shot src="images/sign-in-page.png" alt="Sign-in page セクションと Sign-in シーンに表示された自分の画像" >}}

6. **All tokens** には Web UI のすべての色が一覧表示されており、特定の値を正確に指定したいときに使います。色の行と同様に、ポインターを合わせるとプレビューで塗られる部分に輪郭線が描かれます。**Cursor effect** でポインター効果を追加することもできます（任意）。

   {{< shot src="images/all-tokens.png" alt="accent で絞り込んだ All tokens" width="400" >}}

コードエディター、チャート、ターミナルのライト／ダークの見た目は、Content の色に合わせて自動的に決まります。ライトテーマを作るには、Light プリセットから始めるのが最も手軽です。

## 保存して使う

- **Use this theme** はテーマを保存し、Web UI をすぐにそのテーマに切り替えます。**Undo** で元に戻せます。何も変更していない場合は、開始したテーマ（Dark、プリセット、自分のテーマ）にそのまま切り替え、コピーは保存しません。

  {{< shot src="images/use-this-theme.png" alt="Use this theme を押したあとのメッセージと Undo" width="451" >}}

- **Save** は切り替えずに保存だけを行います。**Save ▾ → Save as new theme** は別のバージョンとしてもう 1 つ保存します。どちらも何かを変更するまで使えません。プリセットをそのまま使う場合、コピーは不要だからです。

  {{< shot src="images/save-menu.png" alt="Save as new theme がある Save メニュー" width="317" >}}

- **Settings → Theme** でいつでも切り替えられます。Dark とプリセットは *Ready to use* に、自分のテーマは *My themes* にあります。各カードにはそのテーマの色が表示され、自分のテーマの **Edit**（鉛筆アイコン）を押すとここで編集できます。

  {{< shot src="images/theme-dialog-my-themes.png" alt="My themes に保存したテーマが使用中の Theme ダイアログ" width="480" >}}

自分のテーマはサーバーではなく**このブラウザー**に保存され、誰がサインインしても同じブラウザーなら同じテーマを使います。サインインページには、このブラウザーで選んだテーマとその画像が表示されます。テーマを別のブラウザーやコンピューターに移すには、**CSS ▾ → Export CSS** で書き出し、移動先で **Import CSS** で読み込んでください。CSS には色だけが含まれるため、サインイン画像は移動先で選び直す必要があります。

{{< shot src="images/css-menu.png" alt="Import CSS と Export CSS がある CSS メニュー" width="404" >}}
