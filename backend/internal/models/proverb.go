package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Proverb struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Language    string    `gorm:"not null;index" json:"language"`
	LanguageCode string   `gorm:"not null" json:"language_code"`
	Proverb     string    `gorm:"type:text;not null" json:"proverb"`
	Translation string    `gorm:"type:text;not null" json:"translation"`
	Meaning     string    `gorm:"type:text" json:"meaning"`
	Date        time.Time `gorm:"not null;index" json:"date"`
	IsActive    bool      `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

