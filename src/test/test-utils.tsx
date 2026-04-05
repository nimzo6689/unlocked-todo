import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';

type RouterRenderOptions = {
  route?: string;
} & Omit<RenderOptions, 'wrapper'>;

export const renderWithRouter = (ui: ReactElement, options: RouterRenderOptions = {}) => {
  const { route = '/', ...rest } = options;

  return render(ui, {
    wrapper: ({ children }) => <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>,
    ...rest,
  });
};
