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
});
