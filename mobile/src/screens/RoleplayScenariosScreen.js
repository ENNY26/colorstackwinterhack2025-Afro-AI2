import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/colors';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { MAKING_FRIENDS_SCENARIOS } from '../constants/roleplayScenarios';

const SCENARIOS_BY_CATEGORY = {
  making_friends: MAKING_FRIENDS_SCENARIOS,
};

const RoleplayScenariosScreen = ({ navigation, route }) => {
  const { colors: COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { plan, category, language, personality, sessionMinutes } = route.params || {};
  const langName = plan?.languageName || language?.name || 'Yoruba';
  const headerTitle = category?.scenarioCategoryLabel || 'CHOOSE A SCENARIO';
  const scenarios = SCENARIOS_BY_CATEGORY[category?.id] || [];

  const handleChoose = (scenario) => {
    navigation.replace('MainTabs', {
      screen: 'Conversation',
      params: {
        language,
        personality,
        conversationType: scenario.id,
        sessionMinutes,
      },
    });
  };

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleChoose(item)}
      activeOpacity={0.85}
    >
      <View style={styles.cardLeft}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{index + 1}</Text>
        </View>
        <View style={styles.iconWrap}>
          <Ionicons name={item.icon} size={26} color={COLORS.primary} />
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.cardTitle}>{item.label}</Text>
          <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
        </View>
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
      <View style={styles.headerBlock}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.categoryPill}>{headerTitle}</Text>
            <Text style={styles.title}>Pick a scene</Text>
            <Text style={styles.subtitle}>
              Four ways to practice “making friends” in {langName}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.viewSummariesBar}
          onPress={() => navigation.navigate('RoleplayHistory')}
          activeOpacity={0.85}
        >
          <Ionicons name="list-outline" size={22} color={COLORS.primary} style={styles.viewSummariesIcon} />
          <Text style={styles.viewSummariesBarText}>View summaries</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={scenarios}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No scenarios for this category.</Text>
        }
      />
    </View>
  );
};

const makeStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerBlock: { paddingTop: 56, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  headerTopRow: { flexDirection: 'row', alignItems: 'flex-start' },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  headerContent: { flex: 1, paddingRight: SPACING.xs },
  viewSummariesBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  viewSummariesIcon: { marginRight: 10 },
  viewSummariesBarText: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.primary },
  categoryPill: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, lineHeight: 22 },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: SPACING.sm },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  badgeText: { fontSize: FONT_SIZES.xs, fontWeight: '800', color: COLORS.primary },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  textBlock: { flex: 1 },
  cardTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  cardSubtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted, lineHeight: 20 },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.lg },
});

export default RoleplayScenariosScreen;
