# AfroLingo App Flow

## Navigation Structure

```
App Navigator (Stack)
│
├── HomeTabs (Bottom Tab Navigator)
│   ├── Home Tab
│   │   └── HomeScreen
│   ├── Proverb Tab
│   │   └── ProverbScreen
│   ├── History Tab
│   │   └── HistoryScreen
│   └── Settings Tab
│       └── SettingsScreen
│
├── LanguageSelection (Stack Screen)
│   └── LanguageSelectionScreen
│
└── Conversation (Stack Screen)
    └── ConversationScreen
```

## User Flow

### 1. Home Screen
- **Quick Actions**:
  - "Start Conversation" button → Language Selection
  - Conversation type cards → Language Selection (with conversation type)
  
- **Proverb of the Day Card**:
  - Tap → Proverb Screen (via tab navigation)
  
- **Recent Conversations**:
  - Tap conversation → Conversation Screen
  - "See All" → History Screen (via tab navigation)

### 2. Language Selection Screen
- Search/filter languages
- Select language → Conversation Screen
- Can pass conversation type parameter

### 3. Conversation Screen
- Chat interface with AI
- Voice recording button
- Recommended responses
- Settings menu button → Settings Screen

### 4. Proverb Screen
- View daily proverb
- Switch between languages
- View previous proverbs

### 5. History Screen
- View all conversations
- Search conversations
- View conversation summaries
- Tap conversation → Conversation Screen

### 6. Settings Screen
- Voice selection
- Audio settings (auto-play)
- Notification settings
- App information

## Key Features Implementation

### AI Conversation
- Real-time chat interface
- Message history
- AI response simulation (to be connected to backend)

### 10 African Languages
- Swahili, Yoruba, Igbo, Hausa, Zulu, Xhosa, Amharic, Wolof, Afrikaans, Fula
- Language selection with native names
- Flag emojis for visual identification

### Proverb of the Day
- Daily proverb display
- Translation and meaning
- Language switching
- Previous proverbs list

### Conversation History
- List of all conversations
- Search functionality
- Conversation summaries
- Message count
- Timestamps

### Voice Options
- Male/Female voice selection
- Settings screen integration
- (Voice playback to be implemented with backend)

### Conversation Types
- Casual Chat
- Language Learning
- Cultural Exchange
- Business
- Storytelling

## Design System

### Colors
- Primary: #FF6B35 (Orange)
- Secondary: #004E89 (Blue)
- Accent: #FFA500 (Gold)
- Background: #F5F5F5 (Light Gray)
- Surface: #FFFFFF (White)

### Typography
- Headers: Bold, 20-32px
- Body: Regular, 14-16px
- Captions: Regular, 12px

### Spacing
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- xxl: 48px

