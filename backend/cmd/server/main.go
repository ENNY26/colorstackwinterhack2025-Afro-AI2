package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/websocket/v2"
	
	"afrolingo-backend/internal/config"
	"afrolingo-backend/internal/database"
	"afrolingo-backend/internal/handlers"
	"afrolingo-backend/internal/middleware"
	"afrolingo-backend/internal/services"
	"afrolingo-backend/internal/ai"
	"afrolingo-backend/internal/storage"
	"afrolingo-backend/pkg/websocket"
)

func main() {
	// Load configuration
	if err := config.LoadConfig(); err != nil {
		log.Fatal("Failed to load config: ", err)
	}

	// Connect to database
	if err := database.Connect(); err != nil {
		log.Fatal("Failed to connect to database: ", err)
	}

	// Run migrations
	if err := database.AutoMigrate(); err != nil {
		log.Fatal("Failed to migrate database: ", err)
	}

	// Initialize services
	openAIClient := ai.NewOpenAIClient()
	authService := services.NewAuthService(database.DB)
	conversationService := services.NewConversationService(database.DB, openAIClient)

	// Initialize S3 client
	s3Client, err := storage.NewS3Client()
	if err != nil {
		log.Printf("Warning: Failed to initialize S3 client: %v", err)
		s3Client = nil
	}

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	conversationHandler := handlers.NewConversationHandler(conversationService)
	audioHandler := handlers.NewAudioHandler(s3Client, openAIClient, conversationService)

	// Initialize WebSocket hub
	wsHub := websocket.NewHub()
	go wsHub.Run()

	// Create Fiber app
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     config.AppConfig.CORS.AllowedOrigins,
		AllowCredentials: true,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS",
	}))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
			"service": "afrolingo-backend",
		})
	})

	// API routes
	api := app.Group("/api/v1")

	// Auth routes
	auth := api.Group("/auth")
	auth.Post("/register", authHandler.Register)
	auth.Post("/login", authHandler.Login)
	auth.Post("/refresh", authHandler.RefreshToken)
	auth.Post("/logout", authHandler.Logout)

	// Conversation routes (protected)
	conversations := api.Group("/conversations", middleware.AuthMiddleware())
	conversations.Post("/", conversationHandler.CreateConversation)
	conversations.Get("/", conversationHandler.GetConversations)
	conversations.Get("/:id", conversationHandler.GetConversation)
	conversations.Post("/:id/messages", conversationHandler.SendMessage)
	conversations.Get("/:id/summary", conversationHandler.GetSummary)
	conversations.Get("/:id/recommended", conversationHandler.GetRecommendedResponses)

	// Audio routes (protected)
	audio := api.Group("/audio", middleware.AuthMiddleware())
	audio.Post("/upload", audioHandler.UploadAudio)
	audio.Post("/tts", audioHandler.TextToSpeech)

	// WebSocket endpoint
	app.Get("/ws", websocket.New(func(c *websocket.Conn) {
		client := &websocket.Client{
			ID:   c.Params("id"),
			Conn: c,
			Send: make(chan []byte, 256),
			Hub:  wsHub,
		}
		client.Hub.register <- client

		go client.WritePump()
		client.ReadPump()
	}))

	// Start server
	port := config.AppConfig.Server.Port
	log.Printf("Server starting on port %s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatal("Failed to start server: ", err)
	}
}

