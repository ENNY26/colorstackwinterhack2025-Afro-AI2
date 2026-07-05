import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/colors';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { authAPI } from '../services';
import { useAuth } from '../context/AuthContext';

const VerifyPhoneScreen = ({ navigation, route }) => {
  const { colors: COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { pendingToken, phone, mode = 'signup' } = route.params || {};
  const { setIsAuthenticated } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const isLogin = mode === 'login';
  const title = isLogin ? 'Security code' : 'Verify your phone';
  const subtitle = isLogin
    ? `Enter the code sent to ${phone || 'your phone'} to sign in`
    : `Enter the code sent to ${phone || 'your phone'} to finish signing up`;

  const handleVerify = async () => {
    if (!code.trim() || code.trim().length < 4) {
      Alert.alert('Invalid code', 'Please enter the verification code from your SMS.');
      return;
    }

    setLoading(true);
    try {
      const result = isLogin
        ? await authAPI.confirmLoginOtp(pendingToken, code.trim())
        : await authAPI.confirmPhoneSignup(pendingToken, code.trim());

      if (result.success) {
        setIsAuthenticated(true);
        navigation.replace('LanguageSelection');
      } else {
        Alert.alert('Verification failed', result.message || 'Invalid code');
      }
    } catch (err) {
      Alert.alert(
        'Verification failed',
        err.response?.data?.message || err.message || 'Could not verify code'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const result = await authAPI.resendPhoneCode(pendingToken);
      if (result.success) {
        Alert.alert('Code sent', `A new code was sent to ${result.data?.phone || phone || 'your phone'}.`);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={[COLORS.background, COLORS.backgroundLight]} style={StyleSheet.absoluteFill} />

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="phone-portrait-outline" size={48} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <TextInput
          style={styles.codeInput}
          placeholder="6-digit code"
          placeholderTextColor={COLORS.textMuted}
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={8}
          autoFocus
        />

        <TouchableOpacity style={styles.primaryButton} onPress={handleVerify} disabled={loading}>
          <LinearGradient colors={COLORS.gradientOrange} style={styles.buttonGradient}>
            {loading ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <Text style={styles.buttonText}>Verify</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} disabled={resending} style={styles.resend}>
          <Text style={styles.resendText}>
            {resending ? 'Sending…' : "Didn't get a code? Resend"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  iconWrap: {
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  codeInput: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 56,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: SPACING.lg,
  },
  primaryButton: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  buttonGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  resend: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  resendText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
  },
  back: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  backText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.md,
  },
});

export default VerifyPhoneScreen;
