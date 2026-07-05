import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/colors';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { authAPI, API_BASE } from '../services';
import {
  TRIBES,
  NATIONALITIES,
  COUNTRY_DIAL_CODES,
  NATIONALITY_TO_DIAL,
} from '../constants/authOptions';

const SignupScreen = ({ navigation }) => {
  const { colors: COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dialCode, setDialCode] = useState(NATIONALITY_TO_DIAL.Nigeria || '+234');
  const [dialCodeTouched, setDialCodeTouched] = useState(false);
  const [showDialPicker, setShowDialPicker] = useState(false);
  const [tribe, setTribe] = useState('yoruba');
  const [nationality, setNationality] = useState('Nigeria');
  const [age, setAge] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!tribe) {
      newErrors.tribe = 'Please select your tribe';
    }

    if (!nationality) {
      newErrors.nationality = 'Please select your nationality';
    }

    const ageNum = parseInt(age, 10);
    if (!age.trim()) {
      newErrors.age = 'Age is required';
    } else if (Number.isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
      newErrors.age = 'Enter a valid age (13–120)';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Local digits only, drop any leading zeros (national trunk prefix),
      // then attach the selected country dial code → full E.164.
      const localDigits = phone.trim().replace(/\D/g, '').replace(/^0+/, '');
      const fullPhone = `${dialCode}${localDigits}`;

      const result = await authAPI.register({
        name: name.trim(),
        email: email.trim(),
        phone: fullPhone,
        tribe,
        nationality,
        age: parseInt(age, 10),
        password,
      });

      if (result.success && result.data?.requiresPhoneVerification) {
        navigation.navigate('VerifyPhone', {
          pendingToken: result.data.pendingToken,
          phone: result.data.phone,
          mode: 'signup',
        });
      } else if (result.success) {
        Alert.alert('Success!', 'Account created.', [
          { text: 'OK', onPress: () => navigation.replace('LanguageSelection') },
        ]);
      } else {
        Alert.alert('Signup Failed', result.message || 'Failed to create account');
      }
    } catch (err) {
      const status = err.response?.status;

      // Handle network errors specifically
      if (err.code === 'NETWORK_ERROR' || err.message === 'Network Error' || !err.response) {
        Alert.alert(
          'Connection Error',
          'Unable to connect to the server. Please make sure:\n\n1. The backend server is running\n2. You are using the correct API URL\n3. Your device/emulator can reach the server',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Prefer a validation message from the server when available
      let errorMessage = err.message || 'Failed to create account. Please try again.';

      if (err.response?.data) {
        const data = err.response.data;
        // If server returned structured validation errors (express-validator)
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          errorMessage = data.errors.map(e => e.msg).join(' \n');
        } else if (data.message) {
          errorMessage = data.message;
        }
      }

      if (err.response?.status === 404) {
        Alert.alert(
          'Server Not Found',
          `The signup endpoint was not found. Make sure the backend is running at ${API_BASE} and try again.`
        );
        return;
      }

      if (err.response?.status === 503) {
        Alert.alert(
          'Database Unavailable',
          'The server cannot reach MongoDB. Sign up will not work until the database is connected.'
        );
        return;
      }

      const isDuplicate =
        status === 409 ||
        (status === 400 && errorMessage.toLowerCase().includes('already registered'));

      if (isDuplicate) {
        const dupMessage = errorMessage.toLowerCase().includes('phone')
          ? 'That phone number is already registered. Sign in instead, or use a different number.'
          : `An account with ${email.trim()} is already registered. Sign in with your password, or use a different email.`;
        Alert.alert(
          'Account already exists',
          dupMessage,
          [
            { text: 'Try again', style: 'cancel' },
            {
              text: 'Sign In',
              onPress: () => navigation.navigate('Login', { email: email.trim() }),
            },
          ]
        );
        return;
      }

      console.error('Signup error:', err);
      Alert.alert('Signup Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundLight]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={COLORS.gradientOrange}
              style={styles.logoGradient}
            >
              <Ionicons name="chatbubbles" size={48} color={COLORS.text} />
            </LinearGradient>
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start your language learning journey</Text>
        </View>

        <View style={styles.form}>
          {/* Name Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Full Name"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors({ ...errors, name: null });
              }}
              autoCapitalize="words"
            />
          </View>
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="Email"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({ ...errors, email: null });
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TouchableOpacity
              style={styles.dialCodeButton}
              onPress={() => setShowDialPicker(true)}
            >
              <Text style={styles.dialCodeText}>{dialCode}</Text>
              <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
            </TouchableOpacity>
            <TextInput
              style={[styles.input, styles.phoneInput, errors.phone && styles.inputError]}
              placeholder="Phone number"
              placeholderTextColor={COLORS.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

          <Modal
            visible={showDialPicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDialPicker(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowDialPicker(false)}
            >
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Select country code</Text>
                <FlatList
                  data={COUNTRY_DIAL_CODES}
                  keyExtractor={(item) => `${item.code}-${item.dial}`}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.dialRow}
                      onPress={() => {
                        setDialCode(item.dial);
                        setDialCodeTouched(true);
                        setShowDialPicker(false);
                      }}
                    >
                      <Text style={styles.dialRowFlag}>{item.flag}</Text>
                      <Text style={styles.dialRowName}>{item.name}</Text>
                      <Text style={styles.dialRowCode}>{item.dial}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableOpacity>
          </Modal>

          <Text style={styles.sectionLabel}>Tribe / heritage language</Text>
          <View style={styles.chipRow}>
            {TRIBES.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.chip, tribe === t.id && styles.chipActive]}
                onPress={() => setTribe(t.id)}
              >
                <Text style={[styles.chipText, tribe === t.id && styles.chipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.tribe && <Text style={styles.errorText}>{errors.tribe}</Text>}

          <Text style={styles.sectionLabel}>Nationality</Text>
          <View style={styles.chipRow}>
            {NATIONALITIES.map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.chip, nationality === n && styles.chipActive]}
                onPress={() => {
                  setNationality(n);
                  if (!dialCodeTouched && NATIONALITY_TO_DIAL[n]) {
                    setDialCode(NATIONALITY_TO_DIAL[n]);
                  }
                }}
              >
                <Text style={[styles.chipText, nationality === n && styles.chipTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.nationality && <Text style={styles.errorText}>{errors.nationality}</Text>}

          <View style={styles.inputContainer}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, errors.age && styles.inputError]}
              placeholder="Age"
              placeholderTextColor={COLORS.textMuted}
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
          {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="Password"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: null });
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, errors.confirmPassword && styles.inputError]}
              placeholder="Confirm Password"
              placeholderTextColor={COLORS.textMuted}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
              }}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

          {/* Signup Button */}
          <TouchableOpacity
            style={styles.signupButton}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={COLORS.gradientOrange}
              style={styles.buttonGradient}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (COLORS) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoContainer: {
    marginBottom: SPACING.lg,
  },
  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  phoneInput: {
    marginLeft: SPACING.sm,
  },
  dialCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: SPACING.sm,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    height: 32,
  },
  dialCodeText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginRight: 2,
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  dialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dialRowFlag: {
    fontSize: FONT_SIZES.lg,
    marginRight: SPACING.md,
  },
  dialRowName: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  dialRowCode: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  eyeIcon: {
    padding: SPACING.xs,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: FONT_SIZES.sm,
    marginTop: -SPACING.sm,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.md,
  },
  signupButton: {
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.lg,
  },
  loginText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.md,
  },
  loginLink: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.md,
  },
  chip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '22',
  },
  chipText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default SignupScreen;


