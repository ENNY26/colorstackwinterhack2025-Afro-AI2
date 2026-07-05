import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getColors, DARK_COLORS } from '../constants/colors';

const THEME_KEY = 'afro_ai_theme';
const DEFAULT_THEME = 'dark';

const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  isDark: true,
  colors: DARK_COLORS,
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(DEFAULT_THEME);

  // Load the persisted theme once on startup.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (mounted && (saved === 'light' || saved === 'dark')) {
          setThemeState(saved);
        }
      } catch (err) {
        // ignore — fall back to default theme
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const persist = useCallback((next) => {
    AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
  }, []);

  const setTheme = useCallback(
    (next) => {
      const value = next === 'light' ? 'light' : 'dark';
      setThemeState(value);
      persist(value);
    },
    [persist]
  );

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      persist(next);
      return next;
    });
  }, [persist]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      colors: getColors(theme),
      toggleTheme,
      setTheme,
    }),
    [theme, toggleTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);

/**
 * Build a StyleSheet from the active theme's colors, memoized per theme so we
 * don't recreate styles on every render.
 *
 * Usage:
 *   const makeStyles = (COLORS) => StyleSheet.create({ ... });
 *   const styles = useThemedStyles(makeStyles);
 */
export const useThemedStyles = (factory) => {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [factory, colors]);
};

export default ThemeContext;
