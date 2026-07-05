export const TRIBES = [
  { id: 'yoruba', label: 'Yoruba' },
  { id: 'igbo', label: 'Igbo' },
  { id: 'hausa', label: 'Hausa' },
  { id: 'swahili', label: 'Swahili' },
  { id: 'zulu', label: 'Zulu' },
  { id: 'amharic', label: 'Amharic' },
  { id: 'xhosa', label: 'Xhosa' },
  { id: 'akan', label: 'Akan' },
];

export const NATIONALITIES = [
  'Nigeria',
  'Ghana',
  'Kenya',
  'South Africa',
  'Ethiopia',
  'Tanzania',
  'Uganda',
  'Senegal',
  'Cameroon',
  'Ivory Coast',
  'United States',
  'United Kingdom',
  'Canada',
  'Other',
];

// Country dial codes for the phone-number selector (E.164 prefixes).
export const COUNTRY_DIAL_CODES = [
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭' },
  { code: 'KE', name: 'Kenya', dial: '+254', flag: '🇰🇪' },
  { code: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
  { code: 'ET', name: 'Ethiopia', dial: '+251', flag: '🇪🇹' },
  { code: 'TZ', name: 'Tanzania', dial: '+255', flag: '🇹🇿' },
  { code: 'UG', name: 'Uganda', dial: '+256', flag: '🇺🇬' },
  { code: 'SN', name: 'Senegal', dial: '+221', flag: '🇸🇳' },
  { code: 'CM', name: 'Cameroon', dial: '+237', flag: '🇨🇲' },
  { code: 'CI', name: "Côte d'Ivoire", dial: '+225', flag: '🇨🇮' },
];

// Map a selected nationality to a sensible default dial code.
export const NATIONALITY_TO_DIAL = {
  Nigeria: '+234',
  Ghana: '+233',
  Kenya: '+254',
  'South Africa': '+27',
  Ethiopia: '+251',
  Tanzania: '+255',
  Uganda: '+256',
  Senegal: '+221',
  Cameroon: '+237',
  'Ivory Coast': '+225',
  'United States': '+1',
  'United Kingdom': '+44',
  Canada: '+1',
  Other: '+1',
};
