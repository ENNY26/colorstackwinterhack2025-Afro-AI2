import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Animated,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/colors';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { vocabularyAPI, audioAPI, authAPI } from '../services';
import { Alert } from 'react-native';

const TABS = ['All', 'New', 'Recent', 'Favorites'];

// Display metadata for the language selector chips.
const LANG_META = {
  yoruba: { name: 'Yoruba', flag: '🇳🇬' },
  swahili: { name: 'Swahili', flag: '🇰🇪' },
  hausa: { name: 'Hausa', flag: '🇳🇬' },
  zulu: { name: 'Zulu', flag: '🇿🇦' },
  amharic: { name: 'Amharic', flag: '🇪🇹' },
  igbo: { name: 'Igbo', flag: '🇳🇬' },
  xhosa: { name: 'Xhosa', flag: '🇿🇦' },
  akan: { name: 'Akan', flag: '🇬🇭' },
};
const getLangMeta = (id) =>
  LANG_META[id] || {
    name: id ? id.charAt(0).toUpperCase() + id.slice(1) : 'Language',
    flag: '🌍',
  };

// A word is "new & useful" until it has been practiced enough to start sticking.
// masteryLevel: 0 = brand new, 5 = mastered. We surface 0–1 in the New tab.
const NEW_MASTERY_MAX = 1;
const getWordId = (item) => item?._id || item?.id || null;
const getMastery = (item) => {
  const m = Number(item?.masteryLevel);
  return Number.isFinite(m) ? m : 0;
};
const isNewWord = (item) => getMastery(item) <= NEW_MASTERY_MAX;

