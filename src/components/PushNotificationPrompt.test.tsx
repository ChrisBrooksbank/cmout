import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, afterEach, beforeEach } from 'vitest';
import PushNotificationPrompt from './PushNotificationPrompt';

function triggerUserInteraction() {
  fireEvent.click(window);
}

describe('PushNotificationPrompt', () => {
  let originalNotification: typeof window.Notification | undefined;
  let originalPushManager: typeof window.PushManager | undefined;
  let originalServiceWorker: ServiceWorkerContainer | undefined;

  function mockPushSupport() {
    const subscription = {
      endpoint: 'https://push.example.com/ep-1',
      toJSON: () => ({ keys: { auth: 'auth', p256dh: 'p256dh' } }),
      unsubscribe: vi.fn().mockResolvedValue(true),
    };
    const pushManager = {
      getSubscription: vi.fn().mockResolvedValue(null),
      subscribe: vi.fn().mockResolvedValue(subscription),
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
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ publicKey: 'AAAA' }),
      })
    );
  }

  function mockNotification(permission: NotificationPermission = 'default') {
    const mockRequestPermission = vi.fn().mockResolvedValue(permission);
    const MockNotification = vi.fn() as unknown as typeof Notification;
    Object.defineProperty(MockNotification, 'permission', {
      configurable: true,
      get: () => permission,
    });
    MockNotification.requestPermission = mockRequestPermission;
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: MockNotification,
    });
    return mockRequestPermission;
  }

  beforeEach(() => {
    originalNotification = window.Notification;
    originalPushManager = window.PushManager;
    originalServiceWorker = navigator.serviceWorker;
    mockPushSupport();
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
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders nothing before any user interaction', () => {
    mockNotification('default');
    render(<PushNotificationPrompt />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('renders nothing when Notification API is unsupported', () => {
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    render(<PushNotificationPrompt />);
    triggerUserInteraction();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('renders nothing when permission is already granted', () => {
    mockNotification('granted');
    render(<PushNotificationPrompt />);
    act(() => {
      triggerUserInteraction();
    });
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('renders nothing when permission is already denied', () => {
    mockNotification('denied');
    render(<PushNotificationPrompt />);
    act(() => {
      triggerUserInteraction();
    });
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('shows the prompt after user interaction when permission is default', () => {
    mockNotification('default');
    render(<PushNotificationPrompt />);
    act(() => {
      triggerUserInteraction();
    });
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('shows explanatory text about Chelmsford events', () => {
    mockNotification('default');
    render(<PushNotificationPrompt />);
    act(() => {
      triggerUserInteraction();
    });
    expect(screen.getByText(/chelmsford events/i)).toBeInTheDocument();
  });

  it('shows an enable notifications button', () => {
    mockNotification('default');
    render(<PushNotificationPrompt />);
    act(() => {
      triggerUserInteraction();
    });
    expect(screen.getByRole('button', { name: /enable notifications/i })).toBeInTheDocument();
  });

  it('shows a dismiss button', () => {
    mockNotification('default');
    render(<PushNotificationPrompt />);
    act(() => {
      triggerUserInteraction();
    });
    expect(screen.getByRole('button', { name: /not now/i })).toBeInTheDocument();
  });

  it('calls Notification.requestPermission when enable is clicked', async () => {
    const requestPermission = mockNotification('default');
    render(<PushNotificationPrompt />);
    act(() => {
      triggerUserInteraction();
    });

    fireEvent.click(screen.getByRole('button', { name: /enable notifications/i }));

    await waitFor(() => {
      expect(requestPermission).toHaveBeenCalledTimes(1);
    });
  });

  it('hides the prompt after permission is granted', async () => {
    mockNotification('granted');
    // Start with default permission, then clicking resolves to granted
    const mockReq = vi.fn().mockResolvedValue('granted');
    const MockNotif = vi.fn() as unknown as typeof Notification;
    let perm: NotificationPermission = 'default';
    Object.defineProperty(MockNotif, 'permission', { configurable: true, get: () => perm });
    MockNotif.requestPermission = mockReq;
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: MockNotif,
    });

    render(<PushNotificationPrompt />);
    act(() => {
      triggerUserInteraction();
    });
    expect(screen.getByRole('complementary')).toBeInTheDocument();

    perm = 'granted';
    fireEvent.click(screen.getByRole('button', { name: /enable notifications/i }));

    await waitFor(() => {
      expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    });
  });

  it('hides the prompt when dismiss is clicked', () => {
    mockNotification('default');
    render(<PushNotificationPrompt />);
    act(() => {
      triggerUserInteraction();
    });
    fireEvent.click(screen.getByRole('button', { name: /not now/i }));
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('also shows after keyboard interaction', () => {
    mockNotification('default');
    render(<PushNotificationPrompt />);
    act(() => {
      fireEvent.keyDown(window, { key: 'Tab' });
    });
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('also shows after scroll interaction', () => {
    mockNotification('default');
    render(<PushNotificationPrompt />);
    act(() => {
      fireEvent.scroll(window);
    });
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });
});
