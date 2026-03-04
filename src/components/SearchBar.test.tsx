import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import SearchBar from './SearchBar';

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a search input', () => {
    render(<SearchBar value="" onChange={() => {}} />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('renders a label for the search input', () => {
    render(<SearchBar value="" onChange={() => {}} />);
    expect(screen.getByLabelText(/search events/i)).toBeInTheDocument();
  });

  it('displays the current value', () => {
    render(<SearchBar value="jazz" onChange={() => {}} />);
    expect(screen.getByRole('searchbox')).toHaveValue('jazz');
  });

  it('does not call onChange immediately on input change', () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'jazz' } });
    expect(onChange).not.toHaveBeenCalledWith('jazz');
  });

  it('calls onChange after debounce delay', () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'jazz' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onChange).toHaveBeenCalledWith('jazz');
  });

  it('only calls onChange once for rapid input changes', () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'j' } });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ja' } });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'jaz' } });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'jazz' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('jazz');
  });

  it('updates displayed value when value prop changes', () => {
    const { rerender } = render(<SearchBar value="jazz" onChange={() => {}} />);
    rerender(<SearchBar value="rock" onChange={() => {}} />);
    expect(screen.getByRole('searchbox')).toHaveValue('rock');
  });

  // Phase-based UI tests
  it('shows nothing extra in idle phase', () => {
    render(<SearchBar value="" onChange={() => {}} smartSearchPhase="idle" />);
    expect(screen.queryByText(/smart search/i)).not.toBeInTheDocument();
  });

  it('shows loading message in loading phase', () => {
    render(<SearchBar value="" onChange={() => {}} smartSearchPhase="loading" />);
    expect(screen.getByText(/loading smart search/i)).toBeInTheDocument();
  });

  it('shows "Smart search active" when ready and has query', () => {
    render(<SearchBar value="jazz" onChange={() => {}} smartSearchPhase="ready" />);
    expect(screen.getByText(/smart search active/i)).toBeInTheDocument();
  });

  it('does not show "Smart search active" when ready but no query', () => {
    render(<SearchBar value="" onChange={() => {}} smartSearchPhase="ready" />);
    expect(screen.queryByText(/smart search active/i)).not.toBeInTheDocument();
  });

  it('shows prompt with Enable and No thanks buttons', () => {
    render(<SearchBar value="" onChange={() => {}} smartSearchPhase="prompt" />);
    expect(screen.getByText(/enable smart search/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enable/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /no thanks/i })).toBeInTheDocument();
  });

  it('calls onAcceptSmartSearch when Enable is clicked', () => {
    const accept = vi.fn();
    render(
      <SearchBar
        value=""
        onChange={() => {}}
        smartSearchPhase="prompt"
        onAcceptSmartSearch={accept}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /enable/i }));
    expect(accept).toHaveBeenCalledTimes(1);
  });

  it('calls onDeclineSmartSearch when No thanks is clicked', () => {
    const decline = vi.fn();
    render(
      <SearchBar
        value=""
        onChange={() => {}}
        smartSearchPhase="prompt"
        onDeclineSmartSearch={decline}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /no thanks/i }));
    expect(decline).toHaveBeenCalledTimes(1);
  });

  it('shows disabled state with Turn on link', () => {
    render(<SearchBar value="" onChange={() => {}} smartSearchPhase="disabled" />);
    expect(screen.getByText(/smart search off/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /turn on/i })).toBeInTheDocument();
  });

  it('calls onAcceptSmartSearch when Turn on is clicked', () => {
    const accept = vi.fn();
    render(
      <SearchBar
        value=""
        onChange={() => {}}
        smartSearchPhase="disabled"
        onAcceptSmartSearch={accept}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /turn on/i }));
    expect(accept).toHaveBeenCalledTimes(1);
  });

  it('shows error state', () => {
    render(<SearchBar value="" onChange={() => {}} smartSearchPhase="error" />);
    expect(screen.getByText(/smart search unavailable/i)).toBeInTheDocument();
  });
});
