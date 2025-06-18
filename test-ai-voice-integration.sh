#!/bin/bash

# AI Voice System Integration Test
# Tests Phase 3, 4, and 5 implementation

echo "🚀 Starting AI Voice System Integration Test"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test results
print_result() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1 PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ $1 FAILED${NC}"
        ((TESTS_FAILED++))
    fi
}

# Function to check if environment variable is set
check_env_var() {
    if [ -z "${!1}" ]; then
        echo -e "${YELLOW}⚠️  Warning: $1 not set${NC}"
        return 1
    else
        echo -e "${GREEN}✅ $1 is configured${NC}"
        return 0
    fi
}

echo -e "\n${BLUE}📋 Phase 3: Checking Groq Removal${NC}"
echo "-----------------------------------"

# Check that Groq is no longer in package.json
if ! grep -q "groq-sdk" apps/backend/package.json; then
    echo -e "${GREEN}✅ Groq SDK removed from package.json${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ Groq SDK still in package.json${NC}"
    ((TESTS_FAILED++))
fi

# Check that Groq imports are removed from source files
GROQ_IMPORTS=$(find apps/backend/src -name "*.ts" -exec grep -l "from 'groq-sdk'" {} \; 2>/dev/null | wc -l)
if [ $GROQ_IMPORTS -eq 0 ]; then
    echo -e "${GREEN}✅ Groq imports removed from source files${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ Found $GROQ_IMPORTS files still importing Groq${NC}"
    ((TESTS_FAILED++))
fi

echo -e "\n${BLUE}📋 Phase 4: Checking AI Provider Integration${NC}"
echo "---------------------------------------------"

# Check if new AI provider dependencies are installed
if grep -q "@anthropic-ai/sdk" apps/backend/package.json; then
    echo -e "${GREEN}✅ Anthropic SDK added${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ Anthropic SDK missing${NC}"
    ((TESTS_FAILED++))
fi

if grep -q "openai" apps/backend/package.json; then
    echo -e "${GREEN}✅ OpenAI SDK added${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ OpenAI SDK missing${NC}"
    ((TESTS_FAILED++))
fi

if grep -q "@deepgram/sdk" apps/backend/package.json; then
    echo -e "${GREEN}✅ Deepgram SDK added${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ Deepgram SDK missing${NC}"
    ((TESTS_FAILED++))
fi

# Check if AI providers service exists
if [ -f "apps/backend/src/voice/ai-providers.service.ts" ]; then
    echo -e "${GREEN}✅ AI Providers Service created${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ AI Providers Service missing${NC}"
    ((TESTS_FAILED++))
fi

# Check if services are properly integrated
if grep -q "AIProvidersService" apps/backend/src/voice/voice.module.ts; then
    echo -e "${GREEN}✅ AI Providers Service registered in module${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ AI Providers Service not registered in module${NC}"
    ((TESTS_FAILED++))
fi

echo -e "\n${BLUE}📋 Phase 5: Checking Environment Configuration${NC}"
echo "-----------------------------------------------"

# Load environment variables if .env exists
if [ -f "apps/backend/.env" ]; then
    set -a
    source apps/backend/.env
    set +a
    echo -e "${GREEN}✅ Environment file loaded${NC}"
else
    echo -e "${YELLOW}⚠️  No .env file found, checking .env.example${NC}"
fi

# Check environment variables
check_env_var "OPENAI_API_KEY"
check_env_var "ANTHROPIC_API_KEY"
check_env_var "DEEPGRAM_API_KEY"

# Check .env.example has been updated
if grep -q "ANTHROPIC_API_KEY" apps/backend/.env.example; then
    echo -e "${GREEN}✅ .env.example updated with new variables${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ .env.example missing new variables${NC}"
    ((TESTS_FAILED++))
fi

echo -e "\n${BLUE}📋 Build Test${NC}"
echo "--------------"

# Test compilation
cd apps/backend
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend builds successfully${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ Backend build failed${NC}"
    ((TESTS_FAILED++))
fi
cd ../..

echo -e "\n${BLUE}📋 Service Integration Test${NC}"
echo "----------------------------"

# Check if services can be instantiated (dry run)
if cd apps/backend && npm start > /dev/null 2>&1 & 
then
    SERVER_PID=$!
    sleep 3
    
    # Check if server is running
    if kill -0 $SERVER_PID 2>/dev/null; then
        echo -e "${GREEN}✅ Backend server starts successfully${NC}"
        ((TESTS_PASSED++))
        kill $SERVER_PID
        wait $SERVER_PID 2>/dev/null
    else
        echo -e "${RED}❌ Backend server failed to start${NC}"
        ((TESTS_FAILED++))
    fi
else
    echo -e "${RED}❌ Failed to start backend server${NC}"
    ((TESTS_FAILED++))
fi

cd ../..

echo -e "\n${BLUE}📊 Test Summary${NC}"
echo "=================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! AI Voice System integration successful!${NC}"
    echo -e "\n${BLUE}🚀 Next Steps:${NC}"
    echo "1. Set up your API keys in apps/backend/.env"
    echo "2. Test voice features with real AI providers"
    echo "3. Deploy to production"
    exit 0
else
    echo -e "\n${YELLOW}⚠️  $TESTS_FAILED out of $TOTAL_TESTS tests failed${NC}"
    echo -e "\n${BLUE}🔧 Recommended Actions:${NC}"
    echo "1. Review the failed tests above"
    echo "2. Fix any missing dependencies or configuration"
    echo "3. Re-run this test script"
    exit 1
fi
