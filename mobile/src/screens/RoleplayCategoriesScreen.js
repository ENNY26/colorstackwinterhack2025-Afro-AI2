import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/colors';
import { ROLEPLAY_CATEGORIES } from '../constants/roleplayCategories';

const LANGUAGE_FLAGS = {
  yoruba: '🇳🇬',
  swahili: '🇹🇿',
  hausa: '🇳🇬',
  zulu: '🇿🇦',
  amharic: '🇪🇹',
  igbo: '🇳🇬',
  xhosa: '🇿🇦',
  akan: '🇬🇭',
};

const RoleplayCategoriesScreen = ({ navigation, route }) => {
  const { plan } = route.params || {};
  const langId = plan?.language || 'yoruba';
  const langName = plan?.languageName || 'Yoruba';
  const language = {
    id: langId,
    name: langName,
    flag: LANGUAGE_FLAGS[langId] || '🇳🇬',
  };
  const personality = plan?.personality ? { id: plan.personality } : { id: 'friendly' };
  const sessionMinutes = plan?.dailyGoal || 10;

  const handleChoose = (category) => {
    navigation.replace('MainTabs', {
      screen: 'Conversation',
      params: { language, personality, conversationType: category.id, sessionMinutes },
    });
  };

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleChoose(item)}
      activeOpacity={0.85}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={item.icon} size={28} color={COLORS.primary} />
      </View>
      <Text style={styles.cardTitle}>{item.label}</Text>
      <Text style={styles.cardSubtitle}>Roleplay in {langName}</Text>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} style={styles.chevron} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.backgroundLight]} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Roleplay Mode</Text>
          <Text style={styles.subtitle}>Pick a scenario to practice {langName} with the AI</Text>
        </View>
      </View>
      <FlatList
        data={ROLEPLAY_CATEGORIES}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
        contentContainerStyle={styles.list}
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

export default RoleplayCategoriesScreen;
