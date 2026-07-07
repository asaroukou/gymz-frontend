import { render, screen } from '@testing-library/react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './input-otp';

describe('InputOTP', () => {
  it('renders the underlying input and the requested number of slots', () => {
    render(
      <InputOTP maxLength={6}>
        <InputOTPGroup>
          {Array.from({ length: 6 }).map((_, i) => (
            <InputOTPSlot key={i} index={i} />
          ))}
        </InputOTPGroup>
      </InputOTP>,
    );

    expect(screen.getByRole('textbox')).toHaveProperty('maxLength', 6);
    expect(document.querySelectorAll('[data-slot="input-otp-slot"]')).toHaveLength(6);
  });
});
