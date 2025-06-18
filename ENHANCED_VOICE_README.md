# LISA Enhanced Voice System - Phase 1 & 2 Implementation

## Overview

The LISA (Language Intelligence Support Assistant) Enhanced Voice System provides advanced speech-to-text, intent detection, and voice activity capabilities for the Glass Order Management System. This implementation includes both Phase 1 and Phase 2 enhancements.

## 🚀 New Features

### Phase 1 Enhancements
- **Enhanced STT**: OpenAI Whisper and Deepgram API integration
- **Advanced Intent Detection**: GPT-4o and Claude 3.5 Sonnet with ensemble methods
- **Voice Activity Detection (VAD)**: Real-time speech detection and analysis
- **Streaming Responses**: Optimized for real-time conversation

### Phase 2 Enhancements
- **Interruption Handling**: Smart conversation flow control
- **Multi-provider Fallbacks**: Automatic failover between services
- **Enhanced Audio Processing**: High-quality audio capture and analysis
- **Context-aware Conversations**: Maintains conversation history and context

## 🏗️ Architecture

### Backend Services

#### Enhanced Voice Service (`enhanced-voice.service.ts`)
- OpenAI Whisper STT integration
- Deepgram STT integration  
- Smart transcription with auto-fallback
- Voice activity detection analysis
- Audio preprocessing capabilities

#### Enhanced Intent Service (`enhanced-intent.service.ts`)
- GPT-4o intent detection with emotional intelligence
- Claude 3.5 Sonnet integration
- Ensemble method combining multiple AI providers
- Streaming response generation
- Comprehensive fallback mechanisms

#### Voice Controller API Endpoints
- `POST /api/voice/transcribe` - Multi-provider transcription
- `POST /api/voice/transcribe-base64` - Base64 audio transcription
- `POST /api/voice/detect-intent` - Enhanced intent detection
- `POST /api/voice/voice-activity` - Voice activity detection
- `POST /api/voice/stream-response` - Streaming responses
- `GET /api/voice/capabilities` - Available service capabilities

### Frontend Components

#### Enhanced Voice Service (`EnhancedVoiceService.ts`)
- Advanced audio capture with MediaRecorder API
- Real-time voice activity detection
- Multi-provider transcription support
- Intent detection integration
- Interruption handling

#### Voice Activity Detection (`VoiceActivityDetection.ts`)
- Real-time audio analysis
- Speech vs. silence detection
- Volume and frequency analysis
- Wake word detection support

#### Enhanced Voice Interface (`EnhancedVoiceInterface.tsx`)
- Modern React UI with Material-UI
- Real-time status indicators
- Configuration controls
- Connection monitoring

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
# STT Providers
OPENAI_API_KEY=your_openai_key
DEEPGRAM_API_KEY=your_deepgram_key

# Intent Detection
ANTHROPIC_API_KEY=your_anthropic_key

# Provider Configuration
DEFAULT_STT_PROVIDER=whisper
DEFAULT_INTENT_PROVIDER=ensemble
ENABLE_FALLBACK=true

# VAD Configuration
VAD_THRESHOLD=0.02
VAD_WINDOW_SIZE=512
VAD_SMOOTHING_FACTOR=0.8
```

#### Frontend (.env)
```bash
# Voice Configuration
VITE_ENABLE_VOICE=true
VITE_API_URL=http://localhost:3001/api
VITE_WEBSOCKET_URL=ws://localhost:3001

# VAD Settings
VITE_VAD_THRESHOLD=0.02
VITE_VAD_WINDOW_SIZE=512
VITE_ENABLE_INTERRUPTION=true
```

## 🎮 Usage

### Quick Start

1. **Start the backend server:**
   ```bash
   pnpm run dev:backend
   ```

2. **Start the frontend server:**
   ```bash
   pnpm run dev:frontend
   ```

3. **Open your browser:**
   Navigate to `http://localhost:5173`

4. **Enable Enhanced Voice:**
   Click the "Enhanced" chip in the top-right toolbar

5. **Start Conversation:**
   Click the microphone icon in the Enhanced LISA interface

### Interface Switching

You can switch between the Standard and Enhanced voice interfaces using the toggle in the application toolbar:

- **Standard**: Uses browser speech recognition and ElevenLabs TTS
- **Enhanced**: Uses advanced STT providers, AI intent detection, and VAD

