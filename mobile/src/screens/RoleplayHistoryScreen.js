import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/colors';
import { ROLEPLAY_CATEGORIES } from '../constants/roleplayCategories';
import { getRoleplayDisplayLabel } from '../constants/roleplayScenarios';
import { getRoleplaySessions } from '../services/roleplayHistory';

function formatSessionDate(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return String(ts);
  }
}

function scenarioLabelForType(conversationType) {
  return (
    getRoleplayDisplayLabel(conversationType) ||
    ROLEPLAY_CATEGORIES.find((c) => c.id === conversationType)?.label ||
    'Roleplay'
  );
}

const RoleplayHistoryScreen = ({ navigation }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSessions(await getRoleplaySessions());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openSession = (item) => {
    navigation.navigate('RoleplaySummary', {
      summary: item.summary,
      userMessages: item.userMessages,
      aiMessages: item.aiMessages,
      language: item.language,
      conversationType: item.conversationType,
      fromHistory: true,
    });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => openSession(item)}
      activeOpacity={0.85}
    >
      <View style={styles.cardIcon}>
        <Ionicons name="document-text" size={22} color={COLORS.primary} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {scenarioLabelForType(item.conversationType)}
        </Text>
        <Text style={styles.cardMeta}>
          {item.language?.name || item.language?.id || 'Yoruba'} · {formatSessionDate(item.savedAt)}
        </Text>
        {item.summary?.sessionReview ? (
          <Text style={styles.cardPreview} numberOfLines={2}>
            {item.summary.sessionReview}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundLight]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Past roleplay sessions</Text>
          <Text style={styles.subtitle}>
            Open any summary you saved on this device
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="time-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No saved summaries yet</Text>
              <Text style={styles.emptyText}>
                When you end a roleplay, tap "Save summary" on the session screen to store it here. Use
                "View summaries" from Roleplay mode to open this list.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  headerContent: { flex: 1 },
  title: { fontSize: FONT_SIZES.xxl, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.xs },
  subtitle: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, lineHeight: 22 },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  cardBody: { flex: 1, marginRight: SPACING.sm },
  cardTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  cardMeta: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted, marginBottom: 6 },
  cardPreview: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { alignItems: 'center', paddingVertical: SPACING.xxl, paddingHorizontal: SPACING.lg },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptyText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
});

export default RoleplayHistoryScreen;
