# SUMLINE v1.4 — GitHub Pagesで遊ぶ

## 最短で公開する

1. 配布ZIPを展開し、中のファイルを自分のGitHubリポジトリのルートへ入れてください。`public/`だけでなく、`.github/`、`scripts/`、`tests/`なども含めます。
2. GitHubの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にします。
3. `main`または`master`へpushしてください。別名の既定ブランチなら`.github/workflows/pages.yml`の`branches`を書き換えます。
4. Actionsの **Publish SUMLINE to GitHub Pages** が成功すると、実行結果にゲームのURLが表示されます。手動実行も可能です。

ゲームの静的ファイルはワークフローが`pages-dist/`へ作成し、そのディレクトリだけを公開します。バックエンドのソース・テスト・設定ファイルをWebサイトの公開ファイルに混ぜません。

`https://ユーザー名.github.io/リポジトリ名/`のようなサブディレクトリと、独自ドメイン直下の両方に対応しています。Worker、サービスワーカー、スキン、シード共有URLも同じ配下を使います。画面のパスを変えるためにソースを書き換える必要はありません。

GitHubアカウントやリポジトリへの登録・実際のPages公開操作は、このZIPだけでは完了しません。公開先のリポジトリで上記設定をしてください。

## Pagesだけで使える機能

通常プレイ、過去盤面の再挑戦、デイリー、サイズ・シード・ロック数指定カスタム、フラグ、スコア、3ライフ、タイマー・RTA、BGM・SE、スキン、端末内の記録保存を利用できます。初回に必要なファイルを読み込んだ後は、対応ブラウザーでオフラインでも練習できます。

GitHub PagesはHTML/CSS/JavaScriptなどの静的ファイルの配信サービスなので、ランキング・大会の共有データを保存するサーバー処理は別に必要です。未設定のときは画面に「共有サーバー未設定」と表示し、設定済みの共有APIにだけ接続します。

## 新しい操作

| 入力 | 結果 |
| --- | --- |
| Shift＋左クリック | フラグ設置／解除 |
| 右クリック | フラグ設置／解除。盤面上だけ標準コンテキストメニューを抑止 |
| Fキー | フォーカス中のマスにフラグ設置／解除 |
| 画面下部のフラグボタン | PCで、通常クリックをフラグ操作に切り替え |
| フラグ付きマスを通常クリック | 選択されない。フラグ解除を案内 |

フラグは対象外と考えたマスへの自分用メモです。正解判定をしないので、正解マスにも付けられます。ライフ・合計・点数は変わりません。初期ロック・確定済み・ミス済みマスには付けられず、停止中・終了後も操作できません。2回クリック式／1回クリック式の両方で利用でき、中断保存にも含まれます。

## ロックマス数

カスタムの「ロックマス数」は空欄なら従来どおり自動です。0も指定でき、その場合はロックなしで一意解の盤面を探します。指定した場合はその個数ちょうどにし、3個以上の未選択正解マスと2個以上の対象外マスを残すため、上限を`行数×列数−5`とします。

同じサイズ・シード・ロック数で同じ盤面になります。共有URLにもロック数が入り、「やり直す」でも維持します。少ないロック数では、一意解を持つ候補が探索上限内に見つからない場合があります。そのときはエラーを表示し、勝手にロック数を増やした問題を出しません。個数を増やす、シードを変える、自動へ戻すことで再試行できます。

通常・デイリー・大会は公平性と安定した生成のため、従来の自動ロックを使います。カスタムから大会作成へ引き継ぐのはサイズとシードで、大会画面にもロック数が自動であることを表示します。

## ランキングと大会共有を使う

`backend/`にCloudflare Workers＋D1用の共有APIを同梱しています。このAPIは専用オンラインIDでプレイヤーを識別し、GitHub Pages版から利用できます。

### 1. APIを配備する

Cloudflareアカウントを用意し、Node.js 24以降で以下を実行します。

```sh
cd backend
npm install
npx wrangler login
npx wrangler d1 create sumline
```

