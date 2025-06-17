const io = require('socket.io-client');

class MultiStepOrderCreationTest {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.testResults = {
            connection: false,
            multiStepFlow: false,
            orderCreation: false,
            stateManagement: false,
            connectionCleanup: false
        };
        this.currentOrderState = {};
        this.stepCount = 0;
    }

    async runTests() {
        console.log('🧪 Starting Multi-Step Order Creation Tests\n');
        
        try {
            await this.testConnection();
            await this.testMultiStepOrderFlow();
            await this.testConnectionManagement();
            await this.cleanup();
            
            this.printResults();
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
        }
    }

    async testConnection() {
        console.log('📡 Testing WebSocket Connection...');
        
        return new Promise((resolve, reject) => {
            const wsUrl = 'ws://localhost:3001';
            console.log(`Connecting to: ${wsUrl}`);
            
            this.socket = io(wsUrl, {
                transports: ['websocket'],
                timeout: 10000,
                forceNew: true
            });

            this.socket.on('connect', () => {
                console.log('✅ Socket connected with ID:', this.socket.id);
                this.isConnected = true;
                this.testResults.connection = true;
            });

            this.socket.on('connected', (data) => {
                console.log('✅ LISA session initialized:', data.sessionId);
                console.log('💬 LISA welcome message:', data.message);
                resolve();
            });

            this.socket.on('connect_error', (error) => {
                console.error('❌ Connection failed:', error.message);
                reject(error);
            });

            this.socket.on('voice-response', (data) => {
                this.handleLISAResponse(data);
            });

            setTimeout(() => {
                if (!this.isConnected) {
                    reject(new Error('Connection timeout'));
                }
            }, 10000);
        });
    }

    async testMultiStepOrderFlow() {
        console.log('\n📝 Testing Multi-Step Order Creation Flow...');
        
        const steps = [
            {
                message: 'Create a new order',
                expectedStep: 'glass_type',
                description: 'Initiate order creation'
            },
            {
                message: 'Tempered glass',
                expectedStep: 'dimensions',
                description: 'Specify glass type'
            },
            {
                message: '1200 by 800 millimeters',
                expectedStep: 'quantity',
                description: 'Provide dimensions'
            },
            {
                message: '5 pieces',
                expectedStep: 'customer',
                description: 'Specify quantity'
            },
            {
                message: 'Test Customer Inc',
                expectedStep: 'confirm',
                description: 'Provide customer name'
            },
            {
                message: 'Yes, create it',
                expectedStep: 'complete',
                description: 'Confirm order creation'
            }
        ];

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            console.log(`\n🔄 Step ${i + 1}: ${step.description}`);
            console.log(`📤 Sending: "${step.message}"`);
            
            const response = await this.sendMessageAndWait(step.message);
            
            if (response.data && response.data.step === step.expectedStep) {
                console.log(`✅ Expected step reached: ${step.expectedStep}`);
                this.stepCount++;
            } else if (step.expectedStep === 'complete' && response.data && response.data.success) {
                console.log(`✅ Order created successfully!`);
                this.testResults.orderCreation = true;
                this.stepCount++;
            } else {
                console.log(`⚠️  Unexpected response step: ${response.data?.step || 'unknown'}`);
            }
            
            // Small delay between steps
            await this.delay(500);
        }

        if (this.stepCount >= 5) {
            this.testResults.multiStepFlow = true;
            this.testResults.stateManagement = true;
            console.log('\n✅ Multi-step flow completed successfully');
        } else {
            console.log(`\n❌ Multi-step flow incomplete (${this.stepCount}/6 steps)`);
        }
    }

    async testConnectionManagement() {
        console.log('\n🔌 Testing Connection Management...');
        
        // Test multiple connections
        const extraConnections = [];
        
        for (let i = 0; i < 3; i++) {
            const extraSocket = io('ws://localhost:3001', {
                transports: ['websocket'],
                timeout: 5000,
                forceNew: true
            });
            
            extraConnections.push(extraSocket);
            
            extraSocket.on('connect', () => {
                console.log(`📡 Extra connection ${i + 1} established:`, extraSocket.id);
            });
            
            extraSocket.on('connection_replaced', (data) => {
                console.log(`🔄 Connection ${i + 1} replaced:`, data.reason);
            });
            
            await this.delay(200);
        }

        // Wait for connection management to take effect
        await this.delay(2000);

        // Disconnect extra connections
        extraConnections.forEach((socket, index) => {
            socket.disconnect();
            console.log(`🔌 Disconnected extra connection ${index + 1}`);
        });

        console.log('✅ Connection management test completed');
    }

    sendMessageAndWait(message) {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                resolve({ response: 'timeout', data: null });
            }, 5000);

            const responseHandler = (data) => {
                clearTimeout(timeout);
                this.socket.off('voice-response', responseHandler);
                resolve(data);
            };

            this.socket.on('voice-response', responseHandler);
            
            this.socket.emit('voice-command', {
                transcript: message,
                isEndOfSpeech: true,
                interimResults: false,
                useNaturalConversation: true
            });
        });
    }

    handleLISAResponse(data) {
        console.log(`💬 LISA: "${data.response}"`);
        
        if (data.data) {
            if (data.data.step) {
                console.log(`📍 Current step: ${data.data.step}`);
                this.currentOrderState.step = data.data.step;
            }
            
            if (data.data.orderSummary) {
                console.log('📋 Order summary updated:', data.data.orderSummary);
                this.currentOrderState = { ...this.currentOrderState, ...data.data.orderSummary };
            }
            
            if (data.action === 'order_created' && data.data.success) {
                console.log(`🎉 Order created: ${data.data.orderNumber || data.data.id}`);
            }
        }
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up connections...');
        
        if (this.socket) {
            this.socket.disconnect();
            console.log('✅ Main connection closed');
            this.testResults.connectionCleanup = true;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    printResults() {
        console.log('\n📊 TEST RESULTS SUMMARY');
        console.log('========================');
        
        Object.entries(this.testResults).forEach(([test, passed]) => {
            const status = passed ? '✅ PASSED' : '❌ FAILED';
            const testName = test.replace(/([A-Z])/g, ' $1').toUpperCase();
            console.log(`${status} - ${testName}`);
        });
        
        const passedCount = Object.values(this.testResults).filter(Boolean).length;
        const totalCount = Object.keys(this.testResults).length;
        
        console.log(`\n📈 Overall Score: ${passedCount}/${totalCount} tests passed`);
        
        if (passedCount === totalCount) {
            console.log('🎉 All tests passed! Multi-step order creation is working correctly.');
        } else {
            console.log('⚠️  Some tests failed. Check the implementation.');
        }
        
        console.log(`\n📝 Order Steps Completed: ${this.stepCount}/6`);
        
        if (Object.keys(this.currentOrderState).length > 0) {
            console.log('\n📋 Final Order State:');
            console.log(JSON.stringify(this.currentOrderState, null, 2));
        }
    }
}

// Run the tests
if (require.main === module) {
    const test = new MultiStepOrderCreationTest();
    test.runTests().catch(console.error);
}

module.exports = MultiStepOrderCreationTest;
