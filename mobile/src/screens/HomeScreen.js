import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/colors';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { getGreetingForLanguage, getRandomFunFact } from '../constants/homeGreetings';
import { conversationAPI, vocabularyAPI, languagesAPI, userAPI } from '../services';
import { navigateRootStack } from '../navigation/navigationHelpers';

const { width } = Dimensions.get('window');

/** Used when the languages API fails so Tutor/Roleplay are not left `disabled` forever. */
const FALLBACK_HOME_LANGUAGE = {
  id: 'yoruba',
  name: 'Yoruba',
  flag: '🇳🇬',
};

const HomeScreen = ({ navigation, route }) => {
  const { colors: COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const plan = route.params?.plan;
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [recentConversations, setRecentConversations] = useState([]);
  const [learnedWordsCount, setLearnedWordsCount] = useState(0);
  const [practiceStreak, setPracticeStreak] = useState(0);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [funFact] = useState(() => getRandomFunFact());
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (plan?.language && plan?.languageName && !selectedLanguage) {
      setSelectedLanguage({
        id: plan.language,
        name: plan.languageName,
        flag: plan.flag || '🇳🇬',
      });
    }
  }, [plan]);

  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver,
      }),
    ]).start();
    
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const vocabLangId =
        plan?.language || selectedLanguage?.id || 'yoruba';

      const [languagesResult, conversationsResult, vocabResult, userStatsResult] =
        await Promise.allSettled([
          languagesAPI.getAll(),
          conversationAPI.getConversations({ limit: 3 }),
          vocabularyAPI.getStats(vocabLangId),
          userAPI.getStats(),
        ]);

      if (
        languagesResult.status === 'fulfilled' &&
        languagesResult.value.success &&
        languagesResult.value.data?.languages?.length
      ) {
        const langs = languagesResult.value.data.languages;
        setLanguages(langs);
        setSelectedLanguage((prev) => prev || langs[0]);
      }

      if (
        conversationsResult.status === 'fulfilled' &&
        conversationsResult.value.success &&
        conversationsResult.value.data?.conversations
      ) {
        setRecentConversations(conversationsResult.value.data.conversations);
      }

      if (
        vocabResult.status === 'fulfilled' &&
        vocabResult.value.success &&
        vocabResult.value.data?.stats?.[0]
      ) {
        setLearnedWordsCount(vocabResult.value.data.stats[0].totalWords || 0);
      }

      if (
        userStatsResult.status === 'fulfilled' &&
        userStatsResult.value.success &&
        userStatsResult.value.data?.stats
      ) {
        setPracticeStreak(userStatsResult.value.data.stats.streak || 0);
      }
    } catch (err) {
      console.error('Failed to load home screen data:', err);
    } finally {
      setLoading(false);
      setSelectedLanguage((prev) => {
        if (prev) return prev;
        if (plan?.language && plan?.languageName) {
          return {
            id: plan.language,
            name: plan.languageName,
            flag: plan.flag || '🇳🇬',
          };
        }
        return FALLBACK_HOME_LANGUAGE;
      });
    }
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundLight]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
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
            <Text style={styles.greeting}>
              {selectedLanguage ? getGreetingForLanguage(selectedLanguage.id).native + ' 👋' : 'Hello! 👋'}
            </Text>
            <Text style={styles.greetingTranslation}>
              {selectedLanguage ? getGreetingForLanguage(selectedLanguage.id).english : 'Welcome back'}
            </Text>
          </View>
          {selectedLanguage && (
            <View style={styles.languageBadge}>
              <Text style={styles.languageFlag}>{selectedLanguage.flag || '🇳🇬'}</Text>
              <Text style={styles.languageName}>{selectedLanguage.name}</Text>
            </View>
          )}
          </View>

          <TouchableOpacity
            style={styles.streakBanner}
            activeOpacity={0.8}
            onPress={() => navigateRootStack(navigation, 'StreakStats')}
          >
            <Ionicons name="flame" size={28} color={COLORS.text} />
            <View style={styles.streakTextWrap}>
              <Text style={styles.streakValue}>{loading ? '...' : practiceStreak}</Text>
              <Text style={styles.streakLabel}>day streak</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{loading ? '...' : learnedWordsCount}</Text>
              <Text style={styles.statLabel}>Words Learned</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{loading ? '...' : recentConversations.length}</Text>
              <Text style={styles.statLabel}>Conversations</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Fun fact */}
      <Animated.View style={[styles.funFactCard, { opacity: fadeAnim }]}>
        <View style={styles.funFactIconWrap}>
          <Ionicons name="bulb" size={22} color={COLORS.primary} />
        </View>
        <Text style={styles.funFactLabel}>Did you know?</Text>
        <Text style={styles.funFactText}>{funFact}</Text>
      </Animated.View>

      {/* Start Roleplay – main CTA (links to conversation/roleplay flow) */}
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
          onPress={() => {
            const lang = selectedLanguage || FALLBACK_HOME_LANGUAGE;
            const planForRoleplay = plan || {
              language: lang.id,
              languageName: lang.name,
              flag: lang.flag,
            };
            navigateRootStack(navigation, 'RoleplayCategories', { plan: planForRoleplay });
          }}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={COLORS.gradientOrange}
            style={styles.quickStartGradient}
          >
            <View style={styles.quickStartContent}>
              <View style={styles.quickStartIcon}>
                <Ionicons name="chatbubbles" size={32} color={COLORS.text} />
              </View>
              <View style={styles.quickStartText}>
                <Text style={styles.quickStartTitle}>Start Roleplay</Text>
                <Text style={styles.quickStartSubtitle}>
                  {loading
                    ? 'Loading...'
                    : `Pick a scenario & chat in ${(selectedLanguage || FALLBACK_HOME_LANGUAGE).name}`}
                </Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={32} color={COLORS.text} />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Start Tutor Mode – secondary CTA */}
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
          onPress={() => {
            const lang = selectedLanguage || FALLBACK_HOME_LANGUAGE;
            const planForTutor = plan || {
              language: lang.id,
              languageName: lang.name,
              flag: lang.flag,
            };
            navigateRootStack(navigation, 'TutorCategories', { plan: planForTutor });
          }}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={COLORS.gradientOrange}
            style={styles.quickStartGradient}
          >
            <View style={styles.quickStartContent}>
              <View style={styles.quickStartIcon}>
                <Ionicons name="school" size={32} color={COLORS.text} />
              </View>
              <View style={styles.quickStartText}>
                <Text style={styles.quickStartTitle}>Start Tutor Mode</Text>
                <Text style={styles.quickStartSubtitle}>
                  {loading
                    ? 'Loading...'
                    : `Structured lessons in ${(selectedLanguage || FALLBACK_HOME_LANGUAGE).name}`}
                </Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={32} color={COLORS.text} />
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
            onPress={() => navigateRootStack(navigation, 'History')}
          >
            <LinearGradient
              colors={[COLORS.success + '30', COLORS.success + '10']}
              style={styles.progressCardGradient}
            >
              <View style={styles.progressIconContainer}>
                <Ionicons name="chatbubbles" size={24} color={COLORS.success} />
              </View>
              <Text style={styles.progressValue}>{loading ? '...' : recentConversations.length}</Text>
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
          <TouchableOpacity onPress={() => navigateRootStack(navigation, 'History')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        ) : recentConversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No recent conversations. Start practicing to see your activity here!</Text>
          </View>
        ) : (
          recentConversations.map((conversation) => (
            <TouchableOpacity
              key={conversation.id}
              style={styles.activityCard}
              onPress={() => navigation.navigate('Conversation', { 
                language: { id: conversation.language, name: conversation.languageName || conversation.language, flag: conversation.flag || '🇳🇬' },
                conversationId: conversation.id 
              })}
            >
              <View style={styles.activityIcon}>
                <Text style={styles.activityFlag}>{conversation.flag || '🇳🇬'}</Text>
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{conversation.languageName || conversation.language} Practice</Text>
                <Text style={styles.activitySubtitle} numberOfLines={1}>
                  {conversation.lastMessage?.content || conversation.preview || 'No messages yet'}
                </Text>
              </View>
              <View style={styles.activityMeta}>
                <Text style={styles.activityDuration}>
                  {conversation.duration ? `${Math.round(conversation.duration)}m` : 'Recent'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Languages Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Explore Languages</Text>
          <TouchableOpacity onPress={() => navigateRootStack(navigation, 'LanguageSelection')}>
            <Text style={styles.seeAll}>Change</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.languagesScroll}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: SPACING.md }} />
          ) : languages.length === 0 ? (
            <Text style={styles.emptyText}>No languages available</Text>
          ) : (
            languages.slice(0, 5).map((lang) => (
              <TouchableOpacity
                key={lang.id}
                style={[
                  styles.languageChip,
                  lang.id === selectedLanguage?.id && styles.languageChipActive,
                ]}
                onPress={() => {
                  setSelectedLanguage(lang);
                  navigation.navigate('Conversation', { language: lang });
                }}
              >
                <Text style={styles.languageChipFlag}>{lang.flag || '🇳🇬'}</Text>
                <Text
                  style={[
                    styles.languageChipName,
                    lang.id === selectedLanguage?.id && styles.languageChipNameActive,
                  ]}
                >
                  {lang.name}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </ScrollView>
  );
};

const makeStyles = (COLORS) => StyleSheet.create({
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
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  streakTextWrap: { marginLeft: SPACING.sm },
  streakValue: { fontSize: FONT_SIZES.xl, fontWeight: 'bold', color: COLORS.text },
  streakLabel: { fontSize: FONT_SIZES.xs, color: COLORS.text, opacity: 0.9 },
  funFactCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  funFactIconWrap: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
  },
  funFactLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  funFactText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
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
  loadingContainer: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default HomeScreen;
