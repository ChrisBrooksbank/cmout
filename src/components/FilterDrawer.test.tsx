import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import FilterDrawer from './FilterDrawer';

describe('FilterDrawer', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <FilterDrawer open={false} onClose={() => {}} resultCount={0} onClearAll={() => {}}>
        <div>content</div>
      </FilterDrawer>
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders dialog when open', () => {
    render(
      <FilterDrawer open={true} onClose={() => {}} resultCount={10} onClearAll={() => {}}>
        <div>filter content</div>
      </FilterDrawer>
    );
    expect(screen.getByRole('dialog', { name: /filters/i })).toBeInTheDocument();
    expect(screen.getByText('filter content')).toBeInTheDocument();
  });

  it('shows result count in apply button', () => {
    render(
      <FilterDrawer open={true} onClose={() => {}} resultCount={42} onClearAll={() => {}}>
        <div />
      </FilterDrawer>
    );
    expect(screen.getByText('Show 42 events')).toBeInTheDocument();
  });

  it('shows singular for 1 event', () => {
    render(
      <FilterDrawer open={true} onClose={() => {}} resultCount={1} onClearAll={() => {}}>
        <div />
      </FilterDrawer>
    );
    expect(screen.getByText('Show 1 event')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(
      <FilterDrawer open={true} onClose={onClose} resultCount={0} onClearAll={() => {}}>
        <div />
      </FilterDrawer>
    );
    fireEvent.click(screen.getByRole('button', { name: /close filters/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn();
    render(
      <FilterDrawer open={true} onClose={onClose} resultCount={0} onClearAll={() => {}}>
        <div />
      </FilterDrawer>
    );
    // Backdrop is the element with aria-hidden
    fireEvent.click(document.querySelector('.filter-drawer__backdrop')!);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(
      <FilterDrawer open={true} onClose={onClose} resultCount={0} onClearAll={() => {}}>
        <div />
      </FilterDrawer>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClearAll when clear all button clicked', () => {
    const onClearAll = vi.fn();
    render(
      <FilterDrawer open={true} onClose={() => {}} resultCount={0} onClearAll={onClearAll}>
        <div />
      </FilterDrawer>
    );
    fireEvent.click(screen.getByText('Clear all'));
    expect(onClearAll).toHaveBeenCalled();
  });

  it('locks body scroll when open', () => {
    const { unmount } = render(
      <FilterDrawer open={true} onClose={() => {}} resultCount={0} onClearAll={() => {}}>
        <div />
      </FilterDrawer>
    );
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
