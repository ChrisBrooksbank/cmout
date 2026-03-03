import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import ListFilter from './ListFilter';

const items = [
  { name: 'Riverside Leisure Centre', count: 42 },
  { name: 'Civic Theatre', count: 15 },
  { name: 'Hot Box', count: 8 },
];

describe('ListFilter', () => {
  it('renders all items with counts', () => {
    render(<ListFilter legend="Venues" items={items} selected={[]} onChange={() => {}} />);
    expect(screen.getByText('Riverside Leisure Centre')).toBeInTheDocument();
    expect(screen.getByText('(42)')).toBeInTheDocument();
    expect(screen.getByText('Civic Theatre')).toBeInTheDocument();
    expect(screen.getByText('Hot Box')).toBeInTheDocument();
  });

  it('renders nothing when items is empty', () => {
    const { container } = render(
      <ListFilter legend="Venues" items={[]} selected={[]} onChange={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('calls onChange when checkbox toggled', () => {
    const onChange = vi.fn();
    render(<ListFilter legend="Venues" items={items} selected={[]} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(/riverside/i));
    expect(onChange).toHaveBeenCalledWith(['Riverside Leisure Centre']);
  });

  it('removes item when unchecked', () => {
    const onChange = vi.fn();
    render(
      <ListFilter
        legend="Venues"
        items={items}
        selected={['Riverside Leisure Centre']}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByLabelText(/riverside/i));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('filters items by search', () => {
    render(<ListFilter legend="Venues" items={items} selected={[]} onChange={() => {}} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'civic' } });
    expect(screen.getByText('Civic Theatre')).toBeInTheDocument();
    expect(screen.queryByText('Riverside Leisure Centre')).not.toBeInTheDocument();
  });

  it('shows clear button when selections active', () => {
    const onChange = vi.fn();
    render(<ListFilter legend="Venues" items={items} selected={['Hot Box']} onChange={onChange} />);
    fireEvent.click(screen.getByText('Clear'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('hides clear button when no selections', () => {
    render(<ListFilter legend="Venues" items={items} selected={[]} onChange={() => {}} />);
    expect(screen.queryByText('Clear')).not.toBeInTheDocument();
  });
});
