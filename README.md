# Todoroki

今、着手可能な Todo が一目でわかる ToDo アプリです。  
ブラウザ（ IndexedDB, LocalStorage ）にデータが保存されるため、ネットワーク通信は発生しません。  

## よくある Todo アプリとの違い

着手可能なタスク（ Unlocked ）のみを一覧表示できます。
着手不可能なタスク（ Locked ）は、以下のようなタスクです。

- 着手するために完了しておくべきタスクが未完了
- タスクの着手可能な日時が未来

一覧表示されているタスクは完了期限から近い順にソートしているため、優先的に対応すべきタスクがわかりやすくなっています。
また、現在時刻が期限日時から工数を引いた日時を過ぎているタスクは黄色で表示されるため、遅延しているタスクも一目でわかります。

## 開発手順

```
git clone https://github.com/nimzo6689/unlocked-todo.git

# NPM パッケージのインストール
npm install
# 開発サーバーの起動
npm run dev
```

## テスト

```sh
# 単体テスト
npm run test

# Playwright 用ブラウザのインストール
npm run e2e:install

# E2E テスト
npm run e2e

# E2E テスト(UI モード)
npm run e2e:ui
```

Playwright の E2E は Chromium を対象にしています。実行時は E2E 専用の Vite モードで起動し、Service Worker を無効化してテストの再現性を優先しています。