作成結果の`database_id`で`backend/wrangler.jsonc`の`REPLACE_WITH_YOUR_D1_DATABASE_ID`を置換します。`ALLOWED_ORIGINS`はPagesのオリジンに変更します。例は`https://YOUR-USERNAME.github.io`で、リポジトリ名のパスは付けません。複数の許可元はカンマで区切ります。`*`は使いません。

```sh
npm run db:remote
npm run deploy
```

`db:remote`はこのAPI用の新しいDBで行ってください。既存の別アプリのDBを流用しないでください。APIのURLはWranglerが返す実際のURLを使います。

### 2. PagesからAPIへ接続する

GitHubリポジトリの **Settings → Secrets and variables → Actions → Variables** に、リポジトリ変数`SUMLINE_API_BASE`を追加します。値は配備したURLの末尾に`/api/`を付けたものです。

または、ルートの`pages.config.json`を編集します。

```json
{
  "apiBase": "https://YOUR-WORKER.workers.dev/api/",
  "authMode": "guest"
}
```

このURLは公開設定です。APIトークン、Cloudflareの管理キー、DB管理用の秘密鍵をここへ入れる必要はありません。ワークフローを再実行してPagesを更新してください。

### 3. プレイヤーとして使う

ゲームの設定で「オンラインIDを作成・接続」を押すか、ランキング提供をオンにします。大会作成時にも未接続ならIDを作成します。本人用のランダムなトークンをブラウザーに保存し、サーバーにはそのハッシュだけを保存します。ブラウザーや端末を変えたり保存データを消すと別のIDになる方式で、アカウント回復・複数端末ログインは含みません。

ランキング提供は初期状態でオフです。オフラインに移行した挑戦は復帰後も得点を送信しません。カスタム・再挑戦をランキングに加算しません。大会URLを開いた相手は、同じAPI設定のPages版から参加・結果閲覧できます。

サーバーはセッションの本人確認、解答履歴、開催期間、二重提出を検証します。カジュアルなランキング向けで、自動ソルバーを完全に排除する仕組みではありません。

## ローカルで試す

Node.js 24以上を用意し、VSCodeでこのプロジェクトのルートを開いてください。ターミナルで次のコマンドだけで起動できます。フロントエンドの追加パッケージのインストールは不要です。

```sh
npm run dev
```

ブラウザーで`http://localhost:8000/`を開きます。ソースから静的ファイルを生成してから、ローカル専用のHTTPサーバーで配信します。終了はCtrl+C。ポートを変更する場合は`npm run dev -- --port 8001`です。ソース変更後は終了して、同じコマンドで起動し直してください。

```sh
npm test
npm run build:pages
```

`npm test`はゲーム・API・HTTPサーバーのテスト、`npm run build:pages`は公開用ファイルの生成です。生成先は`pages-dist/`。HTMLの直開きではなくHTTPでアクセスしてください。

共有APIは`backend/`内の別プロセスで起動します。

```sh
cd backend
npm install
npm run db:local
npm run dev
```

ローカルAPIを使う場合は`ALLOWED_ORIGINS`へ`http://localhost:8000`を追加し、`pages.config.json`の`apiBase`を実際のローカルAPIの`/api/`URLへ変更します。公開時にはHTTPSのAPI URLと公開用Originへ戻します。

## 確認範囲

自動テストでは通常生成の再現性、一意解、0を含むロック数指定、フラグのライフ／合計不変、サブパスのURL解決、CORS、匿名ID、2ユーザー間の記録共有、提出の本人確認、大会期間、ランキング集計を確認します。GitHubリポジトリおよびCloudflareアカウントへの実配備は利用者の公開先設定後に実施する必要があります。

## 公式資料

- [GitHub Pagesの概要](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [カスタムワークフロー](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [公開元を設定する](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Cloudflare D1の開始手順](https://developers.cloudflare.com/d1/get-started/)
- [D1のマイグレーション](https://developers.cloudflare.com/d1/reference/migrations/)


モバイルでのタップ判定、レスポンシブ表示、実機からのローカル接続は[モバイル対応ガイド](MOBILE.md)を参照してください。


日本語・英語の切り替えと更新方法は[多言語対応ガイド](LANGUAGES.md)を参照してください。
