import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme, lightTheme, ThemeTokens } from '../theme/tokens';

export type ThemeMode = 'dark' | 'light';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'dark',
      setMode: (mode: ThemeMode) => set({ mode }),
    }),
    {
      name: 'finwerse-theme',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export const useThemeTokens = (): ThemeTokens => {
  const mode = useThemeStore((state) => state.mode);
  return mode === 'light' ? lightTheme : darkTheme;
};
