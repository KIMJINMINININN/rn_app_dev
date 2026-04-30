import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './button';

describe('Button', () => {
  it('renders and fires click handler', async () => {
    const onClick = vi.fn();
    render(
      <Button variant="primary" onClick={onClick}>
        클릭
      </Button>,
    );
    const btn = await screen.findByRole('button', { name: '클릭' });
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
