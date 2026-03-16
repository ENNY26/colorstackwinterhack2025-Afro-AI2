import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/colors';
import { audioAPI, authAPI, API_BASE } from '../services';
import { getPhrasesForCategory } from '../constants/tutorPhrases';

function evaluatePronunciation(expected, actual) {
  if (!actual) return 0;
  const a = expected.toLowerCase().replace(/[^\w\s]/g, '');
  const b = actual.toLowerCase().replace(/[^\w\s]/g, '');
  const expectedWords = a.split(/\s+/).filter(Boolean);
  const actualWords = b.split(/\s+/).filter(Boolean);
  let matches = 0;
  expectedWords.forEach((w) => {
    if (actualWords.some((aw) => aw.includes(w) || w.includes(aw))) matches++;
  });
  return matches / Math.max(expectedWords.length, 1);
}

// Use only AI-generated plan lessons when plan has lessons; no dummy/static data then
function getPhrases(plan, langId, category) {
  const lessons = plan?.lessons || [];
  const lesson = lessons.find(
    (l) => (l.title || '').toLowerCase().includes((category || '').toLowerCase())
  );
  if (lesson?.steps?.length) {
    return lesson.steps.map((s) => ({
      native: s.content || s.text || '',
      english: s.english || s.translation || 'Listen and repeat',
    })).filter((p) => p.native);
  }
  // Fallback to static only when plan has no lessons (e.g. offline/API failed)
  if (lessons.length === 0) {
    return getPhrasesForCategory(langId, category);
  }
  return [];
}

