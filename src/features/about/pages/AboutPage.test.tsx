import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AboutPage } from '@/features/about/pages/AboutPage';

describe('AboutPage', () => {
  it('renders about content and repository link', () => {
    render(<AboutPage />);

    expect(screen.getByRole('heading', { name: 'アプリ情報' })).toBeInTheDocument();
    expect(screen.getByText('何が違うか')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'github.com/nimzo6689/hakaru-todo' })).toHaveAttribute(
      'href',
      'https://github.com/nimzo6689/hakaru-todo',
    );
  });
});
