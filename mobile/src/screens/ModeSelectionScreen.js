import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/colors';

const ModeSelectionScreen = ({ navigation, route }) => {
  const { plan } = route.params || {};

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.backgroundLight]} style={StyleSheet.absoluteFill} />
      <View style={{ padding: SPACING.lg, paddingTop: 80 }}>
        <Text style={styles.title}>Choose a mode</Text>
        <Text style={styles.subtitle}>Select how you'd like to practice today</Text>

        <TouchableOpacity style={styles.card} onPress={() => navigation.replace('TutorCategories', { plan })}>
          <Text style={styles.cardTitle}>Tutor Mode</Text>
          <Text style={styles.cardSubtitle}>Structured lessons and repetition</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('RoleplayCategories', { plan })}>
          <Text style={styles.cardTitle}>Roleplay Mode</Text>
          <Text style={styles.cardSubtitle}>Chat with AI in scenarios: greetings, food, travel & more</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={() => navigation.replace('MainTabs', { plan })}>
          <Text style={styles.skipButtonText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  title: { fontSize: FONT_SIZES.xxl, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.sm },
  subtitle: { color: COLORS.textSecondary, marginBottom: SPACING.lg },
  card: { backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.md },
  cardTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text },
  cardSubtitle: { color: COLORS.textSecondary, marginTop: SPACING.sm },
  skipButton: { marginTop: SPACING.lg, paddingVertical: SPACING.md, alignItems: 'center' },
  skipButtonText: { color: COLORS.primary, fontSize: FONT_SIZES.md, fontWeight: '600' },
});

export default ModeSelectionScreen;
