import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/colors';
import { FALLBACK_AI_PERSONALITIES } from '../constants/mockData';
import { languagesAPI } from '../services';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.72;

const PersonalitySelectionScreen = ({ navigation, route }) => {
  const { language } = route.params || {};
  const [selectedPersonality, setSelectedPersonality] = useState(null);
  const [personalities, setPersonalities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);

  useEffect(() => {
    loadPersonalities();
  }, []);

  const loadPersonalities = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await languagesAPI.getPersonalities();

      if (result.success && result.data?.personalities?.length) {
        setPersonalities(result.data.personalities);
      } else {
        setPersonalities(FALLBACK_AI_PERSONALITIES);
        setError(null);
      }
    } catch (err) {
      console.warn('Personalities API failed, using offline list:', err?.message || err);
      setPersonalities(FALLBACK_AI_PERSONALITIES);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePersonalitySelect = (personality) => {
    console.log('Personality selected:', personality.name);
    setSelectedPersonality(personality);
  };

  const handleStartLearning = () => {
    if (selectedPersonality) {
      console.log('Starting learning with:', {
        language: language?.name,
        personality: selectedPersonality?.name,
      });
      // After selecting personality, run survey to personalize plan
      navigation.navigate('Survey', { language, personality: selectedPersonality });
    }
  };

  const renderPersonalityCard = (personality, index) => {
    const isSelected = selectedPersonality?.id === personality.id;
    const inputRange = [
      (index - 1) * (CARD_WIDTH + SPACING.md),
      index * (CARD_WIDTH + SPACING.md),
      (index + 1) * (CARD_WIDTH + SPACING.md),
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.9, 1, 0.9],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.6, 1, 0.6],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        key={personality.id}
        style={[
          styles.cardContainer,
          { transform: [{ scale }], opacity },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handlePersonalitySelect(personality)}
              style={[
                styles.personalityCard,
                isSelected && styles.personalityCardSelected,
                { borderColor: isSelected ? (personality.color || COLORS.primary) : 'transparent' },
              ]}
        >
          <LinearGradient
            colors={[(personality.color || COLORS.primary) + '20', (personality.color || COLORS.primary) + '05']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />

          <View style={styles.cardHeader}>
            <View
              style={[
                styles.emojiContainer,
                { backgroundColor: (personality.color || COLORS.primary) + '30' },
              ]}
            >
              <Text style={styles.emoji}>{personality.emoji || '😊'}</Text>
            </View>
            {isSelected && (
              <View style={[styles.selectedBadge, { backgroundColor: personality.color || COLORS.primary }]}>
                <Ionicons name="checkmark" size={16} color={COLORS.text} />
              </View>
            )}
          </View>

          <Text style={styles.personalityName}>{personality.name}</Text>
          <Text style={styles.personalityDescription}>
            {personality.description || 'AI tutor personality'}
          </Text>

          <View style={styles.cardFooter}>
            <View
              style={[
                styles.colorBar,
                { backgroundColor: personality.color || COLORS.primary },
              ]}
            />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundLight]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Choose Your AI Tutor's Personality</Text>
          <Text style={styles.headerSubtitle}>
            Learning {language?.name || 'Yoruba'} {language?.flag}
          </Text>
        </View>
      </View>

      {/* Personality Cards Carousel */}
      <View style={styles.carouselContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading personalities...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadPersonalities}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : personalities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="happy-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No personalities available</Text>
          </View>
        ) : (
          <Animated.ScrollView
            ref={scrollViewRef}
            horizontal={true}
            pagingEnabled={false}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
            snapToInterval={CARD_WIDTH + SPACING.md}
            decelerationRate="fast"
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
          >
            {personalities.map((personality, index) =>
              renderPersonalityCard(personality, index)
            )}
          </Animated.ScrollView>
        )}
      </View>

      {/* Selected Preview */}
      {selectedPersonality && (
        <View style={styles.previewContainer}>
          <View
            style={[
              styles.previewCard,
              { borderLeftColor: selectedPersonality.color || COLORS.primary },
            ]}
          >
            <Text style={styles.previewLabel}>Selected Tutor:</Text>
            <View style={styles.previewContent}>
              <Text style={styles.previewEmoji}>{selectedPersonality.emoji || '😊'}</Text>
              <View style={styles.previewTextContainer}>
                <Text style={styles.previewName}>{selectedPersonality.name}</Text>
                <Text style={styles.previewDescription}>
                  Your AI will be {(selectedPersonality.description || 'helpful').toLowerCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[
            styles.startButton,
            !selectedPersonality && styles.startButtonDisabled,
          ]}
          onPress={handleStartLearning}
          disabled={!selectedPersonality}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              selectedPersonality
                ? COLORS.gradientOrange
                : [COLORS.surfaceLight, COLORS.surfaceLight]
            }
            style={styles.startGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text
              style={[
                styles.startText,
                !selectedPersonality && styles.startTextDisabled,
              ]}
            >
              Start Learning
            </Text>
            <Ionicons
              name="rocket"
              size={24}
              color={selectedPersonality ? COLORS.text : COLORS.textMuted}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 60,
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
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  carouselContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  carouselContent: {
    paddingHorizontal: (width - CARD_WIDTH) / 2,
    paddingVertical: SPACING.lg,
  },
  cardContainer: {
    marginRight: SPACING.md,
  },
  personalityCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 3,
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  personalityCardSelected: {
    elevation: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  emojiContainer: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 48,
  },
  selectedBadge: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  personalityName: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  personalityDescription: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: SPACING.lg,
  },
  cardFooter: {
    alignItems: 'center',
  },
  colorBar: {
    width: 60,
    height: 4,
    borderRadius: 2,
  },
  previewContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  previewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderLeftWidth: 4,
    ...SHADOWS.small,
  },
  previewLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewEmoji: {
    fontSize: 32,
    marginRight: SPACING.md,
  },
  previewTextContainer: {
    flex: 1,
  },
  previewName: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  previewDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  bottomSection: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  startButton: {
    overflow: 'hidden',
    borderRadius: BORDER_RADIUS.lg,
  },
  startButtonDisabled: {
    opacity: 0.6,
  },
  startGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  startText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  startTextDisabled: {
    color: COLORS.textMuted,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },
});

export default PersonalitySelectionScreen;


