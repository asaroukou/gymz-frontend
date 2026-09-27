import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './text';
import { TAB_BAR_CONTENT_HEIGHT } from '@/lib/layout';

type ToastInput = { title: string; description?: string };
const ToastContext = createContext<{ show: (t: ToastInput) => void }>({ show: () => {} });

const DURATION_MS = 4000;

/** One transient dark pill above the tab bar (canvas H8Zdj4, spec M10). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastInput | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback((next: ToastInput) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(next);
    timer.current = setTimeout(() => setToast(null), DURATION_MS);
  }, []);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast ? (
        <View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          className="absolute left-5 right-5 rounded-panel bg-ink px-5 py-3.5"
          style={{ bottom: TAB_BAR_CONTENT_HEIGHT + insets.bottom + 12 }}
        >
          <AppText variant="bodyStrong" className="text-white">
            {toast.title}
          </AppText>
          {toast.description ? (
            <AppText variant="label" className="text-white/70">
              {toast.description}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
