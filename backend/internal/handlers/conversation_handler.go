package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	
	"afrolingo-backend/internal/services"
)

type ConversationHandler struct {
	conversationService *services.ConversationService
}

func NewConversationHandler(conversationService *services.ConversationService) *ConversationHandler {
	return &ConversationHandler{conversationService: conversationService}
}

func (h *ConversationHandler) CreateConversation(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)

	var req services.CreateConversationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	conversation, err := h.conversationService.CreateConversation(userID, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(conversation)
}

func (h *ConversationHandler) GetConversations(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)

	limit := c.QueryInt("limit", 20)
	offset := c.QueryInt("offset", 0)

	conversations, total, err := h.conversationService.GetConversations(userID, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"conversations": conversations,
		"total":         total,
		"limit":         limit,
		"offset":        offset,
	})
}

func (h *ConversationHandler) GetConversation(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)
	conversationID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid conversation ID",
		})
	}

	conversation, err := h.conversationService.GetConversation(userID, conversationID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Conversation not found",
		})
	}

	return c.JSON(conversation)
}

func (h *ConversationHandler) SendMessage(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)
	conversationID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid conversation ID",
		})
	}

	var req services.SendMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	userMessage, aiMessage, err := h.conversationService.SendMessage(userID, conversationID, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"user_message": userMessage,
		"ai_message":   aiMessage,
	})
}

func (h *ConversationHandler) GetSummary(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)
	conversationID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid conversation ID",
		})
	}

	// Verify conversation belongs to user
	_, err = h.conversationService.GetConversation(userID, conversationID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Conversation not found",
		})
	}

	summary, err := h.conversationService.GenerateSummary(conversationID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"summary": summary,
	})
}

func (h *ConversationHandler) GetRecommendedResponses(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)
	conversationID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid conversation ID",
		})
	}

	// Verify conversation belongs to user
	_, err = h.conversationService.GetConversation(userID, conversationID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Conversation not found",
		})
	}

	responses, err := h.conversationService.GetRecommendedResponses(conversationID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"recommended_responses": responses,
	})
}

