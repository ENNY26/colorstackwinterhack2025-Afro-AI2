package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	
	"afrolingo-backend/internal/ai"
	"afrolingo-backend/internal/services"
	"afrolingo-backend/internal/storage"
)

type AudioHandler struct {
	s3Client         *storage.S3Client
	openAIClient     *ai.OpenAIClient
	conversationService *services.ConversationService
}

func NewAudioHandler(s3Client *storage.S3Client, openAIClient *ai.OpenAIClient, conversationService *services.ConversationService) *AudioHandler {
	return &AudioHandler{
		s3Client:         s3Client,
		openAIClient:     openAIClient,
		conversationService: conversationService,
	}
}

type UploadAudioRequest struct {
	ConversationID uuid.UUID `json:"conversation_id"`
	Language       string    `json:"language"`
}

func (h *AudioHandler) UploadAudio(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)

	// Get audio file from form
	file, err := c.FormFile("audio")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Audio file required",
		})
	}

	// Read file
	src, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to read file",
		})
	}
	defer src.Close()

	audioData := make([]byte, file.Size)
	if _, err := src.Read(audioData); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to read file data",
		})
	}

	// Upload to S3
	audioURL, err := h.s3Client.UploadAudio(audioData, file.Header.Get("Content-Type"))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to upload audio",
		})
	}

	// Transcribe audio using Whisper
	language := c.FormValue("language", "en")
	transcription, err := h.openAIClient.TranscribeAudio(audioData, language)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to transcribe audio",
		})
	}

	return c.JSON(fiber.Map{
		"audio_url":    audioURL,
		"transcription": transcription,
	})
}

func (h *AudioHandler) TextToSpeech(c *fiber.Ctx) error {
	var req struct {
		Text   string `json:"text" validate:"required"`
		Voice  string `json:"voice" validate:"required"`
		Language string `json:"language"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Generate speech
	audioData, err := h.openAIClient.TextToSpeech(req.Text, req.Voice)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate speech",
		})
	}

	// Upload to S3
	audioURL, err := h.s3Client.UploadAudio(audioData, "audio/mpeg")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to upload audio",
		})
	}

	return c.JSON(fiber.Map{
		"audio_url": audioURL,
	})
}