const TutorLessonScreen = ({ navigation, route }) => {
  const { plan, category } = route.params || {};
  const langId = (plan?.language || 'yoruba').toLowerCase();
  const langName = plan?.languageName || 'Yoruba';

  const phrases = getPhrases(plan, langId, category);
  const [stepIndex, setStepIndex] = useState(-1); // -1 = welcome, 0..n = phrase index
  const [recording, setRecording] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [lastFeedback, setLastFeedback] = useState(null);
  const [ttsLoading, setTtsLoading] = useState(false);

  const currentPhrase = stepIndex >= 0 && stepIndex < phrases.length ? phrases[stepIndex] : null;
  const isWelcome = stepIndex === -1;
  const isComplete = stepIndex >= phrases.length && phrases.length > 0;
  const hasNoContent = phrases.length === 0;

  // Play phrase using backend TTS (ElevenLabs) for natural pronunciation; fallback to device TTS
  const playPhraseWithTTS = async (text) => {
    if (!text) return;
    setTtsLoading(true);
    try {
      const result = await audioAPI.synthesize(text, 'slow', null, langId);
      const audioUrl = result?.data?.audioUrl;
      if (audioUrl) {
        const fullUrl = audioUrl.startsWith('http') ? audioUrl : `${API_BASE}${audioUrl.startsWith('/') ? '' : '/'}${audioUrl}`;
        const { sound } = await Audio.Sound.createAsync(
          { uri: fullUrl },
          { shouldPlay: true, volume: 1.0 }
        );
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) sound.unloadAsync().catch(() => {});
        });
      } else {
        throw new Error('No audio URL');
      }
    } catch (err) {
      console.warn('TTS API failed, using device speech:', err?.message);
      Speech.speak(text, { language: langId === 'yoruba' ? 'yo' : langId === 'swahili' ? 'sw' : 'en', rate: 0.85 });
    } finally {
      setTtsLoading(false);
    }
  };

  const playWelcome = () => {
    const welcome = `Welcome to your personalized ${langName} ${category} lesson.`;
    Speech.speak(welcome, { language: 'en', rate: 0.9 });
  };

  const playCurrentInstruction = async () => {
    if (!currentPhrase) return;
    const instruction = `In ${langName} we say "${currentPhrase.native}" as in ${currentPhrase.english}. Now try saying "${currentPhrase.native}".`;
    Speech.speak(instruction, { language: 'en', rate: 0.9 });
    setTimeout(() => playPhraseWithTTS(currentPhrase.native), 1500);
  };

  const startLesson = () => {
    setStepIndex(0);
    if (phrases.length > 0) {
      const first = phrases[0];
      const instruction = `In ${langName} we say "${first.native}" as in ${first.english}. Now try saying "${first.native}".`;
      Speech.speak(instruction, { language: 'en', rate: 0.9 });
      setTimeout(() => playPhraseWithTTS(first.native), 2000);
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Microphone permission is required to record.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setLastFeedback(null);
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Error', 'Failed to start recording.');
    }
  };

  const stopRecordingAndEvaluate = async () => {
    if (!recording || !currentPhrase) return;
    try {
      const uri = recording.getURI();
      const status = await recording.getStatusAsync();
      if (status.isRecording) await recording.stopAndUnloadAsync();
      setRecording(null);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      setProcessing(true);
      try {
        await authAPI.ensureAuthenticated();
      } catch (e) {
        console.warn('auth ensure failed', e);
      }

      const fileType = Platform.OS === 'web' ? 'audio/webm' : 'audio/m4a';
      const fileName = Platform.OS === 'web' ? 'recording.webm' : 'recording.m4a';
      const result = await audioAPI.transcribe(
        { uri, type: fileType, name: fileName },
        langId
      );

      if (result.success) {
        const userText = (result.data?.text || '').trim();
        const score = evaluatePronunciation(currentPhrase.native, userText);
        setLastFeedback({ userText, score, expected: currentPhrase.native });
      } else {
        setLastFeedback({ userText: null, score: 0, expected: currentPhrase.native, error: true });
      }
    } catch (err) {
      console.error('Evaluation error:', err);
      setLastFeedback({ userText: null, score: 0, expected: currentPhrase.native, error: true });
    } finally {
      setProcessing(false);
    }
  };

  const goToNextPhrase = () => {
    setLastFeedback(null);
    if (stepIndex + 1 >= phrases.length) {
      Speech.speak('Great job! You completed this lesson.', { language: 'en' });
      setStepIndex(phrases.length); // mark complete
      return;
    }
    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    const next = phrases[nextIndex];
    setTimeout(() => {
      const instruction = `In ${langName} we say "${next.native}" as in ${next.english}. Now try saying "${next.native}".`;
      Speech.speak(instruction, { language: 'en', rate: 0.9 });
      setTimeout(() => playPhraseWithTTS(next.native), 2000);
    }, 400);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.backgroundLight]} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{category}</Text>
        <Text style={styles.headerSubtitle}>
          {stepIndex >= 0 && !isComplete ? `${stepIndex + 1} / ${phrases.length}` : ''}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* No content (plan has lessons but this category has no steps) */}
        {hasNoContent && (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No lesson content here</Text>
            <Text style={styles.emptyText}>
              This category has no steps in your plan. Choose another category or create a new plan.
            </Text>
            <TouchableOpacity style={styles.backToCategories} onPress={() => navigation.navigate('TutorCategories', { plan })}>
              <Text style={styles.backToCategoriesText}>Choose another category</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Welcome step */}
        {!hasNoContent && isWelcome && (
          <>
            <Text style={styles.welcomeTitle}>Welcome to your personalized {langName} {category} lesson</Text>
            <Text style={styles.welcomeText}>
              You'll hear a phrase in {langName}, then try saying it yourself. Take your time and repeat as needed.
            </Text>
            <TouchableOpacity style={styles.playButton} onPress={playWelcome}>
              <Ionicons name="volume-high" size={24} color={COLORS.text} />
              <Text style={styles.playButtonText}>Play welcome</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.startButton} onPress={startLesson} activeOpacity={0.8}>
              <LinearGradient colors={COLORS.gradientOrange} style={styles.startGradient}>
                <Text style={styles.startButtonText}>Start lesson</Text>
                <Ionicons name="mic" size={22} color={COLORS.text} />
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {/* Current phrase step */}
        {!hasNoContent && currentPhrase && !isComplete && (
          <>
            <View style={styles.phraseCard}>
              <Text style={styles.phraseNative}>{currentPhrase.native}</Text>
              <Text style={styles.phraseEnglish}>as in {currentPhrase.english}</Text>
            </View>
            <Text style={styles.instruction}>Now try saying: "{currentPhrase.native}"</Text>

            <TouchableOpacity
              style={styles.playButton}
              onPress={playCurrentInstruction}
              disabled={ttsLoading}
            >
              {ttsLoading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons name="volume-high" size={24} color={COLORS.text} />
              )}
              <Text style={styles.playButtonText}>{ttsLoading ? 'Loading…' : 'Play again'}</Text>
            </TouchableOpacity>

            {!recording ? (
              <TouchableOpacity
                style={[styles.recordButton, processing && styles.recordButtonDisabled]}
                onPress={startRecording}
                disabled={processing}
              >
                <Ionicons name="mic" size={32} color={COLORS.text} />
                <Text style={styles.recordButtonText}>Tap to say it</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.recordButton, styles.recordingActive]}
                onPress={stopRecordingAndEvaluate}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color={COLORS.text} />
                ) : (
                  <>
                    <Ionicons name="stop" size={32} color={COLORS.text} />
                    <Text style={styles.recordButtonText}>Stop & check</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {lastFeedback && (
              <View style={styles.feedbackCard}>
                {lastFeedback.error ? (
                  <Text style={styles.feedbackError}>Could not transcribe. Try again.</Text>
                ) : (
                  <>
                    <Text style={styles.feedbackLabel}>You said:</Text>
                    <Text style={styles.feedbackText}>{lastFeedback.userText || '(no speech detected)'}</Text>
                    <Text style={styles.feedbackScore}>
                      Score: {Math.round((lastFeedback.score || 0) * 100)}%
                    </Text>
                  </>
                )}
                <TouchableOpacity style={styles.nextButton} onPress={goToNextPhrase}>
                  <Text style={styles.nextButtonText}>
                    {stepIndex + 1 >= phrases.length ? 'Finish lesson' : 'Next phrase'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Lesson complete */}
        {!hasNoContent && isComplete && (
          <View style={styles.completeCard}>
            <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
            <Text style={styles.completeTitle}>Lesson complete!</Text>
            <Text style={styles.completeText}>You practiced {phrases.length} phrases. Keep it up!</Text>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => navigation.navigate('TutorCategories', { plan })}
            >
              <Text style={styles.doneButtonText}>Choose another category</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.homeButton}
              onPress={() => navigation.replace('MainTabs', { plan })}
            >
              <Text style={styles.homeButtonText}>Go to Home</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
  headerTitle: { fontSize: FONT_SIZES.xl, fontWeight: 'bold', color: COLORS.text, flex: 1 },
  headerSubtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  welcomeTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  welcomeText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  playButtonText: { color: COLORS.text, fontWeight: '600' },
  startButton: { borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', marginTop: SPACING.md },
  startGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  startButtonText: { color: COLORS.text, fontSize: FONT_SIZES.lg, fontWeight: 'bold' },
  phraseCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  phraseNative: { fontSize: FONT_SIZES.xxl, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.xs },
  phraseEnglish: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  instruction: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
  },
  recordButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  recordButtonDisabled: { opacity: 0.6 },
  recordingActive: { backgroundColor: COLORS.error },
  recordButtonText: { color: COLORS.text, fontSize: FONT_SIZES.lg, fontWeight: '600' },
  feedbackCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  feedbackLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted, marginBottom: SPACING.xs },
  feedbackText: { fontSize: FONT_SIZES.md, color: COLORS.text, marginBottom: SPACING.sm },
  feedbackScore: { fontSize: FONT_SIZES.lg, fontWeight: 'bold', color: COLORS.primary, marginBottom: SPACING.md },
  feedbackError: { color: COLORS.error, marginBottom: SPACING.md },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xs,
  },
  nextButtonText: { color: COLORS.primary, fontWeight: '600' },
  completeCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  completeTitle: { fontSize: FONT_SIZES.xxl, fontWeight: 'bold', color: COLORS.text, marginTop: SPACING.md },
  completeText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, marginTop: SPACING.sm, marginBottom: SPACING.xl },
  doneButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
  },
  doneButtonText: { color: COLORS.text, fontWeight: '600' },
  homeButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  homeButtonText: { color: COLORS.primary, fontWeight: '600' },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: { fontSize: FONT_SIZES.xl, fontWeight: 'bold', color: COLORS.text, marginTop: SPACING.md },
  emptyText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm, marginBottom: SPACING.lg },
  backToCategories: { paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl },
  backToCategoriesText: { color: COLORS.primary, fontWeight: '600' },
});

export default TutorLessonScreen;
