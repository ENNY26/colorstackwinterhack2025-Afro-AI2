import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/colors';
import { ROLEPLAY_CATEGORIES } from '../constants/roleplayCategories';

const RoleplaySummaryScreen = ({ navigation, route }) => {
  const { summary, userMessages = [], aiMessages = [], language, conversationType } = route.params || {};
  const langName = language?.name || 'Yoruba';
  const categoryLabel =
    ROLEPLAY_CATEGORIES.find((c) => c.id === conversationType)?.label || 'Roleplay';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundLight]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Session summary</Text>
            <Text style={styles.subtitle}>
              {langName} · {categoryLabel}
            </Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Ionicons name="time-outline" size={16} color={COLORS.primary} />
              <Text style={styles.statChipText}>
                {(summary?.durationMinutes || 0).toString()} min
              </Text>
            </View>
            <View style={styles.statChip}>
              <Ionicons name="repeat-outline" size={16} color={COLORS.primary} />
              <Text style={styles.statChipText}>
                {(summary?.totalTurns || userMessages.length + aiMessages.length) || 0} turns
              </Text>
            </View>
            <View style={styles.statChip}>
              <Ionicons name="sparkles" size={16} color={COLORS.primary} />
              <Text style={styles.statChipText}>
                {(summary?.wordsLearned || 0).toString()} words
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>You said</Text>
          {userMessages.length === 0 ? (
            <Text style={styles.emptyText}>No messages recorded.</Text>
          ) : (
            userMessages.slice(0, 10).map((m, idx) => (
              <View key={`${m._id || idx}-user`} style={styles.messageBubbleUser}>
                <Text style={styles.messageText}>{m.content}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Afro said</Text>
          {aiMessages.length === 0 ? (
            <Text style={styles.emptyText}>No AI messages recorded.</Text>
          ) : (
            aiMessages.slice(0, 10).map((m, idx) => (
              <View key={`${m._id || idx}-ai`} style={styles.messageBubbleAi}>
                <Text style={styles.messageText}>{m.content}</Text>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => navigation.navigate('MainTabs')}
          activeOpacity={0.85}
        >
          <LinearGradient colors={COLORS.gradientOrange} style={styles.doneGradient}>
            <Text style={styles.doneText}>Done</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingTop: 60, paddingBottom: SPACING.xxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  headerTextWrap: { flex: 1 },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  statsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.small,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.surfaceLight,
  },
  statChipText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontWeight: '600' },
  section: { marginTop: SPACING.md },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  messageBubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary + '20',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.xs,
    maxWidth: '90%',
  },
  messageBubbleAi: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.xs,
    maxWidth: '90%',
  },
  messageText: { fontSize: FONT_SIZES.sm, color: COLORS.text },
  emptyText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  doneButton: {
    marginTop: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  doneGradient: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  doneText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
});

export default RoleplaySummaryScreen;

