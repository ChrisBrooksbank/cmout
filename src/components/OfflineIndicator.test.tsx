import { render, screen, act } from '@testing-library/react';
import { vi, afterEach } from 'vitest';
import OfflineIndicator from './OfflineIndicator';

describe('OfflineIndicator', () => {
  const originalOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine');

  function setOnlineStatus(online: boolean) {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => online,
    });
  }

  afterEach(() => {
    if (originalOnLine) {
      Object.defineProperty(navigator, 'onLine', originalOnLine);
    }
  });

  it('renders nothing when online', () => {
    setOnlineStatus(true);
    render(<OfflineIndicator />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders the offline banner when offline', () => {
    setOnlineStatus(false);
    render(<OfflineIndicator />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
  });

  it('shows the banner when the offline event fires', () => {
    setOnlineStatus(true);
    render(<OfflineIndicator />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    act(() => {
      setOnlineStatus(false);
      window.dispatchEvent(new Event('offline'));
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('hides the banner when the online event fires', () => {
    setOnlineStatus(false);
    render(<OfflineIndicator />);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => {
      setOnlineStatus(true);
      window.dispatchEvent(new Event('online'));
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('has aria-live="polite" for accessibility', () => {
    setOnlineStatus(false);
    render(<OfflineIndicator />);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite');
  });

  it('removes event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    setOnlineStatus(true);
    const { unmount } = render(<OfflineIndicator />);
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });
});
