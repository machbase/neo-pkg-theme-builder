---
title: 保存と使用
weight: 60
---

テーマを保存して切り替え、別のブラウザーに移します。

## Use this theme

**Use this theme** はテーマを保存し、Web UI をすぐにそのテーマに切り替えます。**Undo** で元に戻せます。何も変更していない場合は、開始したテーマ（Dark、プリセット、自分のテーマ）にそのまま切り替え、コピーは保存しません。

{{< shot src="images/use-this-theme.png" alt="Use this theme を押したあとのメッセージと Undo" width="451" >}}

## Save

**Save** は切り替えずに保存だけを行います。**Save ▾ → Save as new theme** は別のバージョンとしてもう 1 つ保存します。どちらも何かを変更するまで使えません。プリセットをそのまま使う場合、コピーは不要だからです。

{{< shot src="images/save-menu.png" alt="Save as new theme がある Save メニュー" width="317" >}}

## テーマの切り替え

**Settings → Theme** でいつでも切り替えられます。Dark とプリセットは *Ready to use* に、自分のテーマは *My themes* にあります。各カードにはそのテーマの色が表示されます。自分のテーマの **Edit**（鉛筆アイコン）を押すと Theme Builder で開き、ごみ箱アイコンを押すと削除されます。

{{< shot src="images/theme-dialog-my-themes.png" alt="My themes に保存したテーマが使用中の Theme ダイアログ" width="480" >}}

## テーマの保存場所

自分のテーマはサーバーではなく**このブラウザー**に保存され、誰がサインインしても同じブラウザーなら同じテーマを使います。サインインページには、このブラウザーで選んだテーマとその画像が表示されます。

テーマを別のブラウザーやコンピューターに移すには、**CSS ▾ → Export CSS** で書き出し、移動先で **Import CSS** で読み込んでください。CSS には色だけが含まれるため、サインイン画像は移動先で選び直す必要があります。

{{< shot src="images/css-menu.png" alt="Import CSS と Export CSS がある CSS メニュー" width="404" >}}

## ページ移動

- [前へ：カーソル・サインインページ・トークン]({{< relref "cursor-sign-in-and-tokens" >}})
- [目次に戻る]({{< relref "/" >}})
- [次へ：リリースノート]({{< relref "release-notes" >}})
