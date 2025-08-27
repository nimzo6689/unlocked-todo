# Shokubun Todo

今、着手可能な Todo が一目でわかる ToDo アプリです。  
個人のタスク管理を前提にデザインしています。  
ブラウザにデータが保存（LocalStorage）されるため、ネットワーク通信は発生しません。  

## 開発手順

```
git clone https://github.com/nimzo6689/shokubun-todo.git

# NPM パッケージのインストール
npm install
# 開発サーバーの起動
npm run dev
```

## 技術選定

**言語**: TypeScript  
**レンダリング**: React  
**ルーティング**: React Router  
**ステート管理**: Zustand  
**バンドラー**: Vite  
**スタイル**: Tailwind CSS  
**フォーマッター**: prettier  
**Linter**: ESLint  
**Unit Test**: Vitest  
**E2E Test**: Playwright  
**CI/CD**: GitHub Actions  
**ホスティング**: GitHub Pages  
**IDE**: Visual Studio Code  
**Agentic Coding**: GitHub Copilot  

## ロードマップ

**サンキー・ダイアグラムでの視覚化**

- 着手可能期間と工数の比率で色に濃淡を付ける。  
- 依存関係が多いタスクが太く表示される。  
- 横軸は着手可能期間に比例する。  
- 着手可能期間に応じて表示する。  
- 完了済みのタスクはグレーアウトにする。  
- ライブラリは Apache ECharts を使う。  

**予実管理機能**

- Todo に着手した際に、タスク実行時間の計測をし、後で見積もり工数との差やタグごとの割合を表示するページを作る。  
- Completed のタスクを対象に集計する。  
