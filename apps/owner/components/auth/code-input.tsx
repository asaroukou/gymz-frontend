'use client';

import type { Ref } from 'react';

import { InputOTP, InputOTPGroup, InputOTPSlot } from '@iziwellpass/ui/components/input-otp';
import { cn } from '@iziwellpass/ui/lib/utils';

import { CODE_LENGTH, normalizeCode } from '@/lib/totp-code';

/**
 * Six code boxes (PmD8D / OKurh / PCsCv): 52×56, radius 16, hairline, ink on
 * the active box, the destructive tone when the code was refused. One real
 * input underneath, so paste, SMS/password-manager autofill and screen readers
 * see a single 6-digit field.
 */
export function CodeInput({
  value,
  onChange,
  onComplete,
  invalid = false,
  disabled = false,
  label,
  describedBy,
  autoFocus = false,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  label: string;
  describedBy?: string;
  autoFocus?: boolean;
  inputRef?: Ref<HTMLInputElement>;
}) {
  return (
    <InputOTP
      ref={inputRef}
      maxLength={CODE_LENGTH}
      value={value}
      onChange={(next: string) => onChange(normalizeCode(next))}
      onComplete={onComplete}
      pasteTransformer={normalizeCode}
      inputMode="numeric"
      autoComplete="one-time-code"
      autoFocus={autoFocus}
      disabled={disabled}
      aria-label={label}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      containerClassName="justify-center"
    >
      <InputOTPGroup>
        {Array.from({ length: CODE_LENGTH }, (_, index) => (
          <InputOTPSlot
            key={index}
            index={index}
            className={cn(
              'h-14 w-[52px] rounded-[16px] text-[22px] font-medium',
              invalid &&
                'border-destructive-foreground data-[active=true]:border-destructive-foreground',
            )}
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}
