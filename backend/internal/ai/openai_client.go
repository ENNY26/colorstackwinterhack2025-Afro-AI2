package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"time"

	"afrolingo-backend/internal/config"
)

type OpenAIClient struct {
	APIKey      string
	Model       string
	WhisperModel string
	HTTPClient  *http.Client
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatRequest struct {
	Model    string       `json:"model"`
	Messages []ChatMessage `json:"messages"`
	Temperature float64   `json:"temperature,omitempty"`
	MaxTokens   int       `json:"max_tokens,omitempty"`
}

type ChatResponse struct {
	ID      string `json:"id"`
	Choices []struct {
		Message ChatMessage `json:"message"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
}

type TranscriptionRequest struct {
	Model       string `json:"model"`
	File        []byte `json:"-"`
	Language    string `json:"language,omitempty"`
	Prompt      string `json:"prompt,omitempty"`
	Temperature float64 `json:"temperature,omitempty"`
}

type TranscriptionResponse struct {
	Text string `json:"text"`
}

type TTSRequest struct {
	Model string `json:"model"`
	Input string `json:"input"`
	Voice string `json:"voice"`
}

func NewOpenAIClient() *OpenAIClient {
	return &OpenAIClient{
		APIKey:       config.AppConfig.OpenAI.APIKey,
		Model:        config.AppConfig.OpenAI.Model,
		WhisperModel: config.AppConfig.OpenAI.WhisperModel,
		HTTPClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

func (c *OpenAIClient) Chat(messages []ChatMessage, language string, conversationType string) (*ChatResponse, error) {
	// Build system prompt based on language and conversation type
	systemPrompt := c.buildSystemPrompt(language, conversationType)
	
	fullMessages := []ChatMessage{
		{Role: "system", Content: systemPrompt},
	}
	fullMessages = append(fullMessages, messages...)

	reqBody := ChatRequest{
		Model:    c.Model,
		Messages: fullMessages,
		Temperature: 0.7,
		MaxTokens: 500,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.APIKey))

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("OpenAI API error: %s", string(body))
	}

	var chatResp ChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
		return nil, err
	}

	return &chatResp, nil
}

func (c *OpenAIClient) TranscribeAudio(audioData []byte, language string) (string, error) {
	// Create multipart form data
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	// Add file
	fileWriter, err := writer.CreateFormFile("file", "audio.mp3")
	if err != nil {
		return "", err
	}
	fileWriter.Write(audioData)

	// Add model
	writer.WriteField("model", c.WhisperModel)
	if language != "" {
		writer.WriteField("language", language)
	}

	writer.Close()

	req, err := http.NewRequest("POST", "https://api.openai.com/v1/audio/transcriptions", &buf)
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.APIKey))

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("OpenAI Whisper API error: %s", string(body))
	}

	var transResp TranscriptionResponse
	if err := json.NewDecoder(resp.Body).Decode(&transResp); err != nil {
		return "", err
	}

	return transResp.Text, nil
}

func (c *OpenAIClient) TextToSpeech(text string, voice string) ([]byte, error) {
	reqBody := TTSRequest{
		Model: "tts-1",
		Input: text,
		Voice: voice, // "alloy", "echo", "fable", "onyx", "nova", "shimmer"
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", "https://api.openai.com/v1/audio/speech", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.APIKey))

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("OpenAI TTS API error: %s", string(body))
	}

	audioData, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	return audioData, nil
}

func (c *OpenAIClient) SetPromptEngine(engine *PromptEngine) {
	// This can be used to integrate custom prompt engine
}

func (c *OpenAIClient) buildSystemPrompt(language string, conversationType string) string {
	languageNames := map[string]string{
		"swahili":   "Swahili (Kiswahili)",
		"yoruba":    "Yoruba (Èdè Yorùbá)",
		"igbo":      "Igbo (Asụsụ Igbo)",
		"hausa":     "Hausa (Harshen Hausa)",
		"zulu":      "Zulu (isiZulu)",
		"xhosa":     "Xhosa (isiXhosa)",
		"amharic":   "Amharic (አማርኛ)",
		"wolof":      "Wolof",
		"afrikaans": "Afrikaans",
		"fula":      "Fula (Fulfulde)",
	}

	conversationTypes := map[string]string{
		"casual":      "casual everyday conversation",
		"learning":    "language learning and practice",
		"cultural":    "cultural exchange and traditions",
		"business":    "professional business communication",
		"storytelling": "storytelling and folktales",
	}

	langName := languageNames[language]
	if langName == "" {
		langName = language
	}

	convType := conversationTypes[conversationType]
	if convType == "" {
		convType = "general conversation"
	}

	return fmt.Sprintf(`You are a helpful AI language tutor for %s. 
You are engaging in %s. 
- Respond naturally in %s, mixing with English when appropriate for learning
- Be patient, encouraging, and culturally sensitive
- Provide corrections gently when needed
- Share cultural context when relevant
- Keep responses concise and conversational`, langName, convType, langName)
}

