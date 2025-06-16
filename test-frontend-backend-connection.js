#!/usr/bin/env node

/**
 * Test Frontend-Backend Database Connection
 * This script tests if the frontend can successfully connect to the backend and retrieve data
 */

const fetch = require('node-fetch');

async function testConnection() {
  console.log('🔍 Testing Frontend-Backend Database Connection...\n');
  
  const baseURL = 'http://localhost:3001/api';
  
  // Test 1: Backend Health Check
  console.log('1. Testing Backend Health...');
  try {
    const healthResponse = await fetch(`${baseURL}/health`);
    if (healthResponse.ok) {
      console.log('✅ Backend is healthy');
    } else {
      console.log(`❌ Backend health check failed: ${healthResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ Backend connection failed: ${error.message}`);
    return;
  }
  
  // Test 2: Customers API
  console.log('\n2. Testing Customers API...');
  try {
    const customersResponse = await fetch(`${baseURL}/customers`);
    if (customersResponse.ok) {
      const customers = await customersResponse.json();
      console.log(`✅ Customers API working - Found ${customers.length} customers`);
      if (customers.length > 0) {
        console.log(`   First customer: ${customers[0].name} (${customers[0].email})`);
      }
    } else {
      console.log(`❌ Customers API failed: ${customersResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ Customers API error: ${error.message}`);
  }
  
  // Test 3: Orders API
  console.log('\n3. Testing Orders API...');
  try {
    const ordersResponse = await fetch(`${baseURL}/orders`);
    if (ordersResponse.ok) {
      const orders = await ordersResponse.json();
      console.log(`✅ Orders API working - Found ${orders.length} orders`);
      if (orders.length > 0) {
        console.log(`   First order: ${orders[0].orderNumber} for ${orders[0].customer?.name || 'Unknown'}`);
      }
    } else {
      console.log(`❌ Orders API failed: ${ordersResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ Orders API error: ${error.message}`);
  }
  
  // Test 4: CORS Headers
  console.log('\n4. Testing CORS Headers...');
  try {
    const corsResponse = await fetch(`${baseURL}/customers`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
      }
    });
    
    const corsHeaders = corsResponse.headers.get('access-control-allow-origin');
    if (corsHeaders) {
      console.log(`✅ CORS configured: ${corsHeaders}`);
    } else {
      console.log('⚠️  No CORS headers found');
    }
  } catch (error) {
    console.log(`❌ CORS test error: ${error.message}`);
  }
  
  console.log('\n🎯 Test Complete!\n');
  console.log('📝 If all tests pass but frontend shows no data, check:');
  console.log('   1. Browser console for JavaScript errors');
  console.log('   2. Network tab for failed API requests');
  console.log('   3. React Query DevTools for query status');
  console.log('   4. Component state management');
}

// Install node-fetch if not available
try {
  require('node-fetch');
} catch (error) {
  console.log('Installing node-fetch...');
  require('child_process').execSync('npm install node-fetch', { stdio: 'inherit' });
}

testConnection().catch(console.error);
