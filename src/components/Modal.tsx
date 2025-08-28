import React from 'react';

export type ModalProps = {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export const Modal: React.FC<ModalProps> = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
      <p className="text-slate-700 mb-6 whitespace-pre-line">{message}</p>
      <div className="flex justify-end space-x-3">
        <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg" onClick={onCancel}>キャンセル</button>
        <button className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg" onClick={onConfirm}>削除</button>
      </div>
    </div>
  </div>
);