const VocabularyScreen = ({ navigation }) => {
  const { colors: COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [vocabularyList, setVocabularyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingId, setMarkingId] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [availableLanguages, setAvailableLanguages] = useState([]);

  useEffect(() => {
    initLanguages();
  }, []);

  useEffect(() => {
    if (selectedLanguage) {
      loadVocabulary();
    }
  }, [selectedLanguage]);

  // Figure out which languages the user has words in, and which one to show
  // first (their current learning language), so Swahili (and others) appear
  // here too — not just Yoruba.
  const initLanguages = async () => {
    let defaultLang = 'yoruba';
    let langsWithWords = [];
    try {
      const [statsRes, storedUser] = await Promise.all([
        vocabularyAPI.getStats().catch(() => null),
        authAPI.getStoredUser().catch(() => null),
      ]);

      if (statsRes?.success && Array.isArray(statsRes.data?.stats)) {
        langsWithWords = statsRes.data.stats
          .filter((s) => s && s._id && (s.totalWords || 0) > 0)
          .sort((a, b) => (b.totalWords || 0) - (a.totalWords || 0))
          .map((s) => s._id);
      }

      if (storedUser?.selectedLanguage) {
        defaultLang = storedUser.selectedLanguage;
      } else if (langsWithWords.length) {
        defaultLang = langsWithWords[0];
      }
    } catch (err) {
      console.warn('Failed to init vocab languages:', err?.message);
    }

    const ordered = [];
    const pushUnique = (id) => {
      if (id && !ordered.includes(id)) ordered.push(id);
    };
    pushUnique(defaultLang);
    langsWithWords.forEach(pushUnique);

    setAvailableLanguages(ordered);
    setSelectedLanguage(defaultLang);
  };

  const loadVocabulary = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await vocabularyAPI.getVocabulary({ language: selectedLanguage });
      
      if (result.success && result.data.vocabulary) {
        // Ensure vocabulary is an array
        const vocabulary = Array.isArray(result.data.vocabulary) 
          ? result.data.vocabulary 
          : [];
        setVocabularyList(vocabulary);
      } else {
        setError('Failed to load vocabulary');
        setVocabularyList([]);
      }
    } catch (err) {
      console.error('Failed to load vocabulary:', err);
      setError('Failed to load vocabulary. Please try again.');
      setVocabularyList([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredVocabulary = useMemo(() => {
    // Ensure vocabularyList is an array
    if (!Array.isArray(vocabularyList)) {
      return [];
    }
    
    let filtered = [...vocabularyList];

    // Filter by tab
    if (activeTab === 'New') {
      filtered = filtered
        .filter((word) => word && isNewWord(word))
        .sort(
          (a, b) =>
            new Date(b.learnedAt || b.createdAt || 0) -
            new Date(a.learnedAt || a.createdAt || 0)
        );
    } else if (activeTab === 'Recent') {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((word) => {
        if (!word) return false;
        const learnedDate = word.learnedAt || word.createdAt;
        return learnedDate && new Date(learnedDate) >= oneWeekAgo;
      });
    } else if (activeTab === 'Favorites') {
      filtered = filtered.filter((word) => word && word.isFavorite === true);
    }

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(
        (word) =>
          word &&
          ((word.word && word.word.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (word.translation && word.translation.toLowerCase().includes(searchQuery.toLowerCase())))
      );
    }

    return filtered;
  }, [vocabularyList, activeTab, searchQuery]);

  const newCount = useMemo(
    () =>
      Array.isArray(vocabularyList)
        ? vocabularyList.filter((w) => w && isNewWord(w)).length
        : 0,
    [vocabularyList]
  );

  // Optimistically flip the star, then reconcile with the server. Reverts on
  // failure so the UI never lies about favorite state.
  const toggleFavorite = async (item) => {
    const wordId = getWordId(item);
    if (!wordId) {
      Alert.alert('Error', 'Cannot toggle favorite: Word ID is missing.');
      return;
    }

    const previous = !!item.isFavorite;
    const setFavoriteFor = (id, value) =>
      setVocabularyList((list) =>
        list.map((w) => (getWordId(w) === id ? { ...w, isFavorite: value } : w))
      );

    setFavoriteFor(wordId, !previous);

    try {
      const result = await vocabularyAPI.toggleFavorite(wordId);
      const serverFavorite = result?.data?.isFavorite;
      if (!result?.success) {
        setFavoriteFor(wordId, previous);
        Alert.alert('Error', 'Failed to update favorite status. Please try again.');
      } else if (serverFavorite != null) {
        setFavoriteFor(wordId, serverFavorite);
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      setFavoriteFor(wordId, previous);
      Alert.alert('Error', 'Failed to update favorite status. Please try again.');
    }
  };

  // Record a correct review, advancing the word's mastery so it graduates out
  // of the New tab once it sticks (masteryLevel > NEW_MASTERY_MAX).
  const handleMarkLearned = async (item) => {
    const wordId = getWordId(item);
    if (!wordId) {
      Alert.alert('Error', 'Cannot update this word: ID is missing.');
      return;
    }
    try {
      setMarkingId(wordId);
      const result = await vocabularyAPI.recordReview(wordId, true);
      if (result?.success) {
        const newLevel = result?.data?.masteryLevel;
        setVocabularyList((prev) =>
          prev.map((w) =>
            getWordId(w) === wordId
              ? { ...w, masteryLevel: newLevel != null ? newLevel : getMastery(w) + 1 }
              : w
          )
        );
      }
    } catch (err) {
      console.error('Failed to mark word as practiced:', err);
      Alert.alert('Error', 'Could not save your progress. Please try again.');
    } finally {
      setMarkingId(null);
    }
  };

  const playPronunciation = async (word) => {
    try {
      const result = await audioAPI.pronounce(word.word, word.language || selectedLanguage);
      if (result.success && result.data.audioUrl) {
        // Play audio using Audio API
        const { Audio } = require('expo-av');
        const { sound } = await Audio.Sound.createAsync({ uri: result.data.audioUrl });
        await sound.playAsync();
      }
    } catch (err) {
      console.error('Failed to play pronunciation:', err);
      Alert.alert('Error', 'Failed to play pronunciation. Please try again.');
    }
  };

  const formatLearnedDate = (date) => {
    if (!date) return 'Unknown';
    const now = new Date();
    const learnedDate = new Date(date);
    const diffDays = Math.floor((now - learnedDate) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const renderTab = (tab) => {
    const isActive = activeTab === tab;
    const showBadge = tab === 'New' && newCount > 0;
    return (
      <TouchableOpacity
        key={tab}
        style={[styles.tab, isActive && styles.tabActive]}
        onPress={() => setActiveTab(tab)}
      >
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
          {tab}
        </Text>
        {showBadge && (
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>{newCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderMasteryDots = (mastery) => (
    <View style={styles.masteryRow}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={[styles.masteryDot, i < mastery && styles.masteryDotFilled]}
        />
      ))}
    </View>
  );

  const renderVocabularyCard = ({ item, index }) => {
    // Guard against invalid items
    if (!item) {
      return null;
    }

    const wordId = getWordId(item);
    const mastery = getMastery(item);
    const wordIsNew = isNewWord(item);
    const isMarking = markingId && markingId === wordId;

    return (
      <Animated.View style={styles.cardWrapper}>
        <View style={[styles.vocabCard, wordIsNew && styles.vocabCardNew]}>
          <View style={styles.cardLeft}>
            <View style={styles.wordRow}>
              <Text style={styles.wordText}>{item.word || 'Unknown'}</Text>
              {wordIsNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              )}
            </View>
            <Text style={styles.translationText}>{item.translation || 'No translation'}</Text>
            <View style={styles.cardMeta}>
              <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
              <Text style={styles.metaText}>
                Learned {formatLearnedDate(item.learnedAt || item.createdAt)}
              </Text>
            </View>
            {renderMasteryDots(mastery)}
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => playPronunciation(item)}
            >
              <Ionicons name="volume-medium" size={22} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => toggleFavorite(item)}
              accessibilityLabel={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Ionicons
                name={item.isFavorite ? 'star' : 'star-outline'}
                size={22}
                color={item.isFavorite ? COLORS.accent : COLORS.textMuted}
              />
            </TouchableOpacity>
            {wordIsNew && (
              <TouchableOpacity
                style={[styles.actionButton, styles.gotItButton]}
                onPress={() => handleMarkLearned(item)}
                disabled={!!isMarking}
              >
                {isMarking ? (
                  <ActivityIndicator size="small" color={COLORS.success || COLORS.primary} />
                ) : (
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={22}
                    color={COLORS.success || COLORS.primary}
                  />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="book-outline" size={64} color={COLORS.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>
        {activeTab === 'Favorites'
          ? 'No favorites yet'
          : activeTab === 'New'
          ? 'No new words yet'
          : activeTab === 'Recent'
          ? 'No recent words'
          : 'Start a conversation to build your vocabulary!'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'Favorites'
          ? 'Tap the star icon on words to add them here'
          : activeTab === 'New'
          ? 'New, useful words from your conversations show up here. Tap the check to mark them as you learn them.'
          : activeTab === 'Recent'
          ? 'Your recently learned words will appear here'
          : 'Words you learn during conversations will be saved here'}
      </Text>
      {(activeTab === 'All' || activeTab === 'New') && (
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => navigation.navigate('Conversation')}
        >
          <LinearGradient
            colors={COLORS.gradientOrange}
            style={styles.startButtonGradient}
          >
            <Ionicons name="chatbubbles" size={20} color={COLORS.text} />
            <Text style={styles.startButtonText}>Start Conversation</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundLight]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vocabulary Library</Text>
        <Text style={styles.headerSubtitle}>
          {loading ? 'Loading...' : `${vocabularyList.length} words learned`}
        </Text>
      </View>

      {/* Language selector — only when the user has words in more than one language */}
      {availableLanguages.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.langScroll}
          contentContainerStyle={styles.langContainer}
        >
          {availableLanguages.map((langId) => {
            const meta = getLangMeta(langId);
            const isActive = selectedLanguage === langId;
            return (
              <TouchableOpacity
                key={langId}
                style={[styles.langChip, isActive && styles.langChipActive]}
                onPress={() => setSelectedLanguage(langId)}
              >
                <Text style={styles.langChipFlag}>{meta.flag}</Text>
                <Text style={[styles.langChipText, isActive && styles.langChipTextActive]}>
                  {meta.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search vocabulary..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContainer}
      >
        {TABS.map(renderTab)}
      </ScrollView>

      {/* Vocabulary List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading vocabulary...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadVocabulary}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredVocabulary}
          renderItem={renderVocabularyCard}
          keyExtractor={(item, index) => {
            // Handle cases where id might be undefined or null
            const id = getWordId(item);
            if (id != null) {
              return String(id);
            }
            // Fallback to index and word combination for unique key
            return `vocab-${index}-${item?.word || 'unknown'}-${item?.translation || ''}`;
          }}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          refreshing={loading}
          onRefresh={loadVocabulary}
        />
      )}
    </View>
  );
};

const makeStyles = (COLORS) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  langScroll: {
    flexGrow: 0,
    marginBottom: SPACING.md,
  },
  langContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  langChipActive: {
    backgroundColor: COLORS.surfaceLight,
    borderColor: COLORS.primary,
  },
  langChipFlag: {
    fontSize: FONT_SIZES.md,
  },
  langChipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  langChipTextActive: {
    color: COLORS.text,
  },
  tabsScroll: {
    flexGrow: 0,
    marginBottom: SPACING.md,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.text,
  },
  tabBadge: {
    marginLeft: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
  },
  listContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  cardWrapper: {
    marginBottom: SPACING.md,
  },
  vocabCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  vocabCardNew: {
    borderColor: COLORS.accent,
  },
  cardLeft: {
    flex: 1,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  wordText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  newBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.accent,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: COLORS.text,
  },
  masteryRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: SPACING.sm,
  },
  masteryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  masteryDotFilled: {
    backgroundColor: COLORS.success || COLORS.primary,
  },
  gotItButton: {
    backgroundColor: COLORS.surfaceLight,
  },
  translationText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  cardActions: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: SPACING.md,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  startButton: {
    overflow: 'hidden',
    borderRadius: BORDER_RADIUS.lg,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  startButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
  },
  errorText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.round,
  },
  retryButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});

export default VocabularyScreen;


