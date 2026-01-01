package ai

import (
	"fmt"
	"strings"
)

// PromptEngine handles custom prompt engineering for African languages
type PromptEngine struct {
	languageContexts map[string]LanguageContext
}

type LanguageContext struct {
	Name           string
	NativeName     string
	Greetings      []string
	CommonPhrases  []string
	CulturalNotes  []string
	GrammarTips    []string
}

func NewPromptEngine() *PromptEngine {
	engine := &PromptEngine{
		languageContexts: make(map[string]LanguageContext),
	}

	// Initialize language contexts
	engine.initializeLanguageContexts()
	return engine
}

func (pe *PromptEngine) initializeLanguageContexts() {
	pe.languageContexts["swahili"] = LanguageContext{
		Name:       "Swahili",
		NativeName: "Kiswahili",
		Greetings:  []string{"Jambo", "Habari", "Hujambo", "Shikamoo"},
		CommonPhrases: []string{
			"Asante sana (Thank you very much)",
			"Karibu (Welcome/You're welcome)",
			"Pole pole (Slowly/Calmly)",
			"Hakuna matata (No worries)",
		},
		CulturalNotes: []string{
			"Swahili is a Bantu language with Arabic influences",
			"Respect is shown through greetings like 'Shikamoo' to elders",
			"Swahili is widely spoken across East Africa",
		},
		GrammarTips: []string{
			"Noun classes are important in Swahili",
			"Verbs are conjugated with prefixes",
		},
	}

	pe.languageContexts["yoruba"] = LanguageContext{
		Name:       "Yoruba",
		NativeName: "Èdè Yorùbá",
		Greetings:  []string{"Bawo ni", "Ẹ káàbọ̀", "Ẹ kú ìrọ̀lẹ́"},
		CommonPhrases: []string{
			"Ẹ ṣé (Thank you)",
			"Káàbọ̀ (Welcome)",
			"Ẹ kú àárọ̀ (Good morning)",
			"Ẹ kú ọ̀sán (Good afternoon)",
		},
		CulturalNotes: []string{
			"Yoruba has three tones: high, mid, and low",
			"Respect is shown through honorifics",
			"Yoruba culture values proverbs and oral tradition",
		},
		GrammarTips: []string{
			"Tone is crucial for meaning",
			"Verbs come before subjects",
		},
	}

	// Add more languages as needed
}

func (pe *PromptEngine) BuildSystemPrompt(languageCode, conversationType string) string {
	context, exists := pe.languageContexts[languageCode]
	if !exists {
		context = pe.languageContexts["swahili"] // Default fallback
	}

	var prompt strings.Builder

	prompt.WriteString(fmt.Sprintf("You are a helpful AI language tutor for %s (%s).\n\n", context.Name, context.NativeName))
	
	// Add conversation type context
	switch conversationType {
	case "casual":
		prompt.WriteString("You are engaging in casual, everyday conversation. Be friendly and natural.\n\n")
	case "learning":
		prompt.WriteString("You are teaching the language. Provide gentle corrections and explanations when appropriate.\n\n")
	case "cultural":
		prompt.WriteString("You are sharing cultural knowledge and traditions. Include cultural context in your responses.\n\n")
	case "business":
		prompt.WriteString("You are engaging in professional business communication. Use formal language appropriately.\n\n")
	case "storytelling":
		prompt.WriteString("You are telling stories and folktales. Use engaging narrative style.\n\n")
	default:
		prompt.WriteString("You are having a general conversation.\n\n")
	}

	// Add language-specific context
	if len(context.Greetings) > 0 {
		prompt.WriteString("Common greetings: " + strings.Join(context.Greetings, ", ") + "\n")
	}
	if len(context.CommonPhrases) > 0 {
		prompt.WriteString("Common phrases: " + strings.Join(context.CommonPhrases[:min(3, len(context.CommonPhrases))], ", ") + "\n")
	}

	prompt.WriteString("\nGuidelines:\n")
	prompt.WriteString("- Respond naturally in " + context.Name + ", mixing with English when appropriate for learning\n")
	prompt.WriteString("- Be patient, encouraging, and culturally sensitive\n")
	prompt.WriteString("- Provide corrections gently when needed\n")
	prompt.WriteString("- Share cultural context when relevant\n")
	prompt.WriteString("- Keep responses concise and conversational\n")
	
	if len(context.CulturalNotes) > 0 {
		prompt.WriteString("\nCultural context: " + context.CulturalNotes[0] + "\n")
	}

	return prompt.String()
}

func (pe *PromptEngine) BuildLearningPrompt(languageCode, userMessage string, previousMessages []ChatMessage) string {
	context, exists := pe.languageContexts[languageCode]
	if !exists {
		context = pe.languageContexts["swahili"]
	}

	var prompt strings.Builder
	prompt.WriteString("The user said: " + userMessage + "\n\n")
	prompt.WriteString("Provide:\n")
	prompt.WriteString("1. A natural response in " + context.Name + "\n")
	prompt.WriteString("2. A brief explanation if there are grammar points to learn\n")
	prompt.WriteString("3. Cultural context if relevant\n")

	return prompt.String()
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

