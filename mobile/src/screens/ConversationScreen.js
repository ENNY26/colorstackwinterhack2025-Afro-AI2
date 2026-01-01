import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/colors';
import { CULTURAL_TIPS_YORUBA, SUGGESTED_RESPONSES } from '../constants/mockData';
import HelpMeRespondModal from '../components/HelpMeRespondModal';

const { width, height } = Dimensions.get('window');

// Conversation states
const STATES = {
  IDLE: 'idle',
  USER_SPEAKING: 'user_speaking',
  PROCESSING: 'processing',
  AI_SPEAKING: 'ai_speaking',
};

const ConversationScreen = ({ navigation, route }) => {
  const { language, personality } = route.params || {};
  const [conversationState, setConversationState] = useState(STATES.IDLE);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [vocabCount, setVocabCount] = useState(12);

  // Animation values
  const waveScale = useRef(new Animated.Value(1)).current;
  const waveOpacity = useRef(new Animated.Value(0.3)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const tipOpacity = useRef(new Animated.Value(1)).current;
  const transcriptOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Wave animations for speaking states
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const wave3 = useRef(new Animated.Value(0)).current;

  // Auto-rotate cultural tips
  useEffect(() => {
    const tipInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(tipOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(tipOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      setCurrentTipIndex((prev) => (prev + 1) % CULTURAL_TIPS_YORUBA.length);
    }, 8000);

    return () => clearInterval(tipInterval);
  }, []);

  // Wave animation based on state
  useEffect(() => {
    if (conversationState === STATES.USER_SPEAKING || conversationState === STATES.AI_SPEAKING) {
      startWaveAnimation();
    } else {
      stopWaveAnimation();
    }
  }, [conversationState]);

  const startWaveAnimation = () => {
    const createWave = (animValue, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
    };

    Animated.parallel([
      createWave(wave1, 0),
      createWave(wave2, 200),
      createWave(wave3, 400),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopWaveAnimation = () => {
    wave1.setValue(0);
    wave2.setValue(0);
    wave3.setValue(0);
    pulseAnim.setValue(1);
  };

  const handlePTTPress = () => {
    console.log('PTT button pressed');
    Animated.spring(buttonScale, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
    setConversationState(STATES.USER_SPEAKING);
    setTranscript('');
    setShowTranscript(true);

    // Simulate user speaking
    setTimeout(() => {
      setTranscript('Báwo ni?');
    }, 500);
  };

  const handlePTTRelease = () => {
    console.log('PTT button released');
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();

    // Transition through states
    setConversationState(STATES.PROCESSING);
    
    setTimeout(() => {
      setConversationState(STATES.AI_SPEAKING);
      setTranscript('Mo wà dáadáa, ẹ ṣé!');
      setVocabCount((prev) => prev + 1);

      // After AI finishes
      setTimeout(() => {
        setConversationState(STATES.IDLE);
        // Fade out transcript after delay
        setTimeout(() => {
          Animated.timing(transcriptOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }).start(() => setShowTranscript(false));
        }, 3000);
      }, 3000);
    }, 1500);
  };

  const handleHelpMeRespond = () => {
    console.log('Help Me Respond pressed');
    setShowHelpModal(true);
  };

  const handleSelectResponse = (response) => {
    console.log('Selected response:', response);
    setShowHelpModal(false);
    setTranscript(response.original);
    setShowTranscript(true);
  };

  const getStateConfig = () => {
    switch (conversationState) {
      case STATES.USER_SPEAKING:
        return {
          color: COLORS.userSpeaking,
          text: "You're speaking...",
          icon: 'mic',
        };
      case STATES.PROCESSING:
        return {
          color: COLORS.warning,
          text: 'Thinking...',
          icon: 'sync',
        };
      case STATES.AI_SPEAKING:
        return {
          color: COLORS.aiSpeaking,
          text: 'AI is responding...',
          icon: 'volume-high',
        };
      default:
        return {
          color: COLORS.idle,
          text: 'Tap to speak',
          icon: 'mic-outline',
        };
    }
  };

  const stateConfig = getStateConfig();

  const renderWaves = () => {
    const baseSize = 180;
    const isActive = conversationState === STATES.USER_SPEAKING || conversationState === STATES.AI_SPEAKING;
    const waves = [
      { anim: wave1, size: baseSize },
      { anim: wave2, size: baseSize + 40 },
      { anim: wave3, size: baseSize + 80 },
    ];

    return (
      <View style={styles.wavesContainer}>
        {waves.map((item, index) => {
          const animatedStyle = {
            opacity: item.anim.interpolate({
              inputRange: [0, 1],
              outputRange: [isActive ? 0.3 : 0.1, isActive ? 0.6 : 0.2],
            }),
            transform: [
              {
                scale: item.anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.15],
                }),
              },
            ],
          };

          return (
            <Animated.View
              key={index}
              style={[
                styles.wave,
                {
                  width: item.size,
                  height: item.size,
                  borderColor: stateConfig.color,
                },
                animatedStyle,
              ]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundLight, COLORS.surface]}
        style={StyleSheet.absoluteFill}
      />

      {/* Top Section - Header & Cultural Tips */}
      <View style={styles.topSection}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.languageFlag}>{language?.flag || '🇳🇬'}</Text>
            <Text style={styles.languageName}>{language?.name || 'Yoruba'}</Text>
            <View style={styles.vocabBadge}>
              <Ionicons name="book" size={12} color={COLORS.accent} />
              <Text style={styles.vocabCount}>{vocabCount}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Cultural Tips Card */}
        <Animated.View style={[styles.tipCard, { opacity: tipOpacity }]}>
          <LinearGradient
            colors={[COLORS.surface, COLORS.surfaceLight]}
            style={styles.tipGradient}
          >
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tipContent}
            >
              <Text style={styles.tipText}>
                {CULTURAL_TIPS_YORUBA[currentTipIndex].tip}
              </Text>
            </ScrollView>
            <View style={styles.tipIndicator}>
              {CULTURAL_TIPS_YORUBA.slice(0, 5).map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.tipDot,
                    idx === currentTipIndex % 5 && styles.tipDotActive,
                  ]}
                />
              ))}
            </View>
          </LinearGradient>
        </Animated.View>
      </View>

      {/* Middle Section - Waveform Visualizer */}
      <View style={styles.middleSection}>
        {renderWaves()}

        <Animated.View
          style={[
            styles.visualizerCircle,
            {
              transform: [{ scale: pulseAnim }],
              borderColor: stateConfig.color,
            },
          ]}
        >
          <LinearGradient
            colors={[stateConfig.color + '40', stateConfig.color + '10']}
            style={styles.visualizerGradient}
          >
            <Ionicons
              name={stateConfig.icon}
              size={48}
              color={stateConfig.color}
            />
          </LinearGradient>
        </Animated.View>

        <Text style={[styles.stateText, { color: stateConfig.color }]}>
          {stateConfig.text}
        </Text>

        {/* Transcript */}
        {showTranscript && transcript && (
          <Animated.View style={[styles.transcriptContainer]}>
            <Text style={styles.transcriptLabel}>
              {conversationState === STATES.AI_SPEAKING ? 'AI:' : 'You:'}
            </Text>
            <Text style={styles.transcriptText}>{transcript}</Text>
          </Animated.View>
        )}
      </View>

      {/* Bottom Section - PTT Button */}
      <View style={styles.bottomSection}>
        {/* Help Me Respond Button */}
        {conversationState === STATES.IDLE && (
          <TouchableOpacity
            style={styles.helpButton}
            onPress={handleHelpMeRespond}
            activeOpacity={0.7}
          >
            <Ionicons name="bulb-outline" size={20} color={COLORS.accent} />
            <Text style={styles.helpButtonText}>Help Me Respond</Text>
          </TouchableOpacity>
        )}

        {/* Push to Talk Button */}
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={[
              styles.pttButton,
              conversationState === STATES.USER_SPEAKING && styles.pttButtonActive,
              conversationState === STATES.PROCESSING && styles.pttButtonProcessing,
            ]}
            onPressIn={handlePTTPress}
            onPressOut={handlePTTRelease}
            disabled={conversationState === STATES.PROCESSING || conversationState === STATES.AI_SPEAKING}
            activeOpacity={1}
          >
            <LinearGradient
              colors={
                conversationState === STATES.USER_SPEAKING
                  ? [COLORS.userSpeaking, '#0D8BD9']
                  : conversationState === STATES.PROCESSING
                  ? [COLORS.warning, '#E09000']
                  : COLORS.gradientOrange
              }
              style={styles.pttGradient}
            >
              {conversationState === STATES.PROCESSING ? (
                <Ionicons name="sync" size={40} color={COLORS.text} />
              ) : (
                <Ionicons name="mic" size={40} color={COLORS.text} />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.pttLabel}>
          {conversationState === STATES.USER_SPEAKING
            ? 'Listening...'
            : conversationState === STATES.PROCESSING
            ? 'Processing...'
            : conversationState === STATES.AI_SPEAKING
            ? 'AI Speaking...'
            : 'Hold to Speak'}
        </Text>
      </View>

      {/* Help Me Respond Modal */}
      <HelpMeRespondModal
        visible={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        onSelectResponse={handleSelectResponse}
        responses={SUGGESTED_RESPONSES}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topSection: {
    paddingTop: 50,
    paddingHorizontal: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  languageFlag: {
    fontSize: 24,
  },
  languageName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  vocabBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
    gap: 4,
  },
  vocabCount: {
    fontSize: FONT_SIZES.sm,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  tipCard: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  tipGradient: {
    padding: SPACING.md,
  },
  tipContent: {
    paddingRight: SPACING.md,
  },
  tipText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    lineHeight: 22,
  },
  tipIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    gap: 6,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.textMuted,
  },
  tipDotActive: {
    width: 18,
    backgroundColor: COLORS.primary,
  },
  middleSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wavesContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wave: {
    position: 'absolute',
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 2,
  },
  visualizerCircle: {
    width: 160,
    height: 160,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 3,
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  visualizerGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stateText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginTop: SPACING.lg,
  },
  transcriptContainer: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    maxWidth: width * 0.8,
    ...SHADOWS.small,
  },
  transcriptLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  bottomSection: {
    alignItems: 'center',
    paddingBottom: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.round,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
    ...SHADOWS.small,
  },
  helpButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.accent,
    fontWeight: '600',
  },
  pttButton: {
    width: 100,
    height: 100,
    borderRadius: BORDER_RADIUS.round,
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  pttButtonActive: {
    ...SHADOWS.glow(COLORS.userSpeaking),
  },
  pttButtonProcessing: {
    ...SHADOWS.glow(COLORS.warning),
  },
  pttGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pttLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    fontWeight: '500',
  },
});

export default ConversationScreen;
