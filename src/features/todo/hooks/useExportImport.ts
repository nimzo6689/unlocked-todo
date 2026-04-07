import React, { useState } from 'react';
import toast from 'react-hot-toast';
import i18n from '@/shared/i18n';
import type { ImportResult } from '@/features/todo/model/types';

type UseExportImportOptions = {
  exportTodos: () => Promise<void>;
  exportTodosToText: () => Promise<string>;
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
      toast.success(i18n.t('todo.toast.exportSuccess'));
      setIsExportDialogOpen(false);
    } catch {
      toast.error(i18n.t('todo.toast.exportFailed'));
    }
  };

  const handleTextExport = async () => {
    try {
      const text = await exportTodosToText();
      setExportText(text);
    } catch {
      toast.error(i18n.t('todo.toast.exportFailed'));
    }
  };

  const handleCopyExportText = async () => {
    if (!exportText) {
      toast.error(i18n.t('todo.toast.noExportText'));
      return;
    }
    try {
      await navigator.clipboard.writeText(exportText);
      toast.success(i18n.t('todo.toast.exportCopied'));
    } catch {
      toast.error(i18n.t('todo.toast.copyFailed'));
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await importTodos(file);
    if (result.success) {
      if (result.addedCount === 0 && result.updatedCount === 0) {
        toast.success(i18n.t('todo.toast.importNoChangesFile'));
      } else {
        toast.success(
          i18n.t('todo.toast.importSummary', {
            addedCount: result.addedCount,
            updatedCount: result.updatedCount,
          }),
        );
      }
      setIsImportDialogOpen(false);
      setImportText('');
    } else {
      toast.error(i18n.t('todo.toast.importFailed', { message: result.message }));
    }

    e.target.value = '';
  };

  const handleTextImport = async () => {
    if (!importText.trim()) {
      toast.error(i18n.t('todo.toast.importTextRequired'));
      return;
    }

    const result = await importTodosFromText(importText);
    if (result.success) {
      if (result.addedCount === 0 && result.updatedCount === 0) {
        toast.success(i18n.t('todo.toast.importNoChangesText'));
      } else {
        toast.success(
          i18n.t('todo.toast.importSummary', {
            addedCount: result.addedCount,
            updatedCount: result.updatedCount,
          }),
        );
      }
      setImportText('');
      setIsImportDialogOpen(false);
    } else {
      toast.error(i18n.t('todo.toast.importFailed', { message: result.message }));
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
