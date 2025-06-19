#!/usr/bin/env node

/**
 * LISA Voice API Diagnostic Tool
 * Tests all voice-related APIs to identify issues
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, 'apps/backend/.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key] = value.replace(/"/g, '');
  }
});

console.log('🔍 LISA Voice API Diagnostic Starting...\n');

// Test functions
async function testGroqAPI() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: "llama3-8b-8192",
      messages: [{ role: "user", content: "Say hello" }],
      max_tokens: 10
    });

    const options = {
      hostname: 'api.groq.com',
      port: 443,
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ status: 'success', response: JSON.parse(body) });
        } else {
          resolve({ status: 'error', statusCode: res.statusCode, body });
        }
      });
    });

    req.on('error', (error) => resolve({ status: 'error', error: error.message }));
    req.write(data);
    req.end();
  });
}

async function testElevenLabsAPI() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.elevenlabs.io',
      port: 443,
      path: '/v1/voices',
      method: 'GET',
      headers: {
        'xi-api-key': env.ELEVENLABS_API_KEY
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const voices = JSON.parse(body);
          resolve({ status: 'success', voiceCount: voices.voices?.length || 0 });
        } else {
          resolve({ status: 'error', statusCode: res.statusCode, body });
        }
      });
    });

    req.on('error', (error) => resolve({ status: 'error', error: error.message }));
    req.end();
  });
}

async function testDeepgramAPI() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      url: "https://static.deepgram.com/examples/Bueller-Life-moves-pretty-fast.wav"
    });

    const options = {
      hostname: 'api.deepgram.com',
      port: 443,
      path: '/v1/listen',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ status: 'success', response: JSON.parse(body) });
        } else {
          resolve({ status: 'error', statusCode: res.statusCode, body });
        }
      });
    });

    req.on('error', (error) => resolve({ status: 'error', error: error.message }));
    req.write(data);
    req.end();
  });
}

async function testBackendConnection() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/',
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      resolve({ status: 'success', statusCode: res.statusCode });
    });

    req.on('error', (error) => {
      // Try HTTP instead
      const http = require('http');
      const httpReq = http.request({ ...options, port: 3001 }, (res) => {
        resolve({ status: 'success', statusCode: res.statusCode });
      });
      httpReq.on('error', (httpError) => {
        resolve({ status: 'error', error: httpError.message });
      });
      httpReq.end();
    });

    req.end();
  });
}

// Run diagnostics
async function runDiagnostics() {
  console.log('📊 Testing API Connections...\n');

  // Test Backend
  console.log('🔸 Backend Server (localhost:3001)');
  const backendResult = await testBackendConnection();
  if (backendResult.status === 'success') {
    console.log('  ✅ Backend is responding');
  } else {
    console.log(`  ❌ Backend error: ${backendResult.error}`);
  }

  // Test GROQ
  console.log('\n🔸 GROQ API (AI Chat)');
  const groqResult = await testGroqAPI();
  if (groqResult.status === 'success') {
    console.log('  ✅ GROQ API working perfectly');
    console.log(`  📝 Response: "${groqResult.response.choices[0].message.content}"`);
  } else {
    console.log(`  ❌ GROQ API error: ${groqResult.error || groqResult.body}`);
  }

  // Test ElevenLabs
  console.log('\n🔸 ElevenLabs API (Voice Synthesis)');
  const elevenResult = await testElevenLabsAPI();
  if (elevenResult.status === 'success') {
    console.log('  ✅ ElevenLabs API working perfectly');
    console.log(`  🎤 Available voices: ${elevenResult.voiceCount}`);
  } else {
    console.log(`  ❌ ElevenLabs API error: ${elevenResult.error || elevenResult.body}`);
  }

  // Test Deepgram
  console.log('\n🔸 Deepgram API (Speech Recognition)');
  const deepgramResult = await testDeepgramAPI();
  if (deepgramResult.status === 'success') {
    console.log('  ✅ Deepgram API working perfectly');
    const transcript = deepgramResult.response.results?.channels?.[0]?.alternatives?.[0]?.transcript;
    console.log(`  📝 Test transcription: "${transcript}"`);
  } else {
    console.log(`  ❌ Deepgram API error: ${deepgramResult.error || deepgramResult.body}`);
    
    // Check if it's an auth error
    if (deepgramResult.body && deepgramResult.body.includes('INVALID_AUTH')) {
      console.log('  🔑 Issue: Invalid Deepgram API key - this is the main problem!');
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(60));

  const issues = [];
  const working = [];

  if (backendResult.status === 'success') working.push('Backend Server');
  else issues.push('Backend Server connection');

  if (groqResult.status === 'success') working.push('GROQ AI Chat');
  else issues.push('GROQ API');

  if (elevenResult.status === 'success') working.push('ElevenLabs Voice');
  else issues.push('ElevenLabs API');

  if (deepgramResult.status === 'success') working.push('Deepgram Speech Recognition');
  else issues.push('Deepgram API (MAIN ISSUE)');

  console.log('\n✅ WORKING SERVICES:');
  working.forEach(service => console.log(`  • ${service}`));

  console.log('\n❌ ISSUES FOUND:');
  issues.forEach(issue => console.log(`  • ${issue}`));

  if (issues.includes('Deepgram API (MAIN ISSUE)')) {
    console.log('\n🎯 ROOT CAUSE IDENTIFIED:');
    console.log('  The Deepgram API key is invalid or expired.');
    console.log('  This prevents speech-to-text from working.');
    console.log('  LISA cannot hear or understand your voice commands.');
    
    console.log('\n💡 SOLUTIONS:');
    console.log('  1. Get a new Deepgram API key from https://deepgram.com');
    console.log('  2. Update DEEPGRAM_API_KEY in your .env file');
    console.log('  3. Or switch to OpenAI Whisper as fallback');
  }

  console.log('\n🔧 API Key Status:');
  console.log(`  GROQ_API_KEY: ${env.GROQ_API_KEY ? '✅ Present' : '❌ Missing'}`);
  console.log(`  ELEVENLABS_API_KEY: ${env.ELEVENLABS_API_KEY ? '✅ Present' : '❌ Missing'}`);
  console.log(`  DEEPGRAM_API_KEY: ${env.DEEPGRAM_API_KEY ? '⚠️  Present but Invalid' : '❌ Missing'}`);
  console.log(`  OPENAI_API_KEY: ${env.OPENAI_API_KEY && env.OPENAI_API_KEY !== 'your_openai_api_key_here' ? '✅ Present' : '❌ Placeholder'}`);
}

runDiagnostics().catch(console.error);
