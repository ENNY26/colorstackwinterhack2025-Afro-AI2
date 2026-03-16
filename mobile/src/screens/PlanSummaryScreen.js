import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/colors';

const LABEL_REASON = {
  travel: 'Travel',
  career: 'Career boost',
  culture: 'Culture & heritage',
  family: 'Family & friends',
  fun: 'Fun & curiosity',
  other: 'Other',
};

const LABEL_FOCUS = {
  confidence: 'Gain confidence',
  listening: 'Improve listening',
  speaking: 'Improve speaking',
  vocabulary: 'Build vocabulary',
  grammar: 'Grammar',
  other: 'Other',
};

const PlanSummaryScreen = ({ navigation, route }) => {
  const { plan } = route.params || {};
  const categories = (plan?.lessons || []).map((l) => l.title).filter(Boolean);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.backgroundLight]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your Personalized Plan</Text>
        <Text style={styles.summary}>{plan?.summary || 'Your plan is ready.'}</Text>

        <View style={styles.details}>
          <Text style={styles.detail}>Level: {(plan?.level || '').charAt(0).toUpperCase() + (plan?.level || '').slice(1)}</Text>
          <Text style={styles.detail}>Daily goal: {plan?.dailyGoal ?? 15} min/day</Text>
          <Text style={styles.detail}>Focus: {LABEL_FOCUS[plan?.focusArea] || plan?.focusArea}</Text>
          <Text style={styles.detail}>Why: {LABEL_REASON[plan?.reason] || plan?.reason}</Text>
        </View>

        {categories.length > 0 && (
          <View style={styles.categoriesSection}>
            <Text style={styles.categoriesTitle}>What you'll learn</Text>
            <View style={styles.chipRow}>
              {categories.map((cat) => (
                <View key={cat} style={styles.chip}>
                  <Ionicons name="book-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.chipText}>{cat}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.continueButton} onPress={() => navigation.replace('ModeSelection', { plan })} activeOpacity={0.8}>
          <LinearGradient colors={COLORS.gradientOrange} style={styles.continueGradient}>
            <Text style={styles.continueText}>Choose Learning Mode</Text>
            <Ionicons name="arrow-forward" size={22} color={COLORS.text} />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingTop: 80, paddingBottom: SPACING.xxl },
  title: { fontSize: FONT_SIZES.xxl, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.sm },
  summary: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, lineHeight: 24, marginBottom: SPACING.lg },
  details: { backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.lg },
  detail: { color: COLORS.text, marginBottom: SPACING.sm, fontSize: FONT_SIZES.md },
  categoriesSection: { marginBottom: SPACING.lg },
  categoriesTitle: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surface, paddingVertical: 6, paddingHorizontal: 12, borderRadius: BORDER_RADIUS.round, marginRight: SPACING.sm, marginBottom: SPACING.sm },
  chipText: { color: COLORS.text, fontSize: FONT_SIZES.sm },
  continueButton: { marginTop: SPACING.md, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden' },
  continueGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: SPACING.lg },
  continueText: { color: COLORS.text, fontSize: FONT_SIZES.lg, fontWeight: 'bold' },
});

export default PlanSummaryScreen;
