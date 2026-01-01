package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Conversation struct {
	ID              uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID          uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	Language        string    `gorm:"not null" json:"language"`
	LanguageCode    string    `gorm:"not null" json:"language_code"`
	ConversationType string   `gorm:"not null" json:"conversation_type"`
	Title           string    `json:"title"`
	Summary         string    `gorm:"type:text" json:"summary"`
	MessageCount    int       `gorm:"default:0" json:"message_count"`
	LastMessageAt   time.Time `json:"last_message_at"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
	
	User     User      `gorm:"foreignKey:UserID" json:"-"`
	Messages []Message `gorm:"foreignKey:ConversationID" json:"messages,omitempty"`
}

type Message struct {
	ID             uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	ConversationID uuid.UUID `gorm:"type:uuid;not null;index" json:"conversation_id"`
	Role           string    `gorm:"not null" json:"role"` // "user" or "assistant"
	Content        string    `gorm:"type:text;not null" json:"content"`
	AudioURL       string    `json:"audio_url,omitempty"`
	Transcription  string    `gorm:"type:text" json:"transcription,omitempty"`
	Language       string    `json:"language"`
	CreatedAt      time.Time `json:"created_at"`
	
	Conversation Conversation `gorm:"foreignKey:ConversationID" json:"-"`
}

type RecommendedResponse struct {
	ID             uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	ConversationID uuid.UUID `gorm:"type:uuid;not null;index" json:"conversation_id"`
	Response       string    `gorm:"type:text;not null" json:"response"`
	Language       string    `json:"language"`
	CreatedAt      time.Time `json:"created_at"`
	
	Conversation Conversation `gorm:"foreignKey:ConversationID" json:"-"`
}

