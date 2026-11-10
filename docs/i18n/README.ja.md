# DSH Sidebar History：DeepSeek Harness の履歴サイドバープラグイン

[English](../../README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [Español](README.es.md)

**DSH Sidebar History** は、DeepSeek Harness のチャット履歴に TODO の進捗と最後に保存された Assistant の返信を表示するプラグインです。会話を一つずつ開かずに、未完了の作業を見つけて再開できます。

MIT ライセンスの独立したプラグインです。DSH の公式 projection API とサイドバーの slot API を使い、上流の DSH ソースコードは変更しません。

## 機能の動画

[![DSH の履歴カードに実際の TODO 進捗と最新の Assistant 返信を表示](../media/live/feature-8s.gif)](../media/live/demo.mp4)

[実 API による動画を見る、9.3 秒](../media/live/demo.mp4) · [実際のブラウザー画像](../media/live/snapshot.png) · [API の実行記録](../media/live/evidence/result.json)

新しい DSH セッションから DeepSeek 公式 API を呼び出して録画しました。モデルはデモ用の注文データを読み、標準 TODO ツールを呼び出し、自分の回答を保存します。サイドバーには 3 件中 2 件の完了と保存済みの返信が表示されます。動画は元の録画データと実際の経過時間を保持しています。mock エンドポイント、台本によるモデルの返信、事前に挿入した Assistant メッセージや TODO イベントは使っていません。別の実 API セッションと再読み込み後の復元も確認済みです。[出所とハッシュ](../media/live/provenance.json)、[メディアの検証結果](../media/live/qa.json)を参照してください。

## 作業を見つけて再開する

- 各カードにタイトル、更新日、タスクの完了数、最大 3 件のタスク、2 行の返信プレビューを表示します。
- 進行中と未着手のタスクを、完了したタスクより先に表示します。
- タイトルとキャッシュ済みの返信を検索できます。DSH 公式の内容検索では、未読み込みの履歴も探せます。
- 上下矢印、Home、End、Enter キーで操作できます。画面内のカードと少量の予備だけを描画します。
- 標準の折りたたみとモバイル用ドロワーを保持します。**Native navigation** で元のワークスペース、アーカイブ、セッション操作に戻ります。**History cards** でカード表示に戻ります。

TODO の状態は `todo/write` イベントだけから取得します。新しい `turn/start` で前のターンのタスクを消去します。プレビューは確定済みの `assistant/message` テキストだけを使います。生成中は **Generating** と表示し、最後に確定した返信を保持します。中断された出力、推論、ツールブロックはプレビューになりません。返信なし、非テキスト、読み込み中、読み込み失敗を区別します。アーカイブ済みセッションは表示しません。

プラグイン UI は現在、DSH の言語設定に従い、英語と簡体字中国語に対応しています。README は上記の 5 言語で利用できます。

## サイドバープラグインをインストールする

Node.js `>=24.9.0` と、インストール済みの DSH Web が必要です。検証済みの対象は DSH `0.2.2-rc.1`、上流 commit `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159` です。宣言した DSH の範囲は `>=0.2.2-rc.1 <0.3.0` です。範囲内の他のバージョンは個別に検証していません。

ローカルの tarball を作成し、`web` profile にインストールします。

```bash
git clone https://github.com/liush2yuxjtu/dsh-sidebar-history.git
cd dsh-sidebar-history
npm pack
dsh plugin --profile web add "$PWD/dsh-sidebar-history-0.1.0.tgz"
```

DSH Web を開くと、アーカイブされていないセッションの履歴カードが表示されます。別の Web profile を使う場合は `web` を置き換えてください。`--profile` は `add` より前に指定します。DSH のプラグインマネージャーからローカル tarball をインストールすることもできます。[上流のインストールガイド](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/docs/user/develop/basic/publish.md)を参照してください。

JavaScript のエントリーファイルは同梱されており、bundler は不要です。実行時の依存関係は DSH が解決します。React を別途追加しないでください。この手順はリポジトリからのインストールであり、npm registry での公開を前提としません。DSH API はまだ安定していないため、更新前に互換性を確認してください。

## テレメトリーとプライバシー

メンテナーは、認可済みの GitHub アクセスを使って `npm run telemetry:collect` を実行できます。リポジトリの閲覧、clone、参照元、Star 数、Release 添付ファイルのダウンロード数を取得し、ローカルに JSON と Markdown のレポートを保存します。利用できないトラフィック API はゼロではなく **BLOCKED** と記録します。

プラグインに追跡用 SDK は導入しません。収集スクリプトはプラグイン利用者に接続せず、会話内容も収集しません。機能のクリック数とユーザー継続率はまだ測定していません。[テレメトリーガイド](../telemetry.md)に、取得できる指標と、利用者の同意に基づくイベント収集の設計案を記載しています。

## 変更を検証する

[AGENTS.md](https://github.com/liush2yuxjtu/dsh-sidebar-history/blob/main/AGENTS.md) と[検証項目](https://github.com/liush2yuxjtu/dsh-sidebar-history/blob/main/.agents/skills/verify/references/surfaces.md)を先に確認してください。固定された依存関係でビルドした上流 checkout、Node.js `>=24.9.0`、Chromium が必要です。

```bash
npm run setup:hooks
npm run verify
DSH_SOURCE_ROOT=/absolute/path/to/built/deepseek-harness npm run verify:browser
npm run verify:live
npm run verify:media
npm run verify:commit
```

後続のコマンドに `DSH_SOURCE_ROOT`、またはローカル Git 設定 `dsh.sourceRoot` を設定します。上流 Playwright で Chromium を利用できない場合は `DSH_CHROMIUM_PATH` を設定します。認可済みの認証情報を `DEEPSEEK_API_KEY`、または非公開の `DSH_PROVIDER_ENV_FILE` で渡してください。認証情報を Git に保存しないでください。

`verify` は単体テストとパッケージ構造を確認します。`verify:browser` は明示された制御用 adapter で回帰テストを実行します。これらだけでは実モデルによる受け入れ検証になりません。`verify:live` は DSH から実 API を呼び出します。Git hook と `verify:commit` はステージされた内容を取り出し、単体、ブラウザー、メディア、実 API の各検証を毎回実行します。アクセスできない場合や assertion に失敗した場合は commit を拒否します。実行記録は Git の対象外である `.runtime/` に保存します。

## プロジェクトのリンク

- [アーキテクチャーと設計判断](https://github.com/liush2yuxjtu/dsh-sidebar-history/blob/main/docs/decisions.md)
- [検証レポート](https://github.com/liush2yuxjtu/dsh-sidebar-history/blob/main/docs/verification.md)
- [公開検索とリポジトリ情報](../discovery.md)
- [設計と受け入れ条件](https://chatgpt.com/space/page_7a28be26236481918ee65d88725c1d38)
- [DeepSeek Harness 上流](https://github.com/deepseek-ai/deepseek-harness)
- [MIT ライセンス](../../LICENSE)

関連するプラグインは GitHub の [`dsh-plugin`](https://github.com/topics/dsh-plugin) と [`dsh-plugins`](https://github.com/topics/dsh-plugins) トピックから探せます。このプロジェクトは DeepSeek の公式製品ではありません。