### Configuration Options

The Enhanced Voice Interface provides several configuration options:

- **Voice Activity Detection**: Real-time speech detection
- **Interruption Handling**: Allow users to interrupt AI responses
- **Natural Conversation**: Enable context-aware conversations
- **STT Provider**: Choose between Whisper, Deepgram, or browser
- **Intent Provider**: Choose between GPT-4, Claude, or ensemble

## 🧪 Testing

### Automated Tests

Run the comprehensive test script:
```bash
./test-enhanced-voice.sh
```

### Manual Testing

1. **Voice Input Testing:**
   - Grant microphone permissions
   - Speak clearly into the microphone
   - Verify transcription accuracy

2. **Intent Detection Testing:**
   - Try commands like "Create an order for John Smith"
   - Test order searches: "Find orders for customer ABC"
   - Test reports: "Generate a quarterly report"

3. **Voice Activity Detection:**
   - Observe volume indicators during speech
   - Test silence detection and auto-stopping

4. **Interruption Handling:**
   - Start speaking while LISA is responding
   - Verify that LISA stops and listens

## 🔍 API Reference

### Enhanced Transcription

```typescript
POST /api/voice/transcribe-base64
{
  "audioData": "base64_encoded_audio",
  "provider": "whisper" | "deepgram",
  "language": "en"
}
```

### Intent Detection

```typescript
POST /api/voice/detect-intent
{
  "transcript": "user spoken text",
  "conversationContext": ["previous", "messages"],
  "provider": "gpt4" | "claude" | "ensemble"
}
```

### Voice Activity Detection

```typescript
POST /api/voice/voice-activity
FormData: { audio: AudioFile }
```

## 🔧 Development

### Adding New STT Providers

1. Extend `EnhancedVoiceService` backend service
2. Add provider configuration
3. Implement transcription method
4. Add fallback logic

### Adding New Intent Providers

1. Extend `EnhancedIntentService` backend service
2. Add provider-specific prompt engineering
3. Implement response parsing
4. Add to ensemble method

### Customizing VAD

Modify `VoiceActivityDetection.ts` to adjust:
- Sensitivity thresholds
- Audio analysis algorithms
- Detection timing

## 🐛 Troubleshooting

### Common Issues

1. **Microphone Access Denied:**
   - Check browser permissions
   - Ensure HTTPS in production
   - Try the AudioPermissionManager component

2. **STT Provider Errors:**
   - Verify API keys in environment variables
   - Check provider service status
   - Review fallback configurations

3. **Intent Detection Failures:**
   - Check provider API limits
   - Verify context data format
   - Review ensemble fallback logic

4. **VAD Not Working:**
   - Check microphone permissions
   - Verify audio context initialization
   - Adjust sensitivity thresholds

### Debug Mode

Enable debug logging in the browser console:
```javascript
localStorage.setItem('debugVoice', 'true');
```

## 📊 Performance

### Latency Optimization

- **STT Streaming**: Real-time audio processing
- **Intent Caching**: Context-aware response caching
- **Audio Compression**: Optimized audio data transmission
- **Fallback Speed**: Quick provider switching

### Resource Usage

- **Memory**: ~10-20MB additional for audio processing
- **CPU**: Minimal impact with efficient VAD algorithms
- **Network**: Optimized audio data transmission

## 🛡️ Security

### Data Privacy

- Audio data is processed in real-time
- No permanent audio storage
- Transcripts are session-based only
- API keys are server-side only

### Access Control

- Microphone permissions required
- CORS configured for allowed origins
- Rate limiting on API endpoints
- Secure WebSocket connections

## 🗺️ Roadmap

### Phase 3 (Future)
- Real-time streaming STT
- Custom wake word training
- Multi-language support
- Voice biometrics
- Advanced emotion detection

### Phase 4 (Future)
- Voice synthesis customization
- Conversation analytics
- Performance monitoring
- A/B testing framework

## 📚 Resources

- [OpenAI Whisper API Documentation](https://platform.openai.com/docs/guides/speech-to-text)
- [Deepgram API Documentation](https://developers.deepgram.com/)
- [Anthropic Claude API Documentation](https://docs.anthropic.com/)
- [Web Audio API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your enhancement
4. Add tests and documentation
5. Submit a pull request

---

**LISA Enhanced Voice System** - Bringing intelligent conversation to Glass Order Management 🎤✨
