import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/colors';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import HelpMeRespondModal from '../components/HelpMeRespondModal';
import { conversationAPI, audioAPI, tipsAPI, vocabularyAPI, authAPI, API_BASE } from '../services';
import { navigateRootStack } from '../navigation/navigationHelpers';

const { width, height } = Dimensions.get('window');

// Conversation states
const STATES = {
  IDLE: 'idle',
  USER_SPEAKING: 'user_speaking',
  PROCESSING: 'processing',
  AI_SPEAKING: 'ai_speaking',
};

const ConversationScreen = ({ navigation, route }) => {
  const { colors: COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const raw = route.params || {};
  const routeParams =
    raw.params != null && typeof raw.screen === 'string' && typeof raw.params === 'object'
      ? raw.params
      : raw;
  const { language: paramLanguage, personality: paramPersonality, conversationType, plan, sessionMinutes } =
    routeParams || {};
  const language = paramLanguage || (plan && { id: plan.language, name: plan.languageName, flag: plan.flag || '🇳🇬' }) || null;
  const personality = paramPersonality || (plan?.personality ? { id: plan.personality } : null) || { id: 'friendly' };
  const isRoleplay = !!conversationType;
  /** Must match `initializeConversation` — roleplay voice/help flows must create the same scenario-bound thread. */
  const startConversationArgs = () => [
    language?.id || 'yoruba',
    personality?.id || 'friendly',
    conversationType || undefined,
  ];
  const [conversationState, setConversationState] = useState(STATES.IDLE);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [vocabCount, setVocabCount] = useState(12);
  const [timeLeft, setTimeLeft] = useState(
    isRoleplay && sessionMinutes ? sessionMinutes * 60 : null
  );
  
  // Backend integration state
  const [conversationId, setConversationId] = useState(null);
  /** Same as conversationId; updated synchronously whenever the id changes (effects run too late mid-transcribe). */
  const conversationIdRef = useRef(null);
  const sessionReadyRef = useRef(false);
  const assignConversationId = useCallback((id) => {
    conversationIdRef.current = id;
    setConversationId(id);
  }, []);
  const [recording, setRecording] = useState(null);
  /** Same Recording as state; updated synchronously so onPressOut sees it before re-render (fixes silent no-op on release). */
  const recordingRef = useRef(null);
  const [sound, setSound] = useState(null);
  const [culturalTips, setCulturalTips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestedResponses, setSuggestedResponses] = useState([]);
  const isSessionOver = isRoleplay && timeLeft !== null && timeLeft <= 0;
  const [hasEnded, setHasEnded] = useState(false);
  const [ending, setEnding] = useState(false);

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

  // Initialize conversation and load cultural tips
  useEffect(() => {
    initializeConversation();
    if (!isRoleplay) {
      loadCulturalTips();
      loadVocabularyStats();
    }
    
    return () => {
      // Cleanup audio on unmount
      if (sound) {
        sound.unloadAsync().catch(err => console.log('Error unloading sound:', err));
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(err => console.log('Error stopping recording:', err));
        recordingRef.current = null;
      }
      // Stop any speech
      Speech.stop();
    };
  }, []);

  // Auto-rotate cultural tips
  useEffect(() => {
    if (culturalTips.length === 0) return;
    
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
      setCurrentTipIndex((prev) => (prev + 1) % culturalTips.length);
    }, 8000);

    return () => clearInterval(tipInterval);
  }, [culturalTips]);

  // Countdown timer for roleplay sessions
  useEffect(() => {
    if (!isRoleplay || !timeLeft || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRoleplay, timeLeft]);

  // Finish roleplay session on timer end
  useEffect(() => {
    if (!isRoleplay || !isSessionOver || !conversationId || hasEnded) return;
    finishRoleplaySession(true);
  }, [isRoleplay, isSessionOver, conversationId, hasEnded]);

  const finishRoleplaySession = async (auto = false) => {
    if (!conversationId || hasEnded || ending) return;
    try {
      setEnding(true);
      // End conversation on backend and get summary
      const endResp = await conversationAPI.endConversation(conversationId);
      const summary = endResp?.data?.summary ?? null;
      // Fetch full conversation to show what user and AI said
      const convResp = await conversationAPI.getConversation(conversationId);
      const fullConv = convResp?.data?.conversation ?? {};
      const messages = fullConv.messages || [];
      const userMessages = messages.filter((m) => m.role === 'user');
      const aiMessages = messages.filter((m) => m.role === 'assistant');

      setHasEnded(true);
      navigateRootStack(navigation, 'RoleplaySummary', {
        summary,
        userMessages,
        aiMessages,
        language,
        conversationType,
        conversationId,
      });
    } catch (err) {
      console.error('Failed to finish roleplay session:', err);
    } finally {
      setEnding(false);
    }
  };

  // Initialize conversation with backend
  const initializeConversation = async () => {
    try {
      setLoading(true);
      
      // Ensure user is authenticated first
      const isAuth = await authAPI.ensureAuthenticated();
      if (!isAuth) {
        setError('Authentication failed. Please try again.');
        Alert.alert(
          'Authentication Error',
          'Failed to authenticate. Please ensure the backend server is running.'
        );
        return;
      }
      
      const result = await conversationAPI.startConversation(...startConversationArgs());
      
      if (result.success && result.data.conversation) {
        assignConversationId(result.data.conversation.id);
        sessionReadyRef.current = true;

        // Show initial AI greeting
        const initialMessage = result.data.conversation.messages[0];
        if (initialMessage && initialMessage.role === 'assistant') {
          setTranscript(initialMessage.content);
          if (!isRoleplay) {
            setShowTranscript(true);
          }

          if (initialMessage.audioUrl) {
            playAudio(initialMessage.audioUrl);
          } else if (isRoleplay) {
            setConversationState(STATES.AI_SPEAKING);
            speakText(initialMessage.content, { skipBackendTts: true });
          }
          
          // Update vocabulary words
          if (initialMessage.vocabularyWords) {
            setVocabCount(prev => prev + initialMessage.vocabularyWords.length);
          }
        }
      }
    } catch (err) {
      console.error('Failed to initialize conversation:', err);
      
      // Handle specific error cases
      if (err.response?.status === 401) {
        setError('Authentication required. Retrying...');
        // Try to re-authenticate
        try {
          await authAPI.ensureAuthenticated();
          // Retry initialization
          setTimeout(() => initializeConversation(), 500);
        } catch (authErr) {
          Alert.alert(
            'Authentication Required',
            'Failed to authenticate. Please ensure the backend server is running and try again.'
          );
        }
      } else if (err.code === 'ECONNREFUSED' || err.message?.includes('Network') || err.code === 'ERR_NETWORK') {
        setError('Cannot connect to backend server.');
        Alert.alert(
          'Connection Error',
          'Cannot connect to backend server. Please ensure the server is running on port 5000.'
        );
      } else {
        setError('Failed to start conversation. Please try again.');
        console.error('Conversation error details:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load cultural tips from backend
  const loadCulturalTips = async () => {
    try {
      const result = await tipsAPI.getRandomTips(language?.id || 'yoruba', 10);
      if (result.success && result.data.tips) {
        setCulturalTips(result.data.tips);
      }
    } catch (err) {
      // Silently fall back to mock data if backend unavailable
      if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK' || err.message?.includes('Network')) {
        console.log('Backend unavailable - using mock cultural tips');
      } else {
        console.error('Failed to load cultural tips:', err);
      }
      // Keep mock data as fallback
    }
  };

  // Load vocabulary stats from backend
  const loadVocabularyStats = async () => {
    try {
      const result = await vocabularyAPI.getStats(language?.id || 'yoruba');
      if (result.success && result.data.stats) {
        const stats = result.data.stats[0];
        if (stats) {
          setVocabCount(stats.totalWords || 0);
        }
      }
    } catch (err) {
      // Silently keep default value if backend unavailable
      if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK' || err.message?.includes('Network')) {
        console.log('Backend unavailable - using default vocabulary count');
      } else {
        console.error('Failed to load vocabulary stats:', err);
      }
      // Keep default value
    }
  };

  // Play audio from URL
  const playAudio = async (audioUrl) => {
    try {
      console.log('Playing audio from URL:', audioUrl);
      
      // Stop any currently playing audio
      if (sound) {
        try {
          await sound.unloadAsync();
        } catch (unloadErr) {
          console.log('Error unloading previous sound:', unloadErr);
        }
      }

      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Construct full URL using API base URL (without /api since audio is served from /uploads)
      let fullUrl = audioUrl;
      if (!audioUrl.startsWith('http')) {
        // Use the same base URL as API config for consistency
        fullUrl = `${API_BASE}${audioUrl.startsWith('/') ? '' : '/'}${audioUrl}`;
      }
      console.log('Loading audio from:', fullUrl);

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: fullUrl },
        { shouldPlay: true, volume: 1.0 }
      );
      
      setSound(newSound);

      // When audio finishes
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          console.log('Audio playback finished');
          setConversationState(STATES.IDLE);
          newSound.unloadAsync().catch(err => console.log('Error unloading sound:', err));
          setSound(null);
        }
        if (status.error) {
          console.error('Audio playback error:', status.error);
          setConversationState(STATES.IDLE);
        }
      });
    } catch (err) {
      console.error('Failed to play audio:', err);
      // Continue without audio
      setConversationState(STATES.IDLE);
    }
  };

  // Speak text using device TTS (fallback if backend TTS fails)
  const speakText = async (text, options = {}) => {
    const skipBackendTts = options.skipBackendTts === true;
    try {
      console.log('Speaking text:', text);

      if (sound) {
        try {
          await sound.unloadAsync();
        } catch (unloadErr) {
          console.log('Error unloading previous sound:', unloadErr);
        }
      }

      if (conversationId && !skipBackendTts) {
        try {
          const languageId = language?.id || 'yoruba';
          const synthesizeResult = await audioAPI.synthesize(text, 'normal', undefined, languageId);
          if (synthesizeResult.success && synthesizeResult.data.audioUrl) {
            await playAudio(synthesizeResult.data.audioUrl);
            return;
          }
        } catch (synthErr) {
          console.log('Backend TTS unavailable, using device TTS:', synthErr);
        }
      }

      // Device TTS fallback - Note: Device TTS does NOT support Yoruba/African languages well
      // We'll still try it but warn the user that it won't sound good
      try {
        // Stop any existing speech
        Speech.stop();
        
        // Map language IDs to TTS language codes
        // Note: Most device TTS engines don't support African languages well
        const languageMap = {
          yoruba: 'yo-NG', // Nigerian Yoruba (may not be available)
          swahili: 'sw-KE', // Kenyan Swahili (may not be available)
          hausa: 'ha-NG', // Nigerian Hausa (may not be available)
          zulu: 'zu-ZA', // South African Zulu (may not be available)
          amharic: 'am-ET', // Ethiopian Amharic (may not be available)
          igbo: 'ig-NG', // Nigerian Igbo (may not be available)
          xhosa: 'xh-ZA', // South African Xhosa (may not be available)
          akan: 'ak-GH', // Ghanaian Akan (may not be available)
        };
        
        const languageCode = language?.id 
          ? languageMap[language.id] || 'en-US' 
          : 'en-US';
        
        console.warn('⚠️ Using device TTS (quality will be poor for African languages):', languageCode);
        
        // Try to speak with the language code, but it will likely fall back to English
        // if the language isn't supported
        Speech.speak(text, {
          language: languageCode,
          pitch: 1.0,
          rate: 0.8,
          onDone: () => {
            console.log('Speech finished');
            setConversationState(STATES.IDLE);
            setTimeout(() => {
              setShowTranscript(false);
            }, 2000);
          },
          onStopped: () => {
            console.log('Speech stopped');
            setConversationState(STATES.IDLE);
          },
          onError: (error) => {
            console.error('Speech error:', error);
            // If TTS fails, just show the text
            setConversationState(STATES.IDLE);
            setTranscript(text);
            if (!isRoleplay) {
              setShowTranscript(true);
            }
            setTimeout(() => {
              setShowTranscript(false);
            }, 5000);
          },
        });
        
        // Estimate speech duration (roughly 150 words per minute)
        const words = text.split(' ').length;
        const estimatedDuration = Math.max(2000, (words / 150) * 60 * 1000);
        
        // Fallback timeout in case onDone doesn't fire
        setTimeout(() => {
          if (conversationState === STATES.AI_SPEAKING) {
            setConversationState(STATES.IDLE);
            setTimeout(() => {
              setShowTranscript(false);
            }, 2000);
          }
        }, estimatedDuration);
        
      } catch (speechErr) {
        console.error('Failed to use device TTS:', speechErr);
        console.warn('⚠️ Device TTS unavailable. Showing text only.');
        
        // Final fallback: just show transcript with simulated timing
        setTranscript(text);
        if (!isRoleplay) {
          setShowTranscript(true);
        }
        const audioDuration = Math.max(2000, Math.min(5000, text.length * 100));
        
        setTimeout(() => {
          setConversationState(STATES.IDLE);
          setTimeout(() => {
            setShowTranscript(false);
          }, 3000);
        }, audioDuration);
      }
      
    } catch (err) {
      console.error('Failed to speak text:', err);
      setConversationState(STATES.IDLE);
    }
  };

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

  // Start audio recording
  const handlePTTPress = async () => {
    try {
      console.log('PTT button pressed - starting recording');
      
      // Don't start if already recording or processing
      if (
        recordingRef.current ||
        recording ||
        conversationState === STATES.PROCESSING ||
        conversationState === STATES.AI_SPEAKING
      ) {
        return;
      }

      Animated.spring(buttonScale, {
        toValue: 0.92,
        useNativeDriver: true,
      }).start();

      // Clean up any existing recording first
      if (recordingRef.current) {
        try {
          const prev = recordingRef.current;
          const status = await prev.getStatusAsync();
          if (status.isRecording) {
            await prev.stopAndUnloadAsync();
          }
        } catch (cleanupErr) {
          console.log('Cleaning up old recording:', cleanupErr);
        }
        recordingRef.current = null;
        setRecording(null);
      }

      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Microphone permission is required to record audio.');
        return;
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording — set ref before setState so a quick release still processes audio
      const recordingPreset = isRoleplay
        ? Audio.RecordingOptionsPresets.LOW_QUALITY
        : Audio.RecordingOptionsPresets.HIGH_QUALITY;
      const { recording: newRecording } = await Audio.Recording.createAsync(recordingPreset);

      recordingRef.current = newRecording;
      setRecording(newRecording);
      setConversationState(STATES.USER_SPEAKING);
      setTranscript('');
      if (!isRoleplay) {
        setShowTranscript(true);
      }
    } catch (err) {
      console.error('Failed to start recording:', err);
      
      // Clean up on error
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (cleanupErr) {
          // Ignore cleanup errors
        }
        recordingRef.current = null;
        setRecording(null);
      }
      
      if (err.message?.includes('Only one Recording')) {
        // Try to recover by cleaning up and retrying
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
          });
          recordingRef.current = null;
          setRecording(null);
          // Don't show alert for this, just log
          console.log('Cleaned up recording conflict');
        } catch (recoverErr) {
          console.error('Failed to recover from recording error:', recoverErr);
        }
      } else {
        Alert.alert('Error', 'Failed to start recording. Please try again.');
      }
    }
  };

  // Stop recording, transcribe, and send to AI
  const handlePTTRelease = async () => {
    try {
      console.log('PTT button released - processing audio');
      Animated.spring(buttonScale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();

      const rec = recordingRef.current;
      if (!rec) {
        setConversationState(STATES.IDLE);
        return;
      }

      const status = await rec.getStatusAsync();
      let uri = rec.getURI();
      try {
        if (status.isRecording) {
          await rec.stopAndUnloadAsync();
        }
      } catch (stopErr) {
        console.error('Error stopping recording:', stopErr);
      }
      if (!uri) {
        uri = rec.getURI();
      }
      recordingRef.current = null;
      setRecording(null);
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      if (!uri) {
        setConversationState(STATES.IDLE);
        Alert.alert(
          'Recording error',
          'Could not read the audio file. Try again, or use the iOS/Android app if you are on web.'
        );
        return;
      }

      setConversationState(STATES.PROCESSING);

      const fileType = Platform.OS === 'web' ? 'audio/webm' : 'audio/m4a';
      const fileName = Platform.OS === 'web' ? 'recording.webm' : 'recording.m4a';
      const audioFile = { uri, type: fileType, name: fileName };
      const languageId = language?.id || 'yoruba';

      if (!sessionReadyRef.current) {
        try {
          await authAPI.ensureAuthenticated({ light: true });
        } catch (authErr) {
          console.error('Authentication error:', authErr);
          setConversationState(STATES.IDLE);
          Alert.alert(
            'Authentication Error',
            'Failed to authenticate. Please ensure the backend server is running.'
          );
          return;
        }
      }

      let convId = conversationIdRef.current || conversationId;
      if (!convId) {
        try {
          const initResult = await conversationAPI.startConversation(...startConversationArgs());
          if (initResult.success && initResult.data.conversation) {
            convId = initResult.data.conversation.id;
            assignConversationId(convId);
            sessionReadyRef.current = true;
          } else {
            throw new Error('Failed to create conversation');
          }
        } catch (initErr) {
          console.error('Conversation initialization error:', initErr);
          setConversationState(STATES.IDLE);
          Alert.alert(
            'Error',
            initErr.response?.data?.message || initErr.message || 'Failed to create conversation.'
          );
          return;
        }
      }

      if (!convId) {
        setConversationState(STATES.IDLE);
        return;
      }

      try {
        let messageResult;
        if (isRoleplay) {
          messageResult = await conversationAPI.sendVoiceMessage(convId, audioFile, languageId);
        } else {
          const transcribeResult = await audioAPI.transcribe(audioFile, languageId);
          const rawText =
            transcribeResult.success && transcribeResult.data?.text != null
              ? String(transcribeResult.data.text).trim()
              : '';
          if (!rawText) {
            throw new Error(
              transcribeResult.success
                ? 'No speech detected — try holding the button a bit longer.'
                : 'Failed to transcribe audio'
            );
          }
          setTranscript(rawText);
          messageResult = await conversationAPI.sendMessage(convId, rawText);
        }

        const data = messageResult?.data;
        if (data?.transcription) {
          setTranscript(data.transcription);
        }
        const aiMessage = data?.aiMessage || data?.assistantMessage;
        const replyText =
          aiMessage?.content ??
          aiMessage?.text ??
          (typeof aiMessage === 'string' ? aiMessage : '') ??
          '';

        if (messageResult.success && replyText) {
          const vocab = aiMessage?.vocabularyWords;
          const audioUrl = aiMessage?.audioUrl;

          setConversationState(STATES.AI_SPEAKING);
          setTranscript(replyText);

          if (Array.isArray(vocab) && vocab.length > 0) {
            setVocabCount((prev) => prev + vocab.length);
          }

          if (audioUrl) {
            await playAudio(audioUrl);
          } else if (isRoleplay) {
            await speakText(replyText, { skipBackendTts: true });
          } else {
            try {
              const synthesizeResult = await audioAPI.synthesize(
                replyText,
                'normal',
                undefined,
                languageId
              );
              if (synthesizeResult.success && synthesizeResult.data.audioUrl) {
                await playAudio(synthesizeResult.data.audioUrl);
              } else {
                await speakText(replyText);
              }
            } catch {
              await speakText(replyText);
            }
          }
        } else {
          throw new Error(messageResult?.message || 'Failed to get AI response');
        }
      } catch (messageErr) {
        console.error('Message API error:', messageErr);
        setConversationState(STATES.IDLE);

        const serverMsg = messageErr.response?.data?.message || '';
        const isTranscribeFail =
          /transcrib|no speech|connection error/i.test(serverMsg) ||
          messageErr.code === 'ECONNABORTED';

        if (messageErr.response?.status === 401) {
          sessionReadyRef.current = false;
          Alert.alert('Authentication Required', 'Please sign in again and retry.');
        } else if (messageErr.response?.status === 404) {
          Alert.alert('Error', 'Conversation not found. Please start a new conversation.');
        } else if (isTranscribeFail) {
          Alert.alert(
            "Didn't catch that",
            'Network was slow or no speech was detected. Hold the button, speak clearly, and try again.'
          );
        } else {
          Alert.alert(
            'Error',
            serverMsg || messageErr.message || 'Failed to get AI response. Please try again.'
          );
        }
      }
    } catch (err) {
      console.error('Failed to process recording:', err);
      setConversationState(STATES.IDLE);
      setShowTranscript(false);
    }
  };

  // Get AI suggestions for responses
  const handleHelpMeRespond = async () => {
    // Ensure authenticated first
    try {
      await authAPI.ensureAuthenticated();
    } catch (authErr) {
      console.error('Authentication error in help me respond:', authErr);
      Alert.alert(
        'Authentication Error',
        'Failed to authenticate. Please ensure the backend server is running.'
      );
      return;
    }

    let currentConvId = conversationId;

    // Step 1: If no conversationId, create one
    if (!currentConvId) {
      try {
        console.log('Creating conversation for suggestions...');
        setLoading(true);
        const initResult = await conversationAPI.startConversation(...startConversationArgs());

        if (initResult.success && initResult.data.conversation) {
          currentConvId = initResult.data.conversation.id;
          assignConversationId(currentConvId);
          console.log('Conversation created for suggestions:', currentConvId);
        } else {
          throw new Error('Failed to create conversation');
        }
      } catch (initErr) {
        console.error('Failed to create conversation for suggestions:', initErr);
        setLoading(false);
        
        if (initErr.response?.status === 401) {
          try {
            await authAPI.ensureAuthenticated();
            Alert.alert('Authentication Retry', 'Please try again.');
          } catch (authRetryErr) {
            Alert.alert(
              'Authentication Required',
              'Failed to authenticate. Please ensure the backend server is running.'
            );
          }
        } else {
          Alert.alert('Error', initErr.response?.data?.message || 'Failed to create conversation. Please try again.');
        }
        return;
      }
    }

    // Step 2: Get suggestions from API
    try {
      console.log('Calling suggestions API...');
      setLoading(true);
      const result = await conversationAPI.getSuggestions(currentConvId);
      
      if (result.success && result.data.suggestions) {
        console.log('Suggestions received:', result.data.suggestions.length);
        setSuggestedResponses(result.data.suggestions);
        setShowHelpModal(true);
      } else {
        throw new Error('No suggestions in response');
      }
    } catch (err) {
      console.error('Suggestions API error:', err);
      
      if (err.response?.status === 401) {
        try {
          await authAPI.ensureAuthenticated();
          Alert.alert('Authentication Retry', 'Please try again.');
        } catch (authRetryErr) {
          Alert.alert(
            'Authentication Required',
            'Failed to authenticate. Please ensure the backend server is running.'
          );
        }
      } else {
        Alert.alert('Error', err.response?.data?.message || 'Failed to get suggestions. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Use selected suggested response
  const handleSelectResponse = async (response) => {
    setShowHelpModal(false);
    
    let currentConvId = conversationId;

    // Step 1: If no conversationId, create one
    if (!currentConvId) {
      try {
        console.log('Creating conversation for suggested response...');
        const initResult = await conversationAPI.startConversation(...startConversationArgs());

        if (initResult.success && initResult.data.conversation) {
          currentConvId = initResult.data.conversation.id;
          assignConversationId(currentConvId);
          console.log('Conversation created:', currentConvId);
        } else {
          throw new Error('Failed to create conversation');
        }
      } catch (initErr) {
        console.error('Failed to create conversation:', initErr);
        Alert.alert('Error', initErr.response?.data?.message || 'Failed to create conversation. Please try again.');
        return;
      }
    }

    setConversationState(STATES.PROCESSING);
    setTranscript(response.original || response.text);
    if (!isRoleplay) {
      setShowTranscript(true);
    }

    // Step 2: Send message to AI
    try {
      console.log('Sending suggested response to AI...');
      const result = await conversationAPI.sendMessage(currentConvId, response.original || response.text);
      
      if (result.success && result.data.aiMessage) {
        const aiMessage = result.data.aiMessage;
        console.log('AI response received:', aiMessage.content);
        
        setConversationState(STATES.AI_SPEAKING);
        setTranscript(aiMessage.content);

        // Update vocabulary
        if (aiMessage.vocabularyWords) {
          setVocabCount(prev => prev + aiMessage.vocabularyWords.length);
        }

        // Step 3: Play AI audio
        if (aiMessage.audioUrl) {
          console.log('Playing audio from URL:', aiMessage.audioUrl);
          await playAudio(aiMessage.audioUrl);
        } else {
          // Try to synthesize audio
          try {
            console.log('Synthesizing audio...');
            const languageId = language?.id || 'yoruba';
            const synthesizeResult = await audioAPI.synthesize(aiMessage.content, 'normal', undefined, languageId);
            if (synthesizeResult.success && synthesizeResult.data.audioUrl) {
              await playAudio(synthesizeResult.data.audioUrl);
            } else {
              await speakText(aiMessage.content);
            }
          } catch (synthErr) {
            console.error('Synthesis error:', synthErr);
            await speakText(aiMessage.content);
          }
        }
      } else {
        throw new Error('Failed to get AI response');
      }
    } catch (err) {
      console.error('Failed to send suggested response:', err);
      setConversationState(STATES.IDLE);
      
      // Handle specific errors
      if (err.response?.status === 401) {
        Alert.alert('Authentication Required', 'Please login to use AI features.');
      } else if (err.response?.status === 404) {
        Alert.alert('Error', 'Conversation not found. Please start a new conversation.');
      } else {
        Alert.alert('Error', err.response?.data?.message || 'Failed to send message. Please try again.');
      }
    }
  };

  const getStateConfig = () => {
    switch (conversationState) {
      case STATES.USER_SPEAKING:
        return {
          color: COLORS.userSpeaking || COLORS.primary,
          text: "You're speaking...",
          icon: 'mic',
        };
      case STATES.PROCESSING:
        return {
          color: COLORS.warning || COLORS.accent,
          text: 'Thinking...',
          icon: 'sync',
        };
      case STATES.AI_SPEAKING:
        return {
          color: COLORS.aiSpeaking || COLORS.success,
          text: 'AI is responding...',
          icon: 'volume-high',
        };
      default:
        return {
          color: COLORS.idle || COLORS.textMuted,
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

  // Show loading state while initializing
  if (loading && !conversationId && !error) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <LinearGradient
          colors={[COLORS.background, COLORS.backgroundLight, COLORS.surface]}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: COLORS.text, marginTop: SPACING.md }}>
          Starting conversation...
        </Text>
      </View>
    );
  }

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
                {culturalTips.length > 0 ? (culturalTips[currentTipIndex]?.tip || 'No tip available') : 'No cultural tips available. Start a conversation to see tips!'}
              </Text>
            </ScrollView>
        {!isRoleplay && culturalTips.length > 0 && (
              <View style={styles.tipIndicator}>
                {culturalTips.slice(0, 5).map((_, idx) => {
                  const isActive = idx === currentTipIndex % 5;
                  const dotStyles = [styles.tipDot];
                  if (isActive) {
                    dotStyles.push(styles.tipDotActive);
                  }
                  return (
                    <View
                      key={idx}
                      style={dotStyles}
                    />
                  );
                })}
              </View>
            )}
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
        {!isRoleplay && showTranscript && transcript && (
          <Animated.View style={[styles.transcriptContainer]}>
            <Text style={styles.transcriptLabel}>
              {conversationState === STATES.AI_SPEAKING ? 'AI:' : 'You:'}
            </Text>
            <Text style={styles.transcriptText}>{transcript}</Text>
          </Animated.View>
        )}
      </View>

      {/* Bottom Section - PTT Button */}
      {/* Countdown timer for roleplay */}
      {isRoleplay && timeLeft !== null && (
        <View style={styles.timerChip}>
          <Ionicons name="time" size={16} color={COLORS.text} />
          <Text style={styles.timerText}>
            {Math.floor(timeLeft / 60)
              .toString()
              .padStart(2, '0')}
            :
            {(timeLeft % 60).toString().padStart(2, '0')} left
          </Text>
        </View>
      )}

      <View style={styles.bottomSection}>
        {/* Roleplay actions: help & word bank */}
        {isRoleplay && !isSessionOver && conversationState === STATES.IDLE && (
          <View style={styles.roleplayActionsRow}>
            <TouchableOpacity
              style={styles.roleplayAction}
              onPress={handleHelpMeRespond}
              activeOpacity={0.7}
            >
              <Ionicons name="bulb-outline" size={18} color={COLORS.accent} />
              <Text style={styles.roleplayActionText}>I'm stuck, help me respond</Text>
            </TouchableOpacity>
            {/* Placeholder word bank trigger; actual words surface in modal/assistant */}
            <View style={[styles.roleplayAction, styles.roleplayWordBank]}>
              <Ionicons name="book-outline" size={18} color={COLORS.primary} />
              <Text style={styles.roleplayActionText}>Word bank</Text>
            </View>
          </View>
        )}

        {/* End conversation button for roleplay */}
        {isRoleplay && !isSessionOver && (
          <TouchableOpacity
            style={styles.endSessionButton}
            onPress={() => finishRoleplaySession(false)}
            activeOpacity={0.7}
            disabled={ending}
          >
            <Text style={styles.endSessionText}>
              {ending ? 'Ending…' : 'End conversation'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Help Me Respond Button (non-roleplay) */}
        {!isRoleplay && conversationState === STATES.IDLE && (
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
            disabled={
              conversationState === STATES.PROCESSING ||
              conversationState === STATES.AI_SPEAKING ||
              isSessionOver
            }
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
              <ActivityIndicator size="large" color={COLORS.text} />
            ) : (
              <Ionicons name="mic" size={40} color={COLORS.text} />
            )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.pttLabel}>
          {isSessionOver
            ? 'Session complete'
            : conversationState === STATES.USER_SPEAKING
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
        responses={suggestedResponses}
        language={language}
      />
    </View>
  );
};

const makeStyles = (COLORS) => StyleSheet.create({
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
  timerChip: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  roleplayActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  roleplayAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  roleplayWordBank: {
    backgroundColor: COLORS.surfaceLight,
  },
  roleplayActionText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    flexShrink: 1,
  },
  endSessionButton: {
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  endSessionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    fontWeight: '600',
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
