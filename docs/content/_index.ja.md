---
title: Theme Builder 技術ドキュメント
weight: 10
---

Theme Builder パッケージを使うと、Machbase Neo の Web UI のカラーテーマをライブプレビューを見ながら自分で作成し、ワンクリックで切り替えられます。

組み込みの Dark、またはパッケージに含まれるプリセット **Light**、**Cyberpunk**、**Aemeath**、**Cement 98** のいずれかから始めてください。プリセットはそのまま使うこともできます。パッケージをインストールすると **Settings → Theme** に表示されます。

## インストール

Machbase Neo の左バーの App Store には、利用可能なパッケージの一覧が表示されます。  
Theme Builder パッケージ（`neo-pkg-theme-builder`）を選択し、`Install` ボタンを押すとインストールできます。

インストールには少し時間がかかる場合があるため、完了するまでお待ちください。

{{< shot src="images/package-install.png" alt="パッケージ一覧の Theme Builder パッケージ" width="262" >}}

### 要件

- Machbase Neo 8.7.4 以降

### アンインストール

左パネルで `neo-pkg-theme-builder` を選択し、**Uninstall** を押します。プリセットを使用中だった場合、Web UI は Dark に戻ります。自分で作成したテーマはブラウザーにそのまま残り、**Settings → Theme** で削除できます。

## プリセット

| Dark | Light |
| :--- | :--- |
| ![Dark の New タブ](/images/newtab-dark.png) | ![Light の New タブ](/images/newtab-light.png) |
| **Cyberpunk** | **Aemeath** |
| ![Cyberpunk の New タブ](/images/newtab-cyberpunk.png) | ![Aemeath の New タブ](/images/newtab-aemeath.png) |
| **Cement 98** | |
| ![Cement 98 の New タブ](/images/newtab-cement98.png) | |

## このドキュメントで扱う内容

- パッケージのインストール
- Theme Builder の開き方と開始するテーマの選択
- 基本色の設定と部品ごとの Customize
- プレビューとコントラストチェックによる確認
- カーソル効果、サインイン画像、個別のトークン
- テーマの保存と切り替え、別のブラウザーへの移動

## 基本的な作業手順

1. App Store から Theme Builder パッケージをインストールします。
2. **Settings → Theme → Open Theme Builder** を開きます。
3. **Start from** でテーマを選び、自分のテーマに名前を付けます。
4. **Colors** で基本色を決めます。
5. **Using it** で、変えたい部品を Customize します。
6. プレビューの各シーンと、その下のコントラストチェックを確認します。
7. **Use this theme** を押してテーマを保存し、切り替えます。

## 画面構成

- 上部バー
  - テーマ名
  - CSS（Import CSS、Export CSS）
  - Save と Save as new theme
  - Use this theme
- 左パネル
  - Start from
  - Colors
  - Cursor effect
  - Sign-in page
  - All tokens
- 右側
  - シーンのタブ
  - プレビュー
  - コントラストチェック

![Theme Builder の画面](/images/builder-overview.png)

## ドキュメント一覧

| ドキュメント | 内容 |
| :--- | :--- |
| [はじめに]({{< relref "getting-started" >}}) | **初めての方はここから** — Theme Builder を開く・開始するテーマの選択・テーマ名の設定 |
| [色の設定]({{< relref "colors" >}}) | 基本色・色のグループ・部品だけの Customize・ライトとダーク |
| [プレビュー]({{< relref "preview" >}}) | 6 つのシーン・色が塗る箇所の確認・コントラストチェック |
| [カーソル・サインインページ・トークン]({{< relref "cursor-sign-in-and-tokens" >}}) | カーソル効果・サインイン画像・すべてのトークン |
| [保存と使用]({{< relref "save-and-use" >}}) | Use this theme・Save・テーマの切り替え・別のブラウザーへの移動 |
| [リリースノート]({{< relref "release-notes" >}}) | バージョンごとの変更点 |

## ページ移動

- [次へ：はじめに]({{< relref "getting-started" >}})
