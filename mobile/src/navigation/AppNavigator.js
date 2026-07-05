import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, BORDER_RADIUS } from '../constants/colors';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { authAPI } from '../services';

// Screens
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import VerifyPhoneScreen from '../screens/VerifyPhoneScreen';
import LanguageSelectionScreen from '../screens/LanguageSelectionScreen';
import PersonalitySelectionScreen from '../screens/PersonalitySelectionScreen';
import SurveyScreen from '../screens/SurveyScreen';
import PlanSummaryScreen from '../screens/PlanSummaryScreen';
import ModeSelectionScreen from '../screens/ModeSelectionScreen';
import TutorCategoriesScreen from '../screens/TutorCategoriesScreen';
import TutorLessonScreen from '../screens/TutorLessonScreen';
import RoleplayCategoriesScreen from '../screens/RoleplayCategoriesScreen';
import RoleplayScenariosScreen from '../screens/RoleplayScenariosScreen';
import RoleplayHistoryScreen from '../screens/RoleplayHistoryScreen';
import RoleplaySummaryScreen from '../screens/RoleplaySummaryScreen';
import StreakStatsScreen from '../screens/StreakStatsScreen';
import ConversationScreen from '../screens/ConversationScreen';
import VocabularyScreen from '../screens/VocabularyScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import HomeScreen from '../screens/HomeScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({ route }) {
  const { colors: COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  /**
   * Nested navigation passes { screen: 'Conversation', params: { conversationType, ... } }.
   * Tab screens must receive inner `params`, not the wrapper — otherwise ConversationScreen
   * never sees conversationType and roleplay breaks silently.
   */
  const outer = route?.params || {};
  const initialParams =
    outer.params != null &&
    typeof outer.params === 'object' &&
    typeof outer.screen === 'string'
      ? outer.params
      : outer;

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Conversation') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Vocabulary') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = focused ? 'ellipse' : 'ellipse-outline';
          }

          // Special styling for the main conversation tab
          if (route.name === 'Conversation' && focused) {
            return (
              <View style={styles.activeTabIcon}>
                <LinearGradient
                  colors={COLORS.gradientOrange}
                  style={styles.activeTabGradient}
                >
                  <Ionicons name={iconName} size={22} color={COLORS.text} />
                </LinearGradient>
              </View>
            );
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        initialParams={initialParams}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Conversation"
        component={ConversationScreen}
        initialParams={initialParams}
        options={{ tabBarLabel: 'Speak' }}
      />
      <Tab.Screen
        name="Vocabulary"
        component={VocabularyScreen}
        options={{ tabBarLabel: 'Words' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator({ isAuthenticated = false }) {
  const { colors: COLORS } = useTheme();
  // Determine initial route based on authentication
  const getInitialRoute = () => (isAuthenticated ? 'MainTabs' : 'Login');

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={getInitialRoute()}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        {/* Onboarding Flow */}
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ animation: 'fade' }}
        />
        
        {/* Authentication Flow */}
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Signup"
          component={SignupScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="VerifyPhone"
          component={VerifyPhoneScreen}
          options={{ animation: 'slide_from_right' }}
        />

        {/* Language Selection (after auth) */}
        <Stack.Screen
          name="LanguageSelection"
          component={LanguageSelectionScreen}
        />
        <Stack.Screen
          name="PersonalitySelection"
          component={PersonalitySelectionScreen}
        />
        <Stack.Screen
          name="Survey"
          component={SurveyScreen}
        />
        <Stack.Screen
          name="PlanSummary"
          component={PlanSummaryScreen}
        />
        <Stack.Screen
          name="ModeSelection"
          component={ModeSelectionScreen}
        />
        <Stack.Screen
          name="TutorCategories"
          component={TutorCategoriesScreen}
        />
        <Stack.Screen
          name="TutorLesson"
          component={TutorLessonScreen}
        />
        <Stack.Screen
          name="RoleplayCategories"
          component={RoleplayCategoriesScreen}
        />
        <Stack.Screen
          name="RoleplayScenarios"
          component={RoleplayScenariosScreen}
        />
        <Stack.Screen
          name="RoleplayHistory"
          component={RoleplayHistoryScreen}
        />
        <Stack.Screen
          name="RoleplaySummary"
          component={RoleplaySummaryScreen}
        />

        {/* Main App with Bottom Tabs */}
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ animation: 'fade_from_bottom' }}
        />

        {/* History Screen (accessible from Home) */}
        <Stack.Screen
          name="History"
          component={HistoryScreen}
        />
        <Stack.Screen
          name="StreakStats"
          component={StreakStatsScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const makeStyles = (COLORS) => StyleSheet.create({
  activeTabIcon: {
    marginTop: -8,
  },
  activeTabGradient: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default AppNavigator;
