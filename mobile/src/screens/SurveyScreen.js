import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/colors';
import { api, authAPI } from '../services';

const SurveyScreen = ({ navigation, route }) => {
  const { language, personality } = route.params || {};

  const [level, setLevel] = useState('beginner');
  const [reason, setReason] = useState('travel');
  const [dailyGoal, setDailyGoal] = useState('15');
  const [focusArea, setFocusArea] = useState('confidence');
  const [loading, setLoading] = useState(false);

  const generatePlan = () => {
    const plan = {
      language: language?.id || 'yoruba',
      level,
      reason,
      dailyGoal: Number(dailyGoal),
      focusArea,
      personality: personality?.id || null,
      createdAt: Date.now(),
    };

    plan.languageName = language?.name || 'Yoruba';
    // Simple plan generation - can be expanded with backend later
    plan.summary = `A ${level} ${language?.name || 'Yoruba'} plan focused on ${focusArea} with ${dailyGoal} minutes/day for ${reason}.`;

    return plan;
  };

  const handleSubmit = () => {
    (async () => {
      try {
        // ensure auth token exists (creates guest if needed in dev)
        await authAPI.ensureAuthenticated();

        const payload = {
          language: language?.id || 'yoruba',
          level,
          reason,
          dailyGoal: Number(dailyGoal),
          focusArea,
        };

        setLoading(true);
        const resp = await api.post('/plans', payload);
        let plan = resp.data?.data?.plan || resp.data?.data?.raw || generatePlan();
        if (typeof plan === 'string') plan = generatePlan();
        plan.languageName = plan.languageName || language?.name || 'Yoruba';
        plan.language = plan.language || language?.id || 'yoruba';
        plan.level = plan.level ?? level;
        plan.reason = plan.reason ?? reason;
        plan.focusArea = plan.focusArea ?? focusArea;
        plan.dailyGoal = plan.dailyGoal ?? plan.dailyMinutes ?? Number(dailyGoal);
        if (!Array.isArray(plan.lessons)) plan.lessons = [];
        navigation.replace('PlanSummary', { plan });
      } catch (err) {
        console.error('Plan generation failed:', err);
        Alert.alert('Error', 'Failed to create plan. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  };

  const langName = language?.name || 'Yoruba';

  const reasonOptions = [
    { id: 'travel', label: 'Travel' },
    { id: 'career', label: 'Career boost' },
    { id: 'culture', label: 'Culture & heritage' },
    { id: 'family', label: 'Family & friends' },
    { id: 'fun', label: 'Fun & curiosity' },
    { id: 'other', label: 'Other' },
  ];

  const focusOptions = [
    { id: 'confidence', label: 'Gain confidence' },
    { id: 'listening', label: 'Improve listening' },
    { id: 'speaking', label: 'Improve speaking' },
    { id: 'vocabulary', label: 'Build vocabulary' },
    { id: 'grammar', label: 'Grammar' },
    { id: 'other', label: 'Other' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.backgroundLight]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Personalize your plan</Text>
        <Text style={styles.subtitle}>A few quick questions so we can tailor your {langName} journey</Text>

        <Text style={styles.label}>How much {langName} do you know?</Text>
        <View style={styles.row}>
          {['beginner', 'intermediate', 'advanced'].map((opt) => (
            <TouchableOpacity key={opt} style={[styles.option, level === opt && styles.optionActive]} onPress={() => setLevel(opt)}>
              <Text style={[styles.optionText, level === opt && styles.optionTextActive]}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Why do you want to learn {langName}?</Text>
        <View style={styles.row}>
          {reasonOptions.map(({ id, label }) => (
            <TouchableOpacity key={id} style={[styles.option, reason === id && styles.optionActive]} onPress={() => setReason(id)}>
              <Text style={[styles.optionText, reason === id && styles.optionTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>What's your daily learning goal?</Text>
        <View style={styles.row}>
          {['10', '15', '30', '60'].map((opt) => (
            <TouchableOpacity key={opt} style={[styles.option, dailyGoal === opt && styles.optionActive]} onPress={() => setDailyGoal(opt)}>
              <Text style={[styles.optionText, dailyGoal === opt && styles.optionTextActive]}>{opt} min</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>What area do you want to improve in the most?</Text>
        <View style={styles.row}>
          {focusOptions.map(({ id, label }) => (
            <TouchableOpacity key={id} style={[styles.option, focusArea === id && styles.optionActive]} onPress={() => setFocusArea(id)}>
              <Text style={[styles.optionText, focusArea === id && styles.optionTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.continueButton} onPress={handleSubmit} activeOpacity={0.8} disabled={loading}>
          <LinearGradient colors={COLORS.gradientOrange} style={styles.continueGradient}>
            {loading ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.continueText}>Create my plan</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingTop: 80 },
  title: { fontSize: FONT_SIZES.xxl, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.sm },
  subtitle: { color: COLORS.textSecondary, marginBottom: SPACING.lg },
  label: { color: COLORS.textMuted, marginTop: SPACING.md, marginBottom: SPACING.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  option: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, marginRight: SPACING.sm, marginBottom: SPACING.sm },
  optionActive: { borderWidth: 1, borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  optionText: { color: COLORS.textSecondary },
  optionTextActive: { color: COLORS.primary, fontWeight: '600' },
  continueButton: { marginTop: SPACING.lg, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden' },
  continueGradient: { paddingVertical: SPACING.lg, alignItems: 'center' },
  continueText: { color: COLORS.text, fontSize: FONT_SIZES.lg, fontWeight: 'bold' },
});

export default SurveyScreen;
