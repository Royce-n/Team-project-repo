import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default size', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('h-12', 'w-12');
  });

  it('renders with small size', () => {
    render(<LoadingSpinner size="small" />);
    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toHaveClass('h-4', 'w-4');
  });

  it('renders with custom className', () => {
    render(<LoadingSpinner className="custom-class" />);
    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toHaveClass('custom-class');
  });
});
