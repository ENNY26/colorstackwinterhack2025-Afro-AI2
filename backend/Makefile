.PHONY: run build test clean migrate

# Run the server
run:
	go run cmd/server/main.go

# Build the server
build:
	go build -o bin/server cmd/server/main.go

# Run tests
test:
	go test ./...

# Clean build artifacts
clean:
	rm -rf bin/

# Install dependencies
deps:
	go mod download
	go mod tidy

# Run database migrations (auto-migrated on startup)
migrate:
	@echo "Migrations run automatically on server startup"

# Format code
fmt:
	go fmt ./...

# Lint code
lint:
	golangci-lint run

# Run with hot reload (requires air)
dev:
	air

