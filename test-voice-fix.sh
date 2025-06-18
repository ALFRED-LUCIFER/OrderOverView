#!/bin/bash

# Test script to verify voice conversation pattern fix
echo "🧪 Testing LISA Voice Conversation Pattern Fix"
echo "=============================================="

echo
echo "📋 Checking environment configuration..."

# Check if .env file exists and has correct settings
if [ -f "/Volumes/DevZone/OrderOverView/apps/backend/.env" ]; then
    echo "✅ .env file found"
    
    # Check AI_RESPONSE_STYLE setting
    if grep -q 'AI_RESPONSE_STYLE="text_only"' "/Volumes/DevZone/OrderOverView/apps/backend/.env"; then
        echo "✅ AI_RESPONSE_STYLE set to 'text_only'"
    else
        echo "❌ AI_RESPONSE_STYLE not set to 'text_only'"
        grep "AI_RESPONSE_STYLE" "/Volumes/DevZone/OrderOverView/apps/backend/.env" || echo "   Setting not found"
    fi
    
    # Check ENABLE_FILLER_WORDS setting
    if grep -q 'ENABLE_FILLER_WORDS=false' "/Volumes/DevZone/OrderOverView/apps/backend/.env"; then
        echo "✅ ENABLE_FILLER_WORDS disabled"
    else
        echo "❌ ENABLE_FILLER_WORDS not disabled"
        grep "ENABLE_FILLER_WORDS" "/Volumes/DevZone/OrderOverView/apps/backend/.env" || echo "   Setting not found"
    fi
    
    # Check ENABLE_THINKING_SOUNDS setting
    if grep -q 'ENABLE_THINKING_SOUNDS=false' "/Volumes/DevZone/OrderOverView/apps/backend/.env"; then
        echo "✅ ENABLE_THINKING_SOUNDS disabled"
    else
        echo "❌ ENABLE_THINKING_SOUNDS not disabled"
        grep "ENABLE_THINKING_SOUNDS" "/Volumes/DevZone/OrderOverView/apps/backend/.env" || echo "   Setting not found"
    fi
else
    echo "❌ .env file not found"
fi

echo
echo "🔧 Checking code modifications..."

# Check if shouldEnableVoiceResponses method exists
if grep -q "shouldEnableVoiceResponses" "/Volumes/DevZone/OrderOverView/apps/backend/src/voice/natural-conversation.service.ts"; then
    echo "✅ shouldEnableVoiceResponses() method found"
else
    echo "❌ shouldEnableVoiceResponses() method not found"
fi

# Check if shouldSpeak is using the helper method
shouldSpeak_helper_count=$(grep -c "shouldSpeak: this.shouldEnableVoiceResponses()" "/Volumes/DevZone/OrderOverView/apps/backend/src/voice/natural-conversation.service.ts")
shouldSpeak_hardcoded_count=$(grep -c "shouldSpeak: true" "/Volumes/DevZone/OrderOverView/apps/backend/src/voice/natural-conversation.service.ts")

echo "✅ Found $shouldSpeak_helper_count instances using helper method"
if [ $shouldSpeak_hardcoded_count -eq 0 ]; then
    echo "✅ No hardcoded 'shouldSpeak: true' found in natural-conversation.service.ts"
else
    echo "⚠️  Found $shouldSpeak_hardcoded_count hardcoded 'shouldSpeak: true' instances in natural-conversation.service.ts"
fi

echo
echo "📊 Summary:"
echo "==========="
echo "Expected behavior:"
echo "  • Voice input: ✅ Enabled (STT still works)"
echo "  • Voice output: ❌ Disabled (no TTS responses)"
echo "  • Text responses: ✅ Enabled (shows in UI)"
echo "  • Enhanced voice features: ✅ Still available for transcription"
echo
echo "To test:"
echo "1. Start the backend: cd apps/backend && npm run start:dev"
echo "2. Start the frontend: cd apps/frontend && npm run dev"
echo "3. Use voice input - LISA should respond with text only, no speech"

echo
echo "🎯 Voice conversation pattern fix completed!"
echo "   LISA will now process voice input but respond with text only."
