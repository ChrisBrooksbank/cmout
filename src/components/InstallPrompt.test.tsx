import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, afterEach } from 'vitest';
import InstallPrompt from './InstallPrompt';

function makePromptEvent(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt') as Event & {
    prompt: ReturnType<typeof vi.fn>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  };
  event.preventDefault = vi.fn();
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome });
  return event;
}

describe('InstallPrompt', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing before beforeinstallprompt fires', () => {
    render(<InstallPrompt />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('shows install button when beforeinstallprompt fires', () => {
    render(<InstallPrompt />);
    fireEvent(window, makePromptEvent());
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /install app/i })).toBeInTheDocument();
  });

  it('calls prompt() and hides the button when install is clicked', async () => {
    render(<InstallPrompt />);
    const promptEvent = makePromptEvent();
    fireEvent(window, promptEvent);

    fireEvent.click(screen.getByRole('button', { name: /install app/i }));

    await waitFor(() => {
      expect(promptEvent.prompt).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    });
  });

  it('prevents the default browser prompt on the event', () => {
    render(<InstallPrompt />);
    const promptEvent = makePromptEvent();
    fireEvent(window, promptEvent);
    expect(promptEvent.preventDefault).toHaveBeenCalled();
  });

  it('removes the event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<InstallPrompt />);
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'beforeinstallprompt',
      expect.any(Function)
    );
  });

  it('shows explanatory text alongside the install button', () => {
    render(<InstallPrompt />);
    fireEvent(window, makePromptEvent());
    expect(screen.getByText(/chelmsford events/i)).toBeInTheDocument();
  });
});
