import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import AuthContext from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { authAPI } from './src/services';

function AppContent() {
  const { colors, isDark } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = checking, true/false = checked

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authenticated = await authAPI.isAuthenticated();
      setIsAuthenticated(authenticated);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    }
  };

  // Show loading screen while checking authentication
  if (isAuthenticated === null) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ setIsAuthenticated }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Remount navigator when auth changes so sign-out returns to Login */}
        <AppNavigator
          key={isAuthenticated ? 'authenticated' : 'signed-out'}
          isAuthenticated={isAuthenticated}
        />
        <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      </View>
    </AuthContext.Provider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
