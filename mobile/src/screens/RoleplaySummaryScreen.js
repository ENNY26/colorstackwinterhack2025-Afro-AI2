import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/colors';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { ROLEPLAY_CATEGORIES } from '../constants/roleplayCategories';
import { getRoleplayDisplayLabel } from '../constants/roleplayScenarios';
import { saveRoleplaySession } from '../services/roleplayHistory';

const RoleplaySummaryScreen = ({ navigation, route }) => {
  const { colors: COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const {
    summary,
    userMessages = [],
    aiMessages = [],
    language,
    conversationType,
    fromHistory = false,
    conversationId = null,
  } = route.params || {};
  const [saveState, setSaveState] = useState(fromHistory ? 'saved' : 'idle');
  const [saving, setSaving] = useState(false);
  const langName = language?.name || 'Yoruba';
  const categoryLabel =
    getRoleplayDisplayLabel(conversationType) ||
    ROLEPLAY_CATEGORIES.find((c) => c.id === conversationType)?.label ||
    'Roleplay';

  const goToHistory = useCallback(() => {
    navigation.navigate('RoleplayHistory');
  }, [navigation]);

  const handleSaveSummary = useCallback(async () => {
    if (saveState === 'saved' || saving) return;
    setSaving(true);
    setSaveState('idle');
    try {
      const id = await saveRoleplaySession({
        conversationId,
        language,
        conversationType,
        summary,
        userMessages,
        aiMessages,
      });
      setSaveState(id ? 'saved' : 'error');
    } catch {
      setSaveState('error');
    } finally {
      setSaving(false);
    }
  }, [saveState, saving, conversationId, language, conversationType, summary, userMessages, aiMessages]);

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

        {!fromHistory && (
          <View style={styles.actionButtons}>
            <Text style={styles.hintText}>Save a copy on this device, or open your past roleplay summaries.</Text>
            <TouchableOpacity
              style={[styles.saveBtn, (saveState === 'saved' || saving) && styles.saveBtnDimmed]}
              onPress={handleSaveSummary}
              disabled={saveState === 'saved' && !saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <View style={styles.saveBtnInner}>
                  <Ionicons
                    name={saveState === 'saved' ? 'checkmark-circle' : 'save-outline'}
                    size={22}
                    color={COLORS.text}
                    style={styles.saveBtnIcon}
                  />
                  <Text style={styles.saveBtnText}>
                    {saveState === 'saved' ? 'Summary saved' : 'Save summary'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            {saveState === 'error' && (
              <Text style={styles.errorText}>Could not save. Try again.</Text>
            )}
            <TouchableOpacity
              style={styles.viewListBtn}
              onPress={goToHistory}
              activeOpacity={0.85}
            >
              <View style={styles.viewListBtnInner}>
                <Ionicons
                  name="list-outline"
                  size={20}
                  color={COLORS.primary}
                  style={styles.viewListIcon}
                />
                <Text style={styles.viewListBtnText}>View summaries</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {fromHistory && (
          <TouchableOpacity style={styles.viewListBtnWide} onPress={goToHistory} activeOpacity={0.85}>
            <View style={styles.viewListBtnInner}>
                <Ionicons name="list-outline" size={20} color={COLORS.primary} style={styles.viewListIcon} />
                <Text style={styles.viewListBtnText}>View summaries</Text>
              </View>
            </TouchableOpacity>
        )}

        {summary?.sessionReview ? (
          <View style={styles.reviewCard}>
            <Text style={styles.sectionTitle}>Coach notes</Text>
            <Text style={styles.reviewText}>{summary.sessionReview}</Text>
          </View>
        ) : null}

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
          onPress={() => {
            if (fromHistory) {
              navigation.goBack();
            } else {
              navigation.navigate('MainTabs');
            }
          }}
          activeOpacity={0.85}
        >
          <LinearGradient colors={COLORS.gradientOrange} style={styles.doneGradient}>
            <Text style={styles.doneText}>{fromHistory ? 'Back to list' : 'Done'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const makeStyles = (COLORS) => StyleSheet.create({
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
  reviewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
    ...SHADOWS.small,
  },
  reviewText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 22,
  },
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
  actionButtons: { marginBottom: SPACING.lg },
  hintText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  saveBtnInner: { flexDirection: 'row', alignItems: 'center' },
  saveBtnIcon: { marginRight: 10 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  saveBtnDimmed: { opacity: 0.9 },
  saveBtnText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    color: COLORS.text,
  },
  viewListBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  viewListIcon: { marginRight: 8 },
  viewListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
  },
  viewListBtnWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginBottom: SPACING.lg,
  },
  viewListBtnText: { fontSize: FONT_SIZES.md, fontWeight: '800', color: COLORS.primary },
  errorText: { fontSize: FONT_SIZES.sm, color: COLORS.error, marginTop: 4, marginBottom: 4, textAlign: 'center' },
});

export default RoleplaySummaryScreen;

