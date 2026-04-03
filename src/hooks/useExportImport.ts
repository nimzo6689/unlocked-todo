import React, { useState } from 'react';
import toast from 'react-hot-toast';
import type { ImportResult } from '../common/types';

type UseExportImportOptions = {
  exportTodos: () => Promise<void>;
  exportTodosToText: () => string;
  importTodos: (file: File) => Promise<ImportResult>;
  importTodosFromText: (text: string) => Promise<ImportResult>;
};

export const useExportImport = ({
  exportTodos,
  exportTodosToText,
  importTodos,
  importTodosFromText,
}: UseExportImportOptions) => {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [exportText, setExportText] = useState('');
  const [importText, setImportText] = useState('');

  const handleExport = () => setIsExportDialogOpen(true);
  const handleImport = () => setIsImportDialogOpen(true);

  const closeExportDialog = () => {
    setIsExportDialogOpen(false);
    setExportText('');
  };

  const closeImportDialog = () => {
    setIsImportDialogOpen(false);
    setImportText('');
  };

  const handleFileExport = async () => {
    try {
      await exportTodos();
      toast.success('タスクをエクスポートしました');
      setIsExportDialogOpen(false);
    } catch {
      toast.error('エクスポートに失敗しました');
    }
  };

  const handleTextExport = () => setExportText(exportTodosToText());

  const handleCopyExportText = async () => {
    if (!exportText) {
      toast.error('出力するテキストがありません');
      return;
    }
    try {
      await navigator.clipboard.writeText(exportText);
      toast.success('エクスポートテキストをコピーしました');
    } catch {
      toast.error('コピーに失敗しました');
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await importTodos(file);
    if (result.success) {
      if (result.addedCount === 0 && result.updatedCount === 0) {
        toast.success('ファイルを読み込みましたが、取り込むタスクはありませんでした');
      } else {
        toast.success(`${result.addedCount}件追加、${result.updatedCount}件更新しました`);
      }
      setIsImportDialogOpen(false);
      setImportText('');
    } else {
      toast.error(`インポートに失敗しました: ${result.message}`);
    }

    e.target.value = '';
  };

  const handleTextImport = async () => {
    if (!importText.trim()) {
      toast.error('インポートするJSONテキストを入力してください');
      return;
    }

    const result = await importTodosFromText(importText);
    if (result.success) {
      if (result.addedCount === 0 && result.updatedCount === 0) {
        toast.success('テキストを読み込みましたが、取り込むタスクはありませんでした');
      } else {
        toast.success(`${result.addedCount}件追加、${result.updatedCount}件更新しました`);
      }
      setImportText('');
      setIsImportDialogOpen(false);
    } else {
      toast.error(`インポートに失敗しました: ${result.message}`);
    }
  };

  return {
    isExportDialogOpen,
    setIsExportDialogOpen,
    isImportDialogOpen,
    setIsImportDialogOpen,
    exportText,
    importText,
    setImportText,
    handleExport,
    handleImport,
    closeExportDialog,
    closeImportDialog,
    handleFileExport,
    handleTextExport,
    handleCopyExportText,
    handleFileSelected,
    handleTextImport,
  };
};
