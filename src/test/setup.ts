import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
  root = null;
  rootMargin = '0px';
  thresholds = [0];
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

Object.defineProperty(window, 'Notification', {
  writable: true,
  value: {
    permission: 'granted',
    requestPermission: vi.fn(async () => 'granted'),
  },
});

Object.defineProperty(window.navigator, 'serviceWorker', {
  writable: true,
  value: {
    register: vi.fn(async () => ({ scope: '/' })),
    ready: Promise.resolve({
      showNotification: vi.fn(async () => undefined),
    }),
  },
});
