# Network Connection Troubleshooting Guide

## Problem: Android Emulator Can't Connect to Backend

If you're seeing `ERR_NETWORK` errors when trying to signup/login from Android emulator, the app is likely using `http://10.0.2.2:5000` (correct). The failure is usually one of: **cleartext HTTP blocked**, **firewall**, or **server not running**. Do these in order:

### Step 1: Allow cleartext HTTP (Android)

The project has `"usesCleartextTraffic": true` in `mobile/app.json` under `android` so the emulator can use `http://` (not just `https://`). If you removed it, add it back and run `npx expo start --clear`.

### Step 2: Confirm the server is running

In a separate terminal:

```bash
cd server
npm run dev
```

You should see: `🚀 Afro AI Server running on 0.0.0.0:5000`. Then on your **PC** (PowerShell):

```powershell
Invoke-WebRequest -Uri "http://localhost:5000/health"
```

If that fails, the server isn’t running or isn’t bound to the port.

### Step 3: Allow port 5000 through Windows Firewall

1. Open **Windows Defender Firewall** → **Advanced settings**.
2. Click **Inbound Rules** → **New Rule**.
3. Choose **Port** → Next → **TCP**, **Specific local ports**: `5000` → Next.
4. Allow the connection → Next → check **Private** (and **Public** if you use it) → Next.
5. Name it e.g. "Node API 5000" → Finish.

### Step 4: Test from inside the emulator

In the Android emulator, open the **Chrome** (or Browser) app and go to:

`http://10.0.2.2:5000/health`

If you see JSON (`"Afro AI Server is running"`), the emulator can reach the backend and the app should work after a reload. If this fails, the firewall or server binding is still the issue.

---

## Quick Fix Options

### Option 1: Use Your Local IP Address (Recommended)

Your computer's local IP is: **192.168.1.123**

1. **Update the API URL in the mobile app:**
   - Open `mobile/src/services/api.js`
   - Find the `getApiBase()` function
   - For Android, change from `http://10.0.2.2:5000` to `http://192.168.1.123:5000`

2. **Or use environment variable:**
   - Create/update `mobile/.env` file:
     ```
     EXPO_PUBLIC_API_URL=http://192.168.1.123:5000
     ```
   - Restart Expo: `npx expo start --clear`

### Option 2: Check Windows Firewall

1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Firewall"
3. Find "Node.js JavaScript Runtime" and make sure both Private and Public are checked
4. If not listed, click "Allow another app" and add Node.js

### Option 3: Restart Server with Explicit Binding

The server should be listening on `0.0.0.0:5000` (all interfaces). Restart your server:

```bash
cd server
npm run dev
```

You should see:
```
🚀 Afro AI Server running on 0.0.0.0:5000
🔗 Network access: http://192.168.1.123:5000/health
```

## Testing Connectivity

### Test 1: Check if server is accessible
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/health"
```

### Test 2: Check if server is listening on all interfaces
```powershell
netstat -an | Select-String ":5000"
```
Should show: `TCP    0.0.0.0:5000           0.0.0.0:0              LISTENING`

### Test 3: Test from Android Emulator
1. Open Android Emulator
2. Open browser in emulator
3. Navigate to: `http://10.0.2.2:5000/health`
4. If this works, the emulator can reach your server
5. If not, try: `http://192.168.1.123:5000/health`

## Platform-Specific URLs

- **Android Emulator**: `http://10.0.2.2:5000` (default) or `http://YOUR_LOCAL_IP:5000`
- **iOS Simulator**: `http://localhost:5000`
- **Web Browser**: `http://localhost:5000`
- **Physical Device**: `http://YOUR_LOCAL_IP:5000` (find with `ipconfig` on Windows)

## Still Not Working?

1. **Check server logs** - Make sure server is actually running
2. **Check mobile app logs** - Look for `[API]` prefixed messages
3. **Try web version** - Run `npx expo start --web` to test if API works in browser
4. **Check CORS** - Server should allow all origins in development (`CORS_ORIGIN=*`)

## Common Issues

### Issue: "Network Error" on Android
**Solution**: Use local IP (`192.168.1.123`) instead of `10.0.2.2`

### Issue: "Connection refused"
**Solution**: Make sure server is running and firewall allows Node.js

### Issue: "Timeout"
**Solution**: Check if server is accessible from emulator browser first

