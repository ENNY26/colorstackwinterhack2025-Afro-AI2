import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/colors';
import { TUTOR_CATEGORIES } from '../constants/tutorPhrases';

const CATEGORY_ICONS = {
  Greetings: 'hand-left',
  Introductions: 'person',
  Numbers: 'calculator',
  Food: 'restaurant',
  Travel: 'airplane',
  Shopping: 'cart',
  Directions: 'navigate',
  Time: 'time',
  Family: 'people',
  Work: 'briefcase',
  Emergency: 'medkit',
  Phrases: 'chatbubbles',
  Questions: 'help-circle',
  Colors: 'color-palette',
  Weather: 'partly-sunny',
};

const TutorCategoriesScreen = ({ navigation, route }) => {
  const { plan } = route.params || {};
  const langName = plan?.languageName || plan?.language || 'Yoruba';

  // Use AI-generated categories from plan when available; fallback to static list
  const categories = useMemo(() => {
    const fromPlan = (plan?.lessons || []).map((l) => l.title).filter(Boolean);
    return fromPlan.length >= 10 ? fromPlan : TUTOR_CATEGORIES;
  }, [plan?.lessons]);

  const handleChoose = (category) => {
    navigation.navigate('TutorLesson', { plan, category });
  };

  const renderCategory = ({ item }) => {
    const icon = CATEGORY_ICONS[item] || 'book';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleChoose(item)}
        activeOpacity={0.85}
      >
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={28} color={COLORS.primary} />
        </View>
        <Text style={styles.cardTitle}>{item}</Text>
        <Text style={styles.cardSubtitle}>Practice {item.toLowerCase()}</Text>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} style={styles.chevron} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.backgroundLight]} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Tutor Mode</Text>
          <Text style={styles.subtitle}>Choose a category to start your {langName} lesson</Text>
        </View>
      </View>
      <FlatList
        data={categories}
        keyExtractor={(i) => i}
        renderItem={renderCategory}
        contentContainerStyle={styles.list}
        numColumns={1}
        showsVerticalScrollIndicator={false}
      />
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
  subtitle: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
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
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  cardTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text, flex: 1 },
  cardSubtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted, marginTop: 2 },
  chevron: { marginLeft: SPACING.sm },
});

export default TutorCategoriesScreen;
