import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/colors';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { audioAPI, API_BASE } from '../services';

const { height } = Dimensions.get('window');

const HelpMeRespondModal = ({ visible, onClose, onSelectResponse, responses, language }) => {
  const { colors: COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [playingIndex, setPlayingIndex] = useState(null);
  const [sound, setSound] = useState(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Cleanup audio on unmount or when modal closes
  useEffect(() => {
    if (!visible) {
      // Stop any playing audio when modal closes
      Speech.stop();
      if (sound) {
        sound.unloadAsync().catch(err => console.log('Error unloading sound:', err));
        setSound(null);
      }
      setPlayingIndex(null);
    }
    
    return () => {
      // Cleanup on unmount
      Speech.stop();
      if (sound) {
        sound.unloadAsync().catch(err => console.log('Error unloading sound:', err));
      }
    };
  }, [visible, sound]);

  const handlePlayAudio = async (response, index) => {
    try {
      console.log('Playing audio for:', response.original);
      setPlayingIndex(index);

      // Stop any currently playing TTS
      Speech.stop();

      // Stop any currently playing audio
      if (sound) {
        try {
          await sound.stopAsync();
          await sound.unloadAsync();
        } catch (unloadErr) {
          console.log('Error unloading previous sound:', unloadErr);
        }
        setSound(null);
      }

      // Try to synthesize audio from backend first (ElevenLabs)
      try {
        const languageId = language?.id || 'yoruba';
        const synthesizeResult = await audioAPI.synthesize(response.original, 'normal', undefined, languageId);
        
        if (synthesizeResult.success && synthesizeResult.data.audioUrl) {
          const audioUrl = synthesizeResult.data.audioUrl;
          const fullUrl = audioUrl.startsWith('http') 
            ? audioUrl 
            : `${API_BASE}${audioUrl.startsWith('/') ? '' : '/'}${audioUrl}`;
          
          console.log('✅ Playing synthesized audio from ElevenLabs:', fullUrl);

          // Configure audio mode
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
          });

          // Load and play audio
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: fullUrl },
            { shouldPlay: true, volume: 1.0 }
          );

          setSound(newSound);

          // When audio finishes
          newSound.setOnPlaybackStatusUpdate((status) => {
            if (status.didJustFinish) {
              console.log('Audio playback finished');
              setPlayingIndex(null);
              newSound.unloadAsync().catch(err => console.log('Error unloading sound:', err));
              setSound(null);
            }
            if (status.error) {
              console.error('Audio playback error:', status.error);
              setPlayingIndex(null);
              setSound(null);
            }
          });
          return;
        }
      } catch (synthErr) {
        console.error('❌ Backend synthesis failed:', synthErr.response?.data || synthErr.message);
        
        // Don't use device TTS for Yoruba/African languages - it sounds terrible
        // Instead, show a helpful message
        setPlayingIndex(null);
        Alert.alert(
          'Premium Audio Unavailable',
          'ElevenLabs TTS is not available. Device TTS does not support African language pronunciation well.\n\n' +
          'To enable premium audio:\n' +
          '1. Get an ElevenLabs API key from https://elevenlabs.io/\n' +
          '2. Add it to server/.env as ELEVENLABS_API_KEY\n' +
          '3. Add ELEVENLABS_VOICE_ID to your .env file',
          [{ text: 'OK' }]
        );
        return;
      }
    } catch (err) {
      console.error('Failed to play audio:', err);
      setPlayingIndex(null);
    }
  };

  const ResponseCard = ({ response, index }) => {
    const isPlaying = playingIndex === index;
    
    return (
      <TouchableOpacity
        style={styles.responseCard}
        onPress={() => onSelectResponse(response)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardTextContainer}>
            <Text style={styles.originalText}>{response.original}</Text>
            <Text style={styles.translationText}>{response.translation}</Text>
          </View>
          <TouchableOpacity
            style={[styles.playButton, isPlaying && styles.playButtonActive]}
            onPress={(e) => {
              e.stopPropagation(); // Prevent card selection when pressing play button
              handlePlayAudio(response, index);
            }}
            activeOpacity={0.7}
            disabled={isPlaying}
          >
            {isPlaying ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons name="volume-medium" size={24} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
    >
      <View style={styles.container}>
        {/* Overlay */}
        <Animated.View
          style={[
            styles.overlay,
            { opacity: overlayOpacity },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            pointerEvents="auto"
            onPress={onClose}
            activeOpacity={1}
          />
        </Animated.View>

        {/* Bottom Sheet */}
        <Animated.View
          style={[
            styles.bottomSheet,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <LinearGradient
            colors={[COLORS.surfaceLight, COLORS.surface]}
            style={styles.sheetGradient}
          >
            {/* Handle */}
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Ionicons name="bulb" size={24} color={COLORS.accent} />
                <Text style={styles.headerTitle}>Suggested Responses</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Response Cards */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {responses && responses.length > 0 ? (
                responses.map((response, index) => (
                  <ResponseCard 
                    key={response.id || `response-${index}`} 
                    response={response} 
                    index={index} 
                  />
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No suggestions available</Text>
                </View>
              )}
            </ScrollView>

            {/* Use Button */}
            <View style={styles.footer}>
              <Text style={styles.footerHint}>
                Tap a response to use it, or press play to hear pronunciation
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const makeStyles = (COLORS) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
  bottomSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
    maxHeight: height * 0.6,
    ...SHADOWS.large,
  },
  sheetGradient: {
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
    paddingBottom: SPACING.xxl,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.textMuted,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.surfaceLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    maxHeight: height * 0.35,
  },
  scrollContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  responseCard: {
    backgroundColor: COLORS.surfaceLighter,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTextContainer: {
    flex: 1,
  },
  originalText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  translationText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.md,
  },
  playButtonActive: {
    backgroundColor: COLORS.primary + '40',
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerHint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});

export default HelpMeRespondModal;


