package services

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	
	"afrolingo-backend/internal/config"
	"afrolingo-backend/internal/models"
	"afrolingo-backend/pkg/jwt"
)

type AuthService struct {
	db *gorm.DB
}

func NewAuthService(db *gorm.DB) *AuthService {
	return &AuthService{db: db}
}

type RegisterRequest struct {
	Email     string `json:"email" validate:"required,email"`
	Username  string `json:"username" validate:"required,min=3,max=30"`
	Password  string `json:"password" validate:"required,min=8"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

func (s *AuthService) Register(req RegisterRequest) (*models.User, *jwt.TokenPair, error) {
	// Check if user exists
	var existingUser models.User
	if err := s.db.Where("email = ? OR username = ?", req.Email, req.Username).First(&existingUser).Error; err == nil {
		return nil, nil, errors.New("user with this email or username already exists")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, nil, err
	}

	// Create user
	user := models.User{
		ID:        uuid.New(),
		Email:     req.Email,
		Username:  req.Username,
		Password:  string(hashedPassword),
		FirstName: req.FirstName,
		LastName:  req.LastName,
		IsActive:  true,
	}

	if err := s.db.Create(&user).Error; err != nil {
		return nil, nil, err
	}

	// Generate tokens
	tokenPair, err := jwt.GenerateTokenPair(
		user.ID,
		user.Email,
		user.Username,
		config.AppConfig.JWT.Secret,
		config.AppConfig.JWT.AccessExpiry,
		config.AppConfig.JWT.RefreshExpiry,
	)
	if err != nil {
		return nil, nil, err
	}

	// Save refresh token
	refreshToken := models.RefreshToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		Token:     tokenPair.RefreshToken,
		ExpiresAt: time.Now().Add(config.AppConfig.JWT.RefreshExpiry),
	}
	s.db.Create(&refreshToken)

	return &user, tokenPair, nil
}

func (s *AuthService) Login(req LoginRequest) (*models.User, *jwt.TokenPair, error) {
	var user models.User
	if err := s.db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		return nil, nil, errors.New("invalid email or password")
	}

	if !user.IsActive {
		return nil, nil, errors.New("account is deactivated")
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, nil, errors.New("invalid email or password")
	}

	// Generate tokens
	tokenPair, err := jwt.GenerateTokenPair(
		user.ID,
		user.Email,
		user.Username,
		config.AppConfig.JWT.Secret,
		config.AppConfig.JWT.AccessExpiry,
		config.AppConfig.JWT.RefreshExpiry,
	)
	if err != nil {
		return nil, nil, err
	}

	// Save refresh token
	refreshToken := models.RefreshToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		Token:     tokenPair.RefreshToken,
		ExpiresAt: time.Now().Add(config.AppConfig.JWT.RefreshExpiry),
	}
	s.db.Create(&refreshToken)

	return &user, tokenPair, nil
}

func (s *AuthService) RefreshToken(req RefreshTokenRequest) (*jwt.TokenPair, error) {
	var refreshToken models.RefreshToken
	if err := s.db.Where("token = ? AND expires_at > ?", req.RefreshToken, time.Now()).First(&refreshToken).Error; err != nil {
		return nil, errors.New("invalid or expired refresh token")
	}

	var user models.User
	if err := s.db.First(&user, refreshToken.UserID).Error; err != nil {
		return nil, errors.New("user not found")
	}

	// Generate new token pair
	tokenPair, err := jwt.GenerateTokenPair(
		user.ID,
		user.Email,
		user.Username,
		config.AppConfig.JWT.Secret,
		config.AppConfig.JWT.AccessExpiry,
		config.AppConfig.JWT.RefreshExpiry,
	)
	if err != nil {
		return nil, err
	}

	// Delete old refresh token
	s.db.Delete(&refreshToken)

	// Save new refresh token
	newRefreshToken := models.RefreshToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		Token:     tokenPair.RefreshToken,
		ExpiresAt: time.Now().Add(config.AppConfig.JWT.RefreshExpiry),
	}
	s.db.Create(&newRefreshToken)

	return tokenPair, nil
}

func (s *AuthService) Logout(refreshToken string) error {
	return s.db.Where("token = ?", refreshToken).Delete(&models.RefreshToken{}).Error
}

