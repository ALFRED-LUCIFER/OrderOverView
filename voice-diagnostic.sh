#!/bin/bash

echo "🎤 LISA Voice Diagnostic Tool"
echo "=============================="
echo ""

# Check API status
echo "1. 🔍 Checking API Status..."
echo "   • Voice Service Health:"
curl -s http://localhost:3001/api/voice/health | jq '.' 2>/dev/null || curl -s http://localhost:3001/api/voice/health
echo ""

echo "   • ElevenLabs Status:"
curl -s http://localhost:3001/api/voice/elevenlabs/status | jq '.' 2>/dev/null || curl -s http://localhost:3001/api/voice/elevenlabs/status
echo ""

echo "   • ElevenLabs Quota:"
curl -s http://localhost:3001/api/voice/elevenlabs/quota | jq '.quota.character_count, .quota.character_limit' 2>/dev/null || curl -s http://localhost:3001/api/voice/elevenlabs/quota
echo ""

# Test voice synthesis
echo "2. 🔊 Testing Voice Synthesis..."
echo "   Testing ElevenLabs TTS..."
curl -X POST http://localhost:3001/api/voice/elevenlabs/test \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello! This is LISA testing voice synthesis. Can you hear me?"}'
echo ""

# Check enhanced capabilities
echo "3. 🧠 Checking Enhanced Capabilities..."
curl -s http://localhost:3001/api/voice/enhanced-capabilities | jq '.' 2>/dev/null || curl -s http://localhost:3001/api/voice/enhanced-capabilities
echo ""

echo "4. 📋 Troubleshooting Guide:"
echo "   If you can't hear LISA:"
echo "   • Check browser audio is not muted"
echo "   • Check system volume is up"
echo "   • Allow microphone permissions in browser"
echo "   • Try clicking the audio enable button first"
echo "   • Make sure you're speaking clearly for 2-3 seconds"
echo ""
echo "   If LISA can't understand you:"
echo "   • Speak clearly and loudly"
echo "   • Avoid background noise"
echo "   • Try saying 'Hello LISA' or 'Test voice'"
echo "   • Check microphone permissions"
echo ""
echo "✅ Voice diagnostic complete!"
echo "📍 Frontend: http://localhost:5173"
echo "📍 Backend: http://localhost:3001"
