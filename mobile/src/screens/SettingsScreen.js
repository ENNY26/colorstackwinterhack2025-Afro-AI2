import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/colors';
import { authAPI } from '../services';
import { useAuth } from '../context/AuthContext';

const SettingsScreen = ({ navigation }) => {
  const [voiceSpeed, setVoiceSpeed] = useState(1); // 0.5, 1, 1.5
  const [darkMode, setDarkMode] = useState(true);
  const [selectedLanguage] = useState({ name: 'Yoruba', flag: '🇳🇬' });
  const [selectedPersonality] = useState({ name: 'Friendly & Casual', emoji: '😊' });

  const { setIsAuthenticated } = useAuth();

  const handleVoiceSpeedChange = (speed) => {
    console.log('Voice speed changed to:', speed);
    setVoiceSpeed(speed);
  };

  const handleThemeToggle = (value) => {
    console.log('Theme toggled:', value ? 'Dark' : 'Light');
    setDarkMode(value);
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await authAPI.logout();
              // update global auth state so App can react
              try {
                setIsAuthenticated(false);
              } catch (e) {
                // ignore if context not provided
              }
              // Navigate to login screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };


  const SettingItem = ({ icon, title, value, onPress, showChevron = true, rightElement }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={22} color={COLORS.primary} />
        </View>
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      <View style={styles.settingRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        {rightElement}
        {showChevron && !rightElement && (
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        )}
      </View>
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundLight]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Learning Settings */}
        <SectionHeader title="LEARNING" />
        <View style={styles.section}>
          <SettingItem
            icon="language"
            title="Selected Language"
            value={`${selectedLanguage.flag} ${selectedLanguage.name}`}
            onPress={() => {
              console.log('Change language pressed');
              navigation.navigate('LanguageSelection');
            }}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="person"
            title="AI Personality"
            value={`${selectedPersonality.emoji} ${selectedPersonality.name}`}
            onPress={() => {
              console.log('Change personality pressed');
              navigation.navigate('PersonalitySelection', { language: selectedLanguage });
            }}
          />
        </View>

        {/* Voice Settings */}
        <SectionHeader title="VOICE" />
        <View style={styles.section}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="speedometer" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.settingTitle}>Voice Speed</Text>
            </View>
          </View>
          <View style={styles.speedSelector}>
            {[
              { label: 'Slow', value: 0.5 },
              { label: 'Normal', value: 1 },
              { label: 'Fast', value: 1.5 },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.speedOption,
                  voiceSpeed === option.value && styles.speedOptionActive,
                ]}
                onPress={() => handleVoiceSpeedChange(option.value)}
              >
                <Text
                  style={[
                    styles.speedLabel,
                    voiceSpeed === option.value && styles.speedLabelActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Appearance */}
        <SectionHeader title="APPEARANCE" />
        <View style={styles.section}>
          <SettingItem
            icon="moon"
            title="Dark Mode"
            showChevron={false}
            rightElement={
              <Switch
                value={darkMode}
                onValueChange={handleThemeToggle}
                trackColor={{ false: COLORS.border, true: COLORS.primary + '80' }}
                thumbColor={darkMode ? COLORS.primary : COLORS.textMuted}
              />
            }
          />
        </View>

        {/* About */}
        <SectionHeader title="ABOUT" />
        <View style={styles.section}>
          <SettingItem
            icon="document-text"
            title="Privacy Policy"
            onPress={() => console.log('Privacy Policy pressed')}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="information-circle"
            title="About Afro AI"
            onPress={() => console.log('About pressed')}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="star"
            title="Rate the App"
            onPress={() => console.log('Rate app pressed')}
          />
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out" size={22} color={COLORS.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.versionText}>Afro AI v1.0.0</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  sectionHeader: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  settingTitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  settingValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 60,
  },
  speedSelector: {
    flexDirection: 'row',
    padding: SPACING.md,
    paddingTop: 0,
    gap: SPACING.sm,
  },
  speedOption: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  speedOptionActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  speedLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  speedLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error + '15',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.xl,
    gap: SPACING.sm,
  },
  signOutText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.error,
    fontWeight: '600',
  },
  versionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
});

export default SettingsScreen;
