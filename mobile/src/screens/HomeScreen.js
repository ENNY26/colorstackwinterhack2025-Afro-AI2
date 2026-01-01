import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/colors';
import { AFRICAN_LANGUAGES, CONVERSATION_HISTORY, VOCABULARY_DATA } from '../constants/mockData';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [selectedLanguage] = useState(AFRICAN_LANGUAGES[0]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const recentConversations = CONVERSATION_HISTORY.slice(0, 3);
  const learnedWordsCount = VOCABULARY_DATA.length;
  const practiceStreak = 5;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundLight]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header Section */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={COLORS.gradientOrange}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Ẹ kú àárọ̀! 👋</Text>
              <Text style={styles.greetingTranslation}>Good morning!</Text>
            </View>
            <View style={styles.languageBadge}>
              <Text style={styles.languageFlag}>{selectedLanguage.flag}</Text>
              <Text style={styles.languageName}>{selectedLanguage.name}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{learnedWordsCount}</Text>
              <Text style={styles.statLabel}>Words Learned</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{practiceStreak}</Text>
              <Text style={styles.statLabel}>Day Streak 🔥</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{recentConversations.length}</Text>
              <Text style={styles.statLabel}>Conversations</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Quick Start Card */}
      <Animated.View
        style={[
          styles.quickStartCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.quickStartButton}
          onPress={() => navigation.navigate('Conversation', { language: selectedLanguage })}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[COLORS.surface, COLORS.surfaceLight]}
            style={styles.quickStartGradient}
          >
            <View style={styles.quickStartContent}>
              <View style={styles.quickStartIcon}>
                <Ionicons name="mic" size={32} color={COLORS.primary} />
              </View>
              <View style={styles.quickStartText}>
                <Text style={styles.quickStartTitle}>Start Practicing</Text>
                <Text style={styles.quickStartSubtitle}>
                  Continue learning {selectedLanguage.name}
                </Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={32} color={COLORS.primary} />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Progress Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Progress</Text>
        </View>
        <View style={styles.progressCards}>
          <TouchableOpacity
            style={styles.progressCard}
            onPress={() => navigation.navigate('Vocabulary')}
          >
            <LinearGradient
              colors={[COLORS.accent + '30', COLORS.accent + '10']}
              style={styles.progressCardGradient}
            >
              <View style={styles.progressIconContainer}>
                <Ionicons name="book" size={24} color={COLORS.accent} />
              </View>
              <Text style={styles.progressValue}>{learnedWordsCount}</Text>
              <Text style={styles.progressLabel}>Vocabulary</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.progressCard}
            onPress={() => navigation.navigate('History')}
          >
            <LinearGradient
              colors={[COLORS.success + '30', COLORS.success + '10']}
              style={styles.progressCardGradient}
            >
              <View style={styles.progressIconContainer}>
                <Ionicons name="chatbubbles" size={24} color={COLORS.success} />
              </View>
              <Text style={styles.progressValue}>{CONVERSATION_HISTORY.length}</Text>
              <Text style={styles.progressLabel}>Sessions</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.progressCard}>
            <LinearGradient
              colors={[COLORS.info + '30', COLORS.info + '10']}
              style={styles.progressCardGradient}
            >
              <View style={styles.progressIconContainer}>
                <Ionicons name="trending-up" size={24} color={COLORS.info} />
              </View>
              <Text style={styles.progressValue}>B1</Text>
              <Text style={styles.progressLabel}>Level</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => navigation.navigate('History')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {recentConversations.map((conversation, index) => (
          <TouchableOpacity
            key={conversation.id}
            style={styles.activityCard}
            onPress={() => navigation.navigate('Conversation', { language: selectedLanguage })}
          >
            <View style={styles.activityIcon}>
              <Text style={styles.activityFlag}>{conversation.flag}</Text>
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>{conversation.languageName} Practice</Text>
              <Text style={styles.activitySubtitle} numberOfLines={1}>
                {conversation.preview}
              </Text>
            </View>
            <View style={styles.activityMeta}>
              <Text style={styles.activityDuration}>{conversation.duration}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Languages Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Explore Languages</Text>
          <TouchableOpacity onPress={() => navigation.navigate('LanguageSelection')}>
            <Text style={styles.seeAll}>Change</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.languagesScroll}
        >
          {AFRICAN_LANGUAGES.slice(0, 5).map((lang) => (
            <TouchableOpacity
              key={lang.id}
              style={[
                styles.languageChip,
                lang.id === selectedLanguage.id && styles.languageChipActive,
              ]}
              onPress={() =>
                navigation.navigate('Conversation', { language: lang })
              }
            >
              <Text style={styles.languageChipFlag}>{lang.flag}</Text>
              <Text
                style={[
                  styles.languageChipName,
                  lang.id === selectedLanguage.id && styles.languageChipNameActive,
                ]}
              >
                {lang.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  headerGradient: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.large,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  greeting: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  greetingTranslation: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    opacity: 0.8,
    marginTop: 4,
  },
  languageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    gap: SPACING.xs,
  },
  languageFlag: {
    fontSize: 20,
  },
  languageName: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text,
    opacity: 0.8,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  quickStartCard: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  quickStartButton: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  quickStartGradient: {
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickStartContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  quickStartIcon: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickStartText: {
    flex: 1,
  },
  quickStartTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  quickStartSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  seeAll: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  progressCards: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  progressCard: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  progressCardGradient: {
    padding: SPACING.md,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressIconContainer: {
    marginBottom: SPACING.sm,
  },
  progressValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  progressLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  activityFlag: {
    fontSize: 24,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  activityMeta: {
    alignItems: 'flex-end',
  },
  activityDuration: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  languagesScroll: {
    paddingVertical: SPACING.xs,
    gap: SPACING.sm,
  },
  languageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.round,
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  languageChipActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  languageChipFlag: {
    fontSize: 20,
  },
  languageChipName: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  languageChipNameActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default HomeScreen;
