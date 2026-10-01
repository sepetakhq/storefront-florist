import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CheckoutSteps } from './CheckoutRoute.jsx';

afterEach(cleanup);

describe('CheckoutSteps', () => {
  it('lists the three steps in order and marks only the current one', () => {
    render(<CheckoutSteps current={1} />);
    const items = screen.getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual(['1Data', '2Verifikasi', '3Bayar']);
    expect(items.map((li) => li.getAttribute('aria-current'))).toEqual([null, 'step', null]);
    expect(items.map((li) => li.className)).toEqual(['is-past', 'is-current', 'is-todo']);
  });

  it('starts on Data', () => {
    render(<CheckoutSteps current={0} />);
    expect(screen.getByText('Data').getAttribute('aria-current')).toBe('step');
  });
});
