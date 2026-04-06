import type { ChangeEvent } from 'react';

type ImportDialogPresenterProps = {
  importText: string;
  onImportTextChange: (text: string) => void;
  onFileSelected: (event: ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
  onImport: () => void;
};

export const ImportDialogPresenter = ({
  importText,
  onImportTextChange,
  onFileSelected,
  onClose,
  onImport,
}: ImportDialogPresenterProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm supports-backdrop-filter:bg-slate-950/35">
    <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-xl mx-4">
      <h2 className="text-lg font-bold text-slate-900 mb-3">インポート</h2>
      <p className="text-sm text-slate-600 mb-4">
        JSONファイルを選択するか、JSONテキストを貼り付けて取り込めます。
      </p>

      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-700 mb-2">ファイルからインポート</p>
        <input
          type="file"
          accept=".json,application/json"
          onChange={onFileSelected}
          className="w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
        />
      </div>

      <div className="border-t border-slate-200 pt-4">
        <p className="text-sm font-semibold text-slate-700 mb-2">テキストからインポート</p>
        <p className="text-xs text-slate-500 mb-2">
          エクスポート済みJSONをそのまま貼り付けてください。
        </p>
        <textarea
          value={importText}
          onChange={e => onImportTextChange(e.target.value)}
          placeholder='[{"id":"...","title":"..."}]'
          className={`w-full border border-slate-300 rounded-md p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${importText ? 'h-56' : 'h-32'}`}
        />
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg text-sm"
          onClick={onClose}
        >
          キャンセル
        </button>
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg text-sm"
          onClick={onImport}
        >
          インポート
        </button>
      </div>
    </div>
  </div>
);

type ExportDialogPresenterProps = {
  exportText: string;
  onFileExport: () => void;
  onTextExport: () => void;
  onCopyText: () => void;
  onClose: () => void;
};

export const ExportDialogPresenter = ({
  exportText,
  onFileExport,
  onTextExport,
  onCopyText,
  onClose,
}: ExportDialogPresenterProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm supports-backdrop-filter:bg-slate-950/35">
    <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-xl mx-4">
      <h2 className="text-lg font-bold text-slate-900 mb-3">エクスポート</h2>
      <p className="text-sm text-slate-600 mb-4">
        出力方法を選択してください。ファイル出力またはテキスト出力が利用できます。
      </p>

      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-700 mb-2">ファイル出力</p>
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg text-sm"
          onClick={onFileExport}
        >
          JSONファイルとして保存
        </button>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <p className="text-sm font-semibold text-slate-700 mb-2">テキスト出力</p>
        <p className="text-xs text-slate-500 mb-2">
          ボタンを押すとJSONテキストを表示します。必要に応じてコピーしてください。
        </p>
        <div className="flex gap-2 mb-2">
          <button
            className="bg-slate-700 hover:bg-slate-800 text-white font-semibold py-2 px-4 rounded-lg text-sm"
            onClick={onTextExport}
          >
            テキストを表示
          </button>
          <button
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg text-sm"
            onClick={onCopyText}
            disabled={!exportText}
          >
            コピー
          </button>
        </div>
        <textarea
          value={exportText}
          readOnly
          placeholder="ここにエクスポート用JSONが表示されます"
          className={`w-full border border-slate-300 rounded-md p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${exportText ? 'h-56' : 'h-32'}`}
        />
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg text-sm"
          onClick={onClose}
        >
          閉じる
        </button>
      </div>
    </div>
  </div>
);
