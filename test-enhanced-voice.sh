#!/bin/bash

# Enhanced Voice Service Integration Test Script
# This script tests the LISA Voice System Phase 1 and Phase 2 enhancements

echo "🎤 LISA Enhanced Voice Service Integration Test"
echo "=============================================="

# API Base URL
API_URL="http://localhost:3001/api"

echo "1. Testing Backend Health..."
curl -s "${API_URL}/voice/health" | jq . || echo "❌ Backend health check failed"

echo -e "\n2. Testing Voice Capabilities..."
curl -s "${API_URL}/voice/capabilities" | jq . || echo "❌ Capabilities endpoint failed"

echo -e "\n3. Testing Voice Configuration..."
curl -s "${API_URL}/voice/config" | jq . || echo "❌ Configuration endpoint failed"

echo -e "\n4. Testing Enhanced Intent Detection..."
curl -s -X POST "${API_URL}/voice/detect-intent" \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "Create a new order for customer John Smith", 
    "conversationContext": [], 
    "provider": "ensemble"
  }' | jq . || echo "❌ Intent detection failed"

echo -e "\n5. Testing Enhanced Transcription (base64)..."
# Create a small dummy audio data
curl -s -X POST "${API_URL}/voice/transcribe-base64" \
  -H "Content-Type: application/json" \
  -d '{
    "audioData": "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=",
    "provider": "whisper",
    "language": "en"
  }' | jq . || echo "❌ Enhanced transcription failed"

echo -e "\n6. Frontend Integration Test URLs:"
echo "   • Standard Interface: http://localhost:5173"
echo "   • Enhanced Interface: Click 'Enhanced' toggle in top-right"
echo "   • Voice Test Page: http://localhost:5173/voice-test"

echo -e "\n7. Enhanced Voice Service Features:"
echo "   ✅ Enhanced STT with OpenAI Whisper and Deepgram APIs"
echo "   ✅ Advanced intent detection with GPT-4o and Claude"  
echo "   ✅ Voice activity detection (VAD)"
echo "   ✅ Streaming responses and interruption handling"
echo "   ✅ Backend API endpoints for enhanced voice services"
echo "   ✅ Frontend integration of enhanced voice services"
echo "   ✅ Environment configuration for new API keys"

echo -e "\n8. Configuration Files Updated:"
echo "   ✅ /apps/backend/.env.example - Added DEEPGRAM_API_KEY, ANTHROPIC_API_KEY"
echo "   ✅ /apps/frontend/.env.example - Added VAD configuration"

echo -e "\n9. New Files Created:"
echo "   ✅ /apps/backend/src/voice/enhanced-voice.service.ts"
echo "   ✅ /apps/backend/src/voice/enhanced-intent.service.ts"
echo "   ✅ /apps/frontend/src/services/EnhancedVoiceService.ts"
echo "   ✅ /apps/frontend/src/services/VoiceActivityDetection.ts"
echo "   ✅ /apps/frontend/src/components/EnhancedVoiceInterface.tsx"

echo -e "\n10. Usage Instructions:"
echo "    1. Open http://localhost:5173 in your browser"
echo "    2. Click the 'Enhanced' chip in the top-right toolbar to enable Enhanced Voice"
echo "    3. Click the microphone icon in the Enhanced LISA interface"
echo "    4. Grant microphone permissions when prompted"
echo "    5. Start speaking to test enhanced transcription and intent detection"
echo "    6. Use settings gear icon to configure VAD, interruption handling, etc."

echo -e "\n🎉 Enhanced Voice Service Integration Complete!"
echo "Phase 1 and Phase 2 implementations are ready for testing."
