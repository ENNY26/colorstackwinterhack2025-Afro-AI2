import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Dimensions,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/colors';
import { languagesAPI } from '../services';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.lg * 3) / 2;

const LanguageSelectionScreen = ({ navigation }) => {
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scaleAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    loadLanguages();
  }, []);

  const loadLanguages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to load from API
      try {
        const result = await languagesAPI.getAll();
        
        if (result.success && result.data.languages) {
          setLanguages(result.data.languages);
          setLoading(false);
          return;
        }
      } catch (apiErr) {
        console.warn('API call failed, using fallback languages:', apiErr.message);
      }
      
      // Fallback to static language list if API fails
      const fallbackLanguages = [
        { id: 'yoruba', name: 'Yoruba', nativeName: 'Èdè Yorùbá', flag: '🇳🇬', region: 'Nigeria', speakers: '45M+' },
        { id: 'swahili', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇹🇿', region: 'East Africa', speakers: '100M+' },
        { id: 'hausa', name: 'Hausa', nativeName: 'Harshen Hausa', flag: '🇳🇬', region: 'West Africa', speakers: '70M+' },
        { id: 'zulu', name: 'Zulu', nativeName: 'isiZulu', flag: '🇿🇦', region: 'South Africa', speakers: '12M+' },
        { id: 'amharic', name: 'Amharic', nativeName: 'አማርኛ', flag: '🇪🇹', region: 'Ethiopia', speakers: '32M+' },
        { id: 'igbo', name: 'Igbo', nativeName: 'Asụsụ Igbo', flag: '🇳🇬', region: 'Nigeria', speakers: '45M+' },
        { id: 'xhosa', name: 'Xhosa', nativeName: 'isiXhosa', flag: '🇿🇦', region: 'South Africa', speakers: '8M+' },
        { id: 'akan', name: 'Akan', nativeName: 'Akan', flag: '🇬🇭', region: 'Ghana', speakers: '11M+' },
      ];
      
      setLanguages(fallbackLanguages);
      if (!error) {
        console.log('Using fallback language data');
      }
    } catch (err) {
      console.error('Failed to load languages:', err);
      setError('Failed to load languages. Please check your connection.');
      // Still set fallback languages
      setLanguages([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLanguages = languages.filter(
    (lang) =>
      lang.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.nativeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.region?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLanguageSelect = (language) => {
    console.log('Language selected:', language.name);
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    setSelectedLanguage(language);
  };

  const handleContinue = () => {
    if (selectedLanguage) {
      console.log('Continuing with language:', selectedLanguage.name);
      navigation.navigate('PersonalitySelection', { language: selectedLanguage });
    }
  };

  const renderLanguageCard = ({ item, index }) => {
    const isSelected = selectedLanguage?.id === item.id;
    const animatedStyle = isSelected
      ? { transform: [{ scale: scaleAnim }] }
      : {};

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleLanguageSelect(item)}
        style={[styles.cardWrapper, { marginLeft: index % 2 === 0 ? 0 : SPACING.md }]}
      >
        <Animated.View
          style={[
            styles.languageCard,
            isSelected && styles.languageCardSelected,
            animatedStyle,
          ]}
        >
          {isSelected && (
            <LinearGradient
              colors={COLORS.gradientOrange}
              style={styles.selectedOverlay}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          )}
          <View style={styles.cardContent}>
            <Text style={styles.flag}>{item.flag}</Text>
            <Text style={[styles.languageName, isSelected && styles.languageNameSelected]}>
              {item.name}
            </Text>
            {item.nativeName && item.nativeName !== item.name && (
              <Text style={[styles.nativeName, isSelected && styles.nativeNameSelected]}>
                {item.nativeName}
              </Text>
            )}
            {item.nativeExample && (
              <View style={styles.exampleContainer}>
                <Text style={[styles.nativeExample, isSelected && styles.nativeExampleSelected]}>
                  "{item.nativeExample}"
                </Text>
              </View>
            )}
            {item.speakers && (
              <View style={styles.badgeContainer}>
                <View style={[styles.badge, isSelected && styles.badgeSelected]}>
                  <Ionicons
                    name="people"
                    size={12}
                    color={isSelected ? COLORS.text : COLORS.textMuted}
                  />
                  <Text style={[styles.badgeText, isSelected && styles.badgeTextSelected]}>
                    {item.speakers}
                  </Text>
                </View>
              </View>
            )}
            {isSelected && (
              <View style={styles.checkmark}>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.text} />
              </View>
            )}
          </View>
        </Animated.View>
      </TouchableOpacity>
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
          <Text style={styles.headerTitle}>Choose Your Language</Text>
          <Text style={styles.headerSubtitle}>
            Select the African language you want to learn
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search languages..."
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

      {/* Languages Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading languages...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadLanguages}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredLanguages}
          renderItem={renderLanguageCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No languages found' : 'No languages available'}
              </Text>
            </View>
          }
          refreshing={loading}
          onRefresh={loadLanguages}
        />
      )}

      {/* Continue Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedLanguage && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedLanguage}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              selectedLanguage ? COLORS.gradientOrange : [COLORS.surfaceLight, COLORS.surfaceLight]
            }
            style={styles.continueGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text
              style={[
                styles.continueText,
                !selectedLanguage && styles.continueTextDisabled,
              ]}
            >
              Continue
            </Text>
            <Ionicons
              name="arrow-forward"
              size={24}
              color={selectedLanguage ? COLORS.text : COLORS.textMuted}
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
    marginVertical: SPACING.md,
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
  gridContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 120,
  },
  cardWrapper: {
    marginBottom: SPACING.md,
  },
  languageCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  languageCardSelected: {
    borderColor: COLORS.primary,
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
  },
  cardContent: {
    alignItems: 'center',
  },
  flag: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  languageName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  languageNameSelected: {
    color: COLORS.primaryLight,
  },
  nativeName: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  nativeNameSelected: {
    color: COLORS.text,
  },
  exampleContainer: {
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  nativeExample: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  nativeExampleSelected: {
    color: COLORS.accent,
  },
  badgeContainer: {
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BORDER_RADIUS.round,
  },
  badgeSelected: {
    backgroundColor: COLORS.primary + '30',
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  badgeTextSelected: {
    color: COLORS.text,
  },
  checkmark: {
    position: 'absolute',
    top: -SPACING.md,
    right: -SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.round,
    padding: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
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
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
    backgroundColor: COLORS.background + 'EE',
  },
  continueButton: {
    overflow: 'hidden',
    borderRadius: BORDER_RADIUS.lg,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  continueText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  continueTextDisabled: {
    color: COLORS.textMuted,
  },
});

export default LanguageSelectionScreen;
