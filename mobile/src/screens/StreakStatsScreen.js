import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/colors';
import { userAPI } from '../services';

const StreakStatsScreen = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const result = await userAPI.getStats();
        if (result.success && result.data.stats) {
          setStats(result.data.stats);
        }
      } catch (err) {
        console.error('Failed to load streak stats:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const currentStreak = stats?.currentStreak || 0;
  const longestStreak = stats?.longestStreak || 0;

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const startStreakDate =
    currentStreak > 0
      ? new Date(today.getFullYear(), today.getMonth(), today.getDate() - (currentStreak - 1))
      : null;

  const cells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(day);
  }

  const isDayInStreak = (day) => {
    if (!startStreakDate || currentStreak <= 0) return false;
    const date = new Date(year, month, day);
    return date >= startStreakDate && date <= today;
  };

  const milestones = [7, 14, 21, 30, 60, 90];
  const nextMilestone = milestones.find((m) => m > currentStreak) || null;
  const daysToNext = nextMilestone ? Math.max(nextMilestone - currentStreak, 0) : 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundLight]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Your streak</Text>
      </View>

      <View style={styles.heroCard}>
        <LinearGradient
          colors={COLORS.gradientOrange}
          style={styles.heroGradient}
        >
          <View style={styles.heroContent}>
            <Ionicons name="flame" size={40} color={COLORS.text} />
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroValue}>
                {loading ? '...' : currentStreak}
              </Text>
              <Text style={styles.heroLabel}>day streak</Text>
              <Text style={styles.heroSubLabel}>
                Best streak: {longestStreak} days
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.milestoneCard}>
        <Text style={styles.milestoneTitle}>Next milestone</Text>
        {nextMilestone && daysToNext > 0 ? (
          <Text style={styles.milestoneText}>
            {daysToNext} more day{daysToNext === 1 ? '' : 's'} to reach{' '}
            {nextMilestone}-day streak
          </Text>
        ) : (
          <Text style={styles.milestoneText}>
            Keep going—you're building an amazing habit!
          </Text>
        )}
      </View>

      <View style={styles.calendarCard}>
        <Text style={styles.calendarTitle}>This month</Text>
        <View style={styles.weekHeader}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
            <Text key={d} style={styles.weekDay}>
              {d}
            </Text>
          ))}
        </View>
        <View style={styles.calendarGrid}>
          {cells.map((day, idx) => {
            if (day === null) {
              return <View key={`empty-${idx}`} style={styles.dayCell} />;
            }
            const inStreak = isDayInStreak(day);
            const isToday = day === today.getDate();
            return (
              <View
                key={day}
                style={[
                  styles.dayCell,
                  inStreak && styles.dayCellStreak,
                  isToday && styles.dayCellToday,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    (inStreak || isToday) && styles.dayTextActive,
                  ]}
                >
                  {day}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.lg, paddingTop: 60 },
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
  title: { fontSize: FONT_SIZES.xxl, fontWeight: 'bold', color: COLORS.text },
  heroCard: { marginBottom: SPACING.lg },
  heroGradient: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.large,
  },
  heroContent: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  heroTextWrap: { flex: 1 },
  heroValue: { fontSize: FONT_SIZES.xxxl, fontWeight: 'bold', color: COLORS.text },
  heroLabel: { fontSize: FONT_SIZES.md, color: COLORS.text },
  heroSubLabel: { fontSize: FONT_SIZES.sm, color: COLORS.text, opacity: 0.9, marginTop: 4 },
  milestoneCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.small,
  },
  milestoneTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  milestoneText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  calendarCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  calendarTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  weekDay: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, textAlign: 'center', flex: 1 },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  dayCellStreak: {
    backgroundColor: COLORS.primary + '25',
    borderRadius: BORDER_RADIUS.round,
  },
  dayCellToday: {
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  dayText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  dayTextActive: { color: COLORS.text, fontWeight: '600' },
});

export default StreakStatsScreen;

