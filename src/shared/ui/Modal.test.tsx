import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from '@/shared/ui/Modal';

describe('Modal', () => {
  it('calls confirm and cancel handlers', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(<Modal message="確認しますか" onConfirm={onConfirm} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
