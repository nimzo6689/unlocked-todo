import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

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
}: ImportDialogPresenterProps) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm supports-backdrop-filter:bg-slate-950/35">
      <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-xl mx-4">
        <h2 className="text-lg font-bold text-slate-900 mb-3">{t('todo.dialogs.importTitle')}</h2>
        <p className="text-sm text-slate-600 mb-4">{t('todo.dialogs.importDescription')}</p>

        <div className="mb-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">
            {t('todo.dialogs.importFromFile')}
          </p>
          <input
            type="file"
            accept=".json,application/json"
            onChange={onFileSelected}
            className="w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
          />
        </div>

        <div className="border-t border-slate-200 pt-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">
            {t('todo.dialogs.importFromText')}
          </p>
          <p className="text-xs text-slate-500 mb-2">{t('todo.dialogs.importTextHint')}</p>
          <textarea
            value={importText}
            onChange={e => onImportTextChange(e.target.value)}
            placeholder={t('todo.dialogs.importPlaceholder')}
            className={`w-full border border-slate-300 rounded-md p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${importText ? 'h-56' : 'h-32'}`}
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg text-sm"
            onClick={onClose}
          >
            {t('todo.form.cancel')}
          </button>
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg text-sm"
            onClick={onImport}
          >
            {t('todo.dialogs.importButton')}
          </button>
        </div>
      </div>
    </div>
  );
};

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
}: ExportDialogPresenterProps) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm supports-backdrop-filter:bg-slate-950/35">
      <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-xl mx-4">
        <h2 className="text-lg font-bold text-slate-900 mb-3">{t('todo.dialogs.exportTitle')}</h2>
        <p className="text-sm text-slate-600 mb-4">{t('todo.dialogs.exportDescription')}</p>

        <div className="mb-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">
            {t('todo.dialogs.exportFile')}
          </p>
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg text-sm"
            onClick={onFileExport}
          >
            {t('todo.dialogs.exportAsJson')}
          </button>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">
            {t('todo.dialogs.exportText')}
          </p>
          <p className="text-xs text-slate-500 mb-2">{t('todo.dialogs.exportTextHint')}</p>
          <div className="flex gap-2 mb-2">
            <button
              className="bg-slate-700 hover:bg-slate-800 text-white font-semibold py-2 px-4 rounded-lg text-sm"
              onClick={onTextExport}
            >
              {t('todo.dialogs.exportShowText')}
            </button>
            <button
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg text-sm"
              onClick={onCopyText}
              disabled={!exportText}
            >
              {t('todo.dialogs.copy')}
            </button>
          </div>
          <textarea
            value={exportText}
            readOnly
            placeholder={t('todo.dialogs.exportPlaceholder')}
            className={`w-full border border-slate-300 rounded-md p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${exportText ? 'h-56' : 'h-32'}`}
          />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg text-sm"
            onClick={onClose}
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
