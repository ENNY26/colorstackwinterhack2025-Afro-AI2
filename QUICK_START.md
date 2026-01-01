# Quick Start Guide

## Prerequisites

### Mobile App
- Node.js 16+ and npm
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone

### Backend
- Go 1.21+
- PostgreSQL database
- OpenAI API key
- AWS account (for S3)

## Mobile App Setup

1. Navigate to mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Scan QR code with Expo Go app or press `a` for Android / `i` for iOS

## Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install Go dependencies:
```bash
go mod download
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` and fill in:
   - Database credentials
   - JWT secret
   - OpenAI API key
   - AWS credentials
   - S3 bucket name

5. Set up PostgreSQL database:
```sql
CREATE DATABASE afrolingo;
```

6. Run the server:
```bash
go run cmd/server/main.go
```

Or use Make:
```bash
make run
```

The server will start on `http://localhost:8080`

## Testing the API

### Health Check
```bash
curl http://localhost:8080/health
```

### Register a User
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## Connecting Mobile App to Backend

Update the API base URL in your mobile app configuration:

```javascript
// mobile/src/constants/api.js (create this file)
export const API_BASE_URL = 'http://localhost:8080/api/v1';
```

For Android emulator, use `http://10.0.2.2:8080`
For iOS simulator, use `http://localhost:8080`
For physical device, use your computer's IP address: `http://YOUR_IP:8080`

## Next Steps

1. Set up your OpenAI API key
2. Configure AWS S3 bucket
3. Update mobile app to connect to backend
4. Test the full flow: register → login → create conversation → send message

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running
- Verify database credentials in `.env`
- Ensure port 8080 is not in use

### Mobile app can't connect to backend
- Check backend is running
- Verify CORS settings in backend
- Use correct IP address for your device
- Check firewall settings

### Database connection errors
- Ensure PostgreSQL is installed and running
- Verify database exists: `CREATE DATABASE afrolingo;`
- Check connection string in `.env`

