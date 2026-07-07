import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom ships no ResizeObserver; some primitives (input-otp, radix) reference it.
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserver as unknown as typeof globalThis.ResizeObserver;
}

afterEach(() => {
  cleanup();
});
