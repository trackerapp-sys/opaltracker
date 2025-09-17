// Test script to verify automatic bid monitoring is working
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testMonitoring() {
  console.log('🧪 Testing OpalTracker monitoring system...\n');
  
  try {
    // Test 1: Check monitoring status
    console.log('1️⃣ Checking monitoring status...');
    const statusResponse = await axios.get(`${BASE_URL}/api/monitor/status`);
    console.log('Status:', statusResponse.data);
    
    // Test 2: Start monitoring
    console.log('\n2️⃣ Starting monitoring...');
    const startResponse = await axios.post(`${BASE_URL}/api/monitor/start`);
    console.log('Start result:', startResponse.data);
    
    // Test 3: Manual check
    console.log('\n3️⃣ Performing manual check...');
    const checkResponse = await axios.post(`${BASE_URL}/api/monitor/check`);
    console.log('Check result:', checkResponse.data);
    
    // Test 4: Check status again
    console.log('\n4️⃣ Checking status after start...');
    const statusResponse2 = await axios.get(`${BASE_URL}/api/monitor/status`);
    console.log('Updated status:', statusResponse2.data);
    
    console.log('\n✅ Monitoring test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testMonitoring().catch(console.error);

