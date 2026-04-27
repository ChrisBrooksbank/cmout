import { render, screen, fireEvent } from '@testing-library/react';
import { vi, beforeEach, afterEach } from 'vitest';
import NotificationPreferences from './NotificationPreferences';

const STORAGE_KEY = 'cmout-notification-prefs';

function mockNotificationPermission(permission: NotificationPermission) {
  const MockNotif = vi.fn() as unknown as typeof Notification;
  Object.defineProperty(MockNotif, 'permission', {
    configurable: true,
    get: () => permission,
  });
  Object.defineProperty(window, 'Notification', {
    configurable: true,
    writable: true,
    value: MockNotif,
  });
}

describe('NotificationPreferences', () => {
  let originalNotification: typeof window.Notification | undefined;
  let originalPushManager: typeof window.PushManager | undefined;
  let originalServiceWorker: ServiceWorkerContainer | undefined;

  function mockPushSupport(subscription: PushSubscription | null = null) {
    const pushManager = {
      getSubscription: vi.fn().mockResolvedValue(subscription),
      subscribe: vi.fn(),
    };
    Object.defineProperty(window, 'PushManager', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: { ready: Promise.resolve({ pushManager }) },
    });
  }

  beforeEach(() => {
    originalNotification = window.Notification;
    originalPushManager = window.PushManager;
    originalServiceWorker = navigator.serviceWorker;
    mockPushSupport();
    localStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: originalNotification,
    });
    Object.defineProperty(window, 'PushManager', {
      configurable: true,
      writable: true,
      value: originalPushManager,
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: originalServiceWorker,
    });
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders nothing when Notification API is unsupported', () => {
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    render(<NotificationPreferences />);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('renders preferences with an enable button when permission is default', () => {
    mockNotificationPermission('default');
    render(<NotificationPreferences />);
    expect(screen.getByLabelText(/notification preferences/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enable notifications/i })).toBeInTheDocument();
  });

  it('shows blocked guidance when permission is denied', () => {
    mockNotificationPermission('denied');
    render(<NotificationPreferences />);
    expect(screen.getByLabelText(/notification preferences/i)).toHaveTextContent(/blocked/i);
  });

  it('renders the preferences panel when permission is granted', () => {
    mockNotificationPermission('granted');
    render(<NotificationPreferences />);
    expect(screen.getByRole('region', { name: /notification preferences/i })).toBeInTheDocument();
  });

  it('shows all 11 category checkboxes', () => {
    mockNotificationPermission('granted');
    render(<NotificationPreferences />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(11);
  });

  it('shows category labels', () => {
    mockNotificationPermission('granted');
    render(<NotificationPreferences />);
    expect(screen.getByText('Live Music')).toBeInTheDocument();
    expect(screen.getByText('Theatre & Comedy')).toBeInTheDocument();
    expect(screen.getByText('Festival')).toBeInTheDocument();
    expect(screen.getByText('Fitness')).toBeInTheDocument();
    expect(screen.getByText('Community')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Faith')).toBeInTheDocument();
    expect(screen.getByText('Sport')).toBeInTheDocument();
    expect(screen.getByText('Kids')).toBeInTheDocument();
    expect(screen.getByText('Pub & Bar')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('shows frequency radio buttons', () => {
    mockNotificationPermission('granted');
    render(<NotificationPreferences />);
    expect(screen.getByRole('radio', { name: /daily digest/i })).toBeInTheDocument();
  });

  it('defaults to daily digest frequency', () => {
    mockNotificationPermission('granted');
    render(<NotificationPreferences />);
    expect(screen.getByRole('radio', { name: /daily digest/i })).toBeChecked();
  });

  it('starts with no categories selected', () => {
    mockNotificationPermission('granted');
    render(<NotificationPreferences />);
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(checkbox => {
      expect(checkbox).not.toBeChecked();
    });
  });

  it('toggles a category on when checked', () => {
    mockNotificationPermission('granted');
    render(<NotificationPreferences />);
    const liveMusicCheckbox = screen.getByRole('checkbox', { name: /live music/i });
    fireEvent.click(liveMusicCheckbox);
    expect(liveMusicCheckbox).toBeChecked();
  });

  it('toggles a category off when unchecked', () => {
    mockNotificationPermission('granted');
    render(<NotificationPreferences />);
    const liveMusicCheckbox = screen.getByRole('checkbox', { name: /live music/i });
    fireEvent.click(liveMusicCheckbox);
    expect(liveMusicCheckbox).toBeChecked();
    fireEvent.click(liveMusicCheckbox);
    expect(liveMusicCheckbox).not.toBeChecked();
  });

  it('persists category selection to localStorage', () => {
    mockNotificationPermission('granted');
    render(<NotificationPreferences />);
    fireEvent.click(screen.getByRole('checkbox', { name: /live music/i }));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as {
      categories: string[];
    };
    expect(saved.categories).toContain('live-music');
  });

  it('loads previously saved preferences from localStorage', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ categories: ['sport', 'kids'], frequency: 'daily-digest' })
    );
    mockNotificationPermission('granted');
    render(<NotificationPreferences />);
    expect(screen.getByRole('checkbox', { name: /sport/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /kids/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /live music/i })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /daily digest/i })).toBeChecked();
  });

  it('handles corrupt localStorage gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');
    mockNotificationPermission('granted');
    render(<NotificationPreferences />);
    // Should render with defaults, no crash
    expect(screen.getByRole('region', { name: /notification preferences/i })).toBeInTheDocument();
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(checkbox => {
      expect(checkbox).not.toBeChecked();
    });
  });
});
