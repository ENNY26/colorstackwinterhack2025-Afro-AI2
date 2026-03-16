import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import AuthContext from './src/context/AuthContext';
import { COLORS } from './src/constants/colors';
import { authAPI } from './src/services';

export default function App() {
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
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ setIsAuthenticated }}>
      <View style={styles.container}>
        <AppNavigator isAuthenticated={isAuthenticated} />
        <StatusBar style="light" backgroundColor={COLORS.background} />
      </View>
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
