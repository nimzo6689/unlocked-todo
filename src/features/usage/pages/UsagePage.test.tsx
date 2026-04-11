import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UsagePage } from '@/features/usage/pages/UsagePage';

describe('UsagePage', () => {
  it('renders usage steps and shortcut section', () => {
    render(<UsagePage />);

    expect(screen.getByRole('heading', { name: '使い方' })).toBeInTheDocument();
    expect(screen.getByText('タスクを作成する')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ショートカット早見表' })).toBeInTheDocument();
    expect(screen.getByText('全体共通')).toBeInTheDocument();
  });
});
