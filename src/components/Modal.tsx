import React from 'react';

export type ModalProps = {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export const Modal: React.FC<ModalProps> = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-xs sm:max-w-sm">
      <p className="text-slate-700 mb-6 whitespace-pre-line text-sm sm:text-base">{message}</p>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm"
          onClick={onCancel}
        >
          キャンセル
        </button>
        <button
          className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm"
          onClick={onConfirm}
        >
          削除
        </button>
      </div>
    </div>
  </div>
);
