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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/colors';
import { vocabularyAPI, audioAPI } from '../services';
import { Alert } from 'react-native';

const TABS = ['All', 'Recent', 'Favorites'];

const VocabularyScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [vocabularyList, setVocabularyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('yoruba');

  useEffect(() => {
    loadVocabulary();
  }, [selectedLanguage]);

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
    if (activeTab === 'Recent') {
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

  const toggleFavorite = async (wordId) => {
    try {
      const result = await vocabularyAPI.toggleFavorite(wordId);
      if (result.success) {
        // Reload vocabulary to get updated favorite status
        await loadVocabulary();
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      Alert.alert('Error', 'Failed to update favorite status. Please try again.');
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
    return (
      <TouchableOpacity
        key={tab}
        style={[styles.tab, isActive && styles.tabActive]}
        onPress={() => setActiveTab(tab)}
      >
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
          {tab}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderVocabularyCard = ({ item, index }) => {
    // Guard against invalid items
    if (!item) {
      return null;
    }
    
    return (
      <Animated.View style={styles.cardWrapper}>
        <View style={styles.vocabCard}>
          <View style={styles.cardLeft}>
            <Text style={styles.wordText}>{item.word || 'Unknown'}</Text>
            <Text style={styles.translationText}>{item.translation || 'No translation'}</Text>
            <View style={styles.cardMeta}>
              <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
              <Text style={styles.metaText}>
                Learned {formatLearnedDate(item.learnedAt || item.createdAt)}
              </Text>
            </View>
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
              onPress={() => {
                if (item?.id) {
                  toggleFavorite(item.id);
                } else {
                  Alert.alert('Error', 'Cannot toggle favorite: Word ID is missing');
                }
              }}
            >
              <Ionicons
                name={item.isFavorite ? 'star' : 'star-outline'}
                size={22}
                color={item.isFavorite ? COLORS.accent : COLORS.textMuted}
              />
            </TouchableOpacity>
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
          : activeTab === 'Recent'
          ? 'No recent words'
          : 'Start a conversation to build your vocabulary!'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'Favorites'
          ? 'Tap the star icon on words to add them here'
          : activeTab === 'Recent'
          ? 'Your recently learned words will appear here'
          : 'Words you learn during conversations will be saved here'}
      </Text>
      {activeTab === 'All' && (
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
      <View style={styles.tabsContainer}>
        {TABS.map(renderTab)}
      </View>

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
            if (item?.id != null) {
              return String(item.id);
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

const styles = StyleSheet.create({
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  tab: {
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
  cardLeft: {
    flex: 1,
  },
  wordText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
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


