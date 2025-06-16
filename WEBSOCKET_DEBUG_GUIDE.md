# 🔍 WebSocket Debugging Guide

## 1. Quick WebSocket Connection Test

### Test Your Render Backend WebSocket
```bash
# Install wscat for WebSocket testing (if not already installed)
npm install -g wscat

# Test your Render WebSocket directly
wscat -c wss://orderoverview-dkro.onrender.com

# You should see:
# Connected (press CTRL+C to quit)
```

## 2. Browser Console Debugging

Open your frontend in browser and check the **Network** tab:

### Steps:
1. Open DevTools (F12)
2. Go to **Network** tab
3. Filter by **WS** (WebSocket)
4. Reload the page
5. Look for WebSocket connections

### What to Look For:
- ✅ **Status 101**: WebSocket upgrade successful
- ❌ **Status 400/500**: Connection failed
- ❌ **No WS connections**: Frontend not attempting to connect

## 3. Console Log Analysis

Check browser console for these patterns:

### Success Patterns:
```
✅ LISA client connected: abc123 (Total: 1)
✅ WebSocket Connected to LISA
✅ LISA connected with session: abc123
```

### Error Patterns:
```
❌ WebSocket connection error: GF: xhr poll error
❌ Failed to load resource: net::ERR_CONNECTION_REFUSED
❌ WebSocket disconnected: transport close
```

## 4. Backend Health Check

Test if your Render backend is responding:

```bash
# Check if backend API is alive
curl -I https://orderoverview-dkro.onrender.com/api/docs

# Should return: HTTP/1.1 200 OK
```

## 5. Test WebSocket from Node.js

Create a test script to verify WebSocket connectivity:

```javascript
// test-websocket.js
const io = require('socket.io-client');

const socket = io('wss://orderoverview-dkro.onrender.com');

socket.on('connect', () => {
  console.log('✅ WebSocket Connected!');
  console.log('Socket ID:', socket.id);
});

socket.on('connected', (data) => {
  console.log('✅ LISA Connected:', data);
});

socket.on('connect_error', (error) => {
  console.log('❌ Connection Error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected:', reason);
});

// Test after 2 seconds
setTimeout(() => {
  socket.disconnect();
  process.exit(0);
}, 2000);
```

## 6. Environment Variable Verification

Check if Vite is using the correct environment variables:

```bash
# In your frontend directory
cd /Volumes/DevZone/OrderOverView/apps/frontend

# Check environment variables during build
echo "API URL: $VITE_API_URL"
echo "WebSocket URL: $VITE_WEBSOCKET_URL"
```

## 7. Render Backend Logs

Check your Render backend logs:

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Open your backend service
3. Click **Logs**
4. Look for WebSocket connection attempts

### Expected Log Patterns:
```
✅ LISA client connected: socketId (Total: 1)
✅ Application is running on: https://orderoverview-dkro.onrender.com
✅ WebSocket available at: wss://orderoverview-dkro.onrender.com
```

## 8. CORS Issues Check

Verify CORS configuration allows your frontend domain:

```bash
# Test CORS preflight
curl -X OPTIONS \
  -H "Origin: https://order-over-view-frontend.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  https://orderoverview-dkro.onrender.com/api/customers
```

## 9. Real-time WebSocket Test Page

Your backend has a built-in test page:

1. Visit: `https://orderoverview-dkro.onrender.com/voice-test.html`
2. Click "Test LISA Connection"
3. Check if it connects successfully

## 10. Common WebSocket Issues & Fixes

### Issue: "transport close" or "xhr poll error"
**Cause**: Socket.io fallback to HTTP polling failing
**Fix**: Ensure WebSocket protocol is allowed

### Issue: "ERR_CONNECTION_REFUSED"
**Cause**: Wrong URL or backend not running
**Fix**: Verify backend URL and status

### Issue: "CORS error"
**Cause**: Frontend domain not allowed in CORS
**Fix**: Update backend CORS configuration

### Issue: "Network timeout"
**Cause**: Render service sleeping or slow startup
**Fix**: Make HTTP request first to wake up service

## 11. Quick Debug Commands

Run these to debug your current setup:

```bash
# 1. Test backend health
curl https://orderoverview-dkro.onrender.com/api/docs

# 2. Check environment files
cat /Volumes/DevZone/OrderOverView/apps/frontend/.env.production

# 3. Test WebSocket with wscat
wscat -c wss://orderoverview-dkro.onrender.com

# 4. Check if frontend build includes correct URLs
cd /Volumes/DevZone/OrderOverView/apps/frontend
pnpm run build 2>&1 | grep -i "vite_"
```

## 12. Emergency Fallback Test

If WebSocket fails, test basic API connectivity:

```bash
# Test API endpoint
curl https://orderoverview-dkro.onrender.com/api/customers

# Should return JSON array of customers
```
