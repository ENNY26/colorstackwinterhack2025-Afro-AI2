package services

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	
	"afrolingo-backend/internal/ai"
	"afrolingo-backend/internal/models"
)

type ConversationService struct {
	db          *gorm.DB
	openAIClient *ai.OpenAIClient
}

func NewConversationService(db *gorm.DB, openAIClient *ai.OpenAIClient) *ConversationService {
	return &ConversationService{
		db:          db,
		openAIClient: openAIClient,
	}
}

type CreateConversationRequest struct {
	Language        string `json:"language" validate:"required"`
	LanguageCode    string `json:"language_code" validate:"required"`
	ConversationType string `json:"conversation_type" validate:"required"`
}

type SendMessageRequest struct {
	Content     string `json:"content" validate:"required"`
	AudioURL    string `json:"audio_url,omitempty"`
	Transcription string `json:"transcription,omitempty"`
}

func (s *ConversationService) CreateConversation(userID uuid.UUID, req CreateConversationRequest) (*models.Conversation, error) {
	conversation := models.Conversation{
		ID:              uuid.New(),
		UserID:          userID,
		Language:        req.Language,
		LanguageCode:    req.LanguageCode,
		ConversationType: req.ConversationType,
		Title:           "New Conversation",
		MessageCount:    0,
		LastMessageAt:   time.Now(),
	}

	if err := s.db.Create(&conversation).Error; err != nil {
		return nil, err
	}

	return &conversation, nil
}

func (s *ConversationService) GetConversations(userID uuid.UUID, limit, offset int) ([]models.Conversation, int64, error) {
	var conversations []models.Conversation
	var total int64

	query := s.db.Where("user_id = ?", userID)
	
	if err := query.Model(&models.Conversation{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Order("last_message_at DESC").Limit(limit).Offset(offset).Find(&conversations).Error; err != nil {
		return nil, 0, err
	}

	return conversations, total, nil
}

func (s *ConversationService) GetConversation(userID, conversationID uuid.UUID) (*models.Conversation, error) {
	var conversation models.Conversation
	if err := s.db.Preload("Messages").Where("id = ? AND user_id = ?", conversationID, userID).First(&conversation).Error; err != nil {
		return nil, err
	}
	return &conversation, nil
}

func (s *ConversationService) SendMessage(userID, conversationID uuid.UUID, req SendMessageRequest) (*models.Message, *models.Message, error) {
	// Verify conversation belongs to user
	var conversation models.Conversation
	if err := s.db.Where("id = ? AND user_id = ?", conversationID, userID).First(&conversation).Error; err != nil {
		return nil, nil, errors.New("conversation not found")
	}

	// Create user message
	userMessage := models.Message{
		ID:             uuid.New(),
		ConversationID: conversationID,
		Role:           "user",
		Content:        req.Content,
		AudioURL:       req.AudioURL,
		Transcription:  req.Transcription,
		Language:       conversation.LanguageCode,
	}

	if err := s.db.Create(&userMessage).Error; err != nil {
		return nil, nil, err
	}

	// Get conversation history
	var messages []models.Message
	s.db.Where("conversation_id = ?", conversationID).Order("created_at ASC").Find(&messages)

	// Prepare messages for AI
	chatMessages := make([]ai.ChatMessage, 0)
	for _, msg := range messages {
		chatMessages = append(chatMessages, ai.ChatMessage{
			Role:    msg.Role,
			Content: msg.Content,
		})
	}

	// Get AI response
	chatResp, err := s.openAIClient.Chat(chatMessages, conversation.LanguageCode, conversation.ConversationType)
	if err != nil {
		return nil, nil, err
	}

	aiContent := ""
	if len(chatResp.Choices) > 0 {
		aiContent = chatResp.Choices[0].Message.Content
	}

	// Create AI message
	aiMessage := models.Message{
		ID:             uuid.New(),
		ConversationID: conversationID,
		Role:           "assistant",
		Content:        aiContent,
		Language:       conversation.LanguageCode,
	}

	if err := s.db.Create(&aiMessage).Error; err != nil {
		return nil, nil, err
	}

	// Update conversation
	conversation.MessageCount += 2
	conversation.LastMessageAt = time.Now()
	if conversation.Title == "New Conversation" && len(messages) == 0 {
		// Generate title from first message
		if len(req.Content) > 50 {
			conversation.Title = req.Content[:50] + "..."
		} else {
			conversation.Title = req.Content
		}
	}
	s.db.Save(&conversation)

	return &userMessage, &aiMessage, nil
}

func (s *ConversationService) GenerateSummary(conversationID uuid.UUID) (string, error) {
	var messages []models.Message
	if err := s.db.Where("conversation_id = ?", conversationID).Order("created_at ASC").Find(&messages).Error; err != nil {
		return "", err
	}

	// Build summary prompt
	summaryPrompt := "Summarize this conversation in 2-3 sentences: "
	for _, msg := range messages {
		summaryPrompt += msg.Role + ": " + msg.Content + "\n"
	}

	chatMessages := []ai.ChatMessage{
		{Role: "system", Content: "You are a helpful assistant that creates concise summaries."},
		{Role: "user", Content: summaryPrompt},
	}

	chatResp, err := s.openAIClient.Chat(chatMessages, "en", "casual")
	if err != nil {
		return "", err
	}

	summary := ""
	if len(chatResp.Choices) > 0 {
		summary = chatResp.Choices[0].Message.Content
	}

	// Update conversation summary
	var conversation models.Conversation
	if err := s.db.First(&conversation, conversationID).Error; err == nil {
		conversation.Summary = summary
		s.db.Save(&conversation)
	}

	return summary, nil
}

func (s *ConversationService) GetRecommendedResponses(conversationID uuid.UUID) ([]string, error) {
	var messages []models.Message
	if err := s.db.Where("conversation_id = ?", conversationID).Order("created_at DESC").Limit(5).Find(&messages).Error; err != nil {
		return nil, err
	}

	var conversation models.Conversation
	if err := s.db.First(&conversation, conversationID).Error; err != nil {
		return nil, err
	}

	// Build prompt for recommended responses
	prompt := "Based on this conversation context, suggest 3 short, natural responses the user could say next (in " + conversation.Language + "):\n"
	for i := len(messages) - 1; i >= 0; i-- {
		prompt += messages[i].Role + ": " + messages[i].Content + "\n"
	}

	chatMessages := []ai.ChatMessage{
		{Role: "system", Content: "You are a helpful language tutor. Suggest 3 short, natural responses."},
		{Role: "user", Content: prompt},
	}

	chatResp, err := s.openAIClient.Chat(chatMessages, conversation.LanguageCode, conversation.ConversationType)
	if err != nil {
		return nil, err
	}

	// Parse responses (simple split by newline)
	responses := []string{}
	if len(chatResp.Choices) > 0 {
		content := chatResp.Choices[0].Message.Content
		// Simple parsing - in production, use better parsing
		responses = append(responses, content)
	}

	return responses, nil
}

