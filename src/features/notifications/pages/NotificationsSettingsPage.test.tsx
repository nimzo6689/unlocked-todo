import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotificationsSettingsPage } from '@/features/notifications/pages/NotificationsSettingsPage';
import { useTodoContext } from '@/app/providers/TodoContext';
import i18n from '@/shared/i18n';

vi.mock('@/app/providers/TodoContext', () => ({
  useTodoContext: vi.fn(),
}));

vi.mock('@/features/shortcuts/context/ShortcutContext', () => ({
  useRegisterShortcuts: vi.fn(),
}));

const useTodoContextMock = vi.mocked(useTodoContext);

describe('NotificationsSettingsPage', () => {
  beforeEach(() => {
    useTodoContextMock.mockReturnValue({
      notificationEnabled: false,
      requestNotificationPermission: vi.fn(),
    } as never);
  });

  it('requests notification permission on button click', () => {
    const requestNotificationPermission = vi.fn();
    useTodoContextMock.mockReturnValue({
      notificationEnabled: false,
      requestNotificationPermission,
    } as never);

    render(<NotificationsSettingsPage />);

    fireEvent.click(screen.getByRole('button', { name: '通知を有効にする' }));

    expect(requestNotificationPermission).toHaveBeenCalledTimes(1);
  });

  it('shows configured state when notification is enabled', () => {
    useTodoContextMock.mockReturnValue({
      notificationEnabled: true,
      requestNotificationPermission: vi.fn(),
    } as never);

    render(<NotificationsSettingsPage />);

    expect(screen.getByText('通知は有効です')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '設定済み' })).toBeDisabled();
  });

  it('switches the page copy to English', async () => {
    render(<NotificationsSettingsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'English' }));

    expect(
      await screen.findByRole('heading', { name: 'Notifications & Language' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enable notifications' })).toBeInTheDocument();
    expect(i18n.resolvedLanguage).toBe('en');
  });
});
