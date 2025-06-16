#!/usr/bin/env node

// Comprehensive test for Vercel WebSocket fix
const io = require('socket.io-client');

console.log('🔄 Testing Vercel WebSocket Fix...\n');

const VERCEL_URL = 'https://order-over-view-frontend-git-main-soumitras-projects-cad3dd70.vercel.app';
const BACKEND_URL = 'wss://orderoverview-dkro.onrender.com';

console.log(`Frontend: ${VERCEL_URL}`);
console.log(`Backend: ${BACKEND_URL}\n`);

async function testDirectBackendConnection() {
    console.log('🧪 Test 1: Direct Backend Connection');
    console.log('=====================================');
    
    return new Promise((resolve) => {
        const socket = io(BACKEND_URL, {
            timeout: 10000,
            transports: ['websocket', 'polling']
        });
        
        let connected = false;
        let lisaReady = false;
        
        const timeout = setTimeout(() => {
            if (!connected) {
                console.log('❌ Backend connection timeout');
                socket.disconnect();
                resolve({ success: false, reason: 'timeout' });
            }
        }, 10000);
        
        socket.on('connect', () => {
            connected = true;
            console.log(`✅ Connected to backend: ${socket.id}`);
            console.log(`   Transport: ${socket.io.engine.transport.name}`);
        });
        
        socket.on('connected', (data) => {
            lisaReady = true;
            console.log(`✅ LISA ready: ${data.agent}`);
            console.log(`   Session: ${data.sessionId}`);
            
            clearTimeout(timeout);
            socket.disconnect();
            resolve({ success: true, transport: socket.io.engine.transport.name });
        });
        
        socket.on('connect_error', (error) => {
            console.log(`❌ Backend connection error: ${error.message}`);
            clearTimeout(timeout);
            socket.disconnect();
            resolve({ success: false, reason: error.message });
        });
    });
}

async function testWithVercelOrigin() {
    console.log('\n🧪 Test 2: Connection with Vercel Origin Header');
    console.log('================================================');
    
    return new Promise((resolve) => {
        const socket = io(BACKEND_URL, {
            timeout: 10000,
            transports: ['websocket', 'polling'],
            extraHeaders: {
                'Origin': VERCEL_URL,
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        });
        
        let connected = false;
        
        const timeout = setTimeout(() => {
            if (!connected) {
                console.log('❌ Vercel origin connection timeout');
                socket.disconnect();
                resolve({ success: false, reason: 'timeout' });
            }
        }, 10000);
        
        socket.on('connect', () => {
            connected = true;
            console.log(`✅ Connected with Vercel origin: ${socket.id}`);
            console.log(`   Transport: ${socket.io.engine.transport.name}`);
            
            clearTimeout(timeout);
            socket.disconnect();
            resolve({ success: true, transport: socket.io.engine.transport.name });
        });
        
        socket.on('connect_error', (error) => {
            console.log(`❌ Vercel origin connection error: ${error.message}`);
            clearTimeout(timeout);
            socket.disconnect();
            resolve({ success: false, reason: error.message });
        });
    });
}

async function testLISAVoiceCommand() {
    console.log('\n🧪 Test 3: LISA Voice Command Test');
    console.log('===================================');
    
    return new Promise((resolve) => {
        const socket = io(BACKEND_URL, {
            timeout: 10000,
            transports: ['websocket', 'polling']
        });
        
        let responseReceived = false;
        
        const timeout = setTimeout(() => {
            if (!responseReceived) {
                console.log('❌ LISA response timeout');
                socket.disconnect();
                resolve({ success: false, reason: 'no_response' });
            }
        }, 15000);
        
        socket.on('connect', () => {
            console.log('✅ Connected for LISA test');
        });
        
        socket.on('connected', (data) => {
            console.log(`✅ LISA connected: ${data.agent}`);
            
            // Send test voice command
            console.log('🗣️  Sending test command: "Hello LISA, are you working?"');
            socket.emit('voice-command', {
                transcript: 'Hello LISA, are you working?',
                isEndOfSpeech: true,
                interimResults: false,
                useNaturalConversation: true
            });
        });
        
        socket.on('voice-response', (data) => {
            responseReceived = true;
            console.log('✅ LISA responded:');
            console.log(`   Response: "${data.response}"`);
            console.log(`   Action: ${data.action || 'none'}`);
            console.log(`   Should Speak: ${data.shouldSpeak}`);
            
            clearTimeout(timeout);
            socket.disconnect();
            resolve({ success: true, response: data.response });
        });
        
        socket.on('connect_error', (error) => {
            console.log(`❌ LISA test connection error: ${error.message}`);
            clearTimeout(timeout);
            socket.disconnect();
            resolve({ success: false, reason: error.message });
        });
    });
}

async function runAllTests() {
    console.log('🚀 Starting Comprehensive WebSocket Tests...\n');
    
    const results = [];
    
    // Test 1: Direct backend connection
    const test1 = await testDirectBackendConnection();
    results.push({ name: 'Direct Backend', ...test1 });
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Connection with Vercel origin
    const test2 = await testWithVercelOrigin();
    results.push({ name: 'Vercel Origin', ...test2 });
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 3: LISA voice command
    const test3 = await testLISAVoiceCommand();
    results.push({ name: 'LISA Voice', ...test3 });
    
    // Print summary
    console.log('\n📊 Test Results Summary');
    console.log('========================');
    
    let allPassed = true;
    results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        const detail = result.success ? 
            (result.transport ? `(${result.transport})` : '(success)') : 
            `(${result.reason})`;
        console.log(`${status} ${result.name} ${detail}`);
        if (!result.success) allPassed = false;
    });
    
    const successCount = results.filter(r => r.success).length;
    console.log(`\n🎯 Success Rate: ${successCount}/${results.length}`);
    
    if (allPassed) {
        console.log('\n🎉 ALL TESTS PASSED!');
        console.log('The WebSocket connection should now work on Vercel.');
        console.log('\n📋 Next Steps:');
        console.log('1. Wait for Vercel deployment to complete (2-3 minutes)');
        console.log('2. Test the live site at:');
        console.log(`   ${VERCEL_URL}`);
        console.log('3. Try the LISA voice interface');
        console.log('4. Check browser console for any remaining errors');
    } else {
        console.log('\n⚠️  SOME TESTS FAILED');
        console.log('There may still be connectivity issues.');
        console.log('Check the backend logs and CORS configuration.');
    }
    
    console.log('\n🔗 Useful Links:');
    console.log(`📱 Frontend: ${VERCEL_URL}`);
    console.log(`🖥️  Backend: https://orderoverview-dkro.onrender.com`);
    console.log(`📚 API Docs: https://orderoverview-dkro.onrender.com/api/docs`);
}

runAllTests().catch(console.error);
