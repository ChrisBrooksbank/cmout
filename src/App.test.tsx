import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the app heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /cmout/i })).toBeInTheDocument();
  });

  it('renders the Chelmsford Events subtitle', () => {
    render(<App />);
    expect(screen.getByText(/chelmsford events/i)).toBeInTheDocument();
  });
});
