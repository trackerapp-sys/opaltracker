// Test script to check Facebook comment monitoring
import axios from 'axios';

const BASE_URL = 'http://localhost:5000';
const TEST_URL = 'https://www.facebook.com/share/v/1GcYvCSw9Y/';

async function testFacebookMonitoring() {
  console.log('🧪 Testing Facebook comment monitoring...\n');
  
  try {
    // Test 1: Check monitoring status
    console.log('1️⃣ Checking monitoring status...');
    const statusResponse = await axios.get(`${BASE_URL}/api/monitor/status`);
    console.log('Status:', statusResponse.data);
    
    // Test 2: Manual check with specific URL
    console.log('\n2️⃣ Performing manual check...');
    const checkResponse = await axios.post(`${BASE_URL}/api/monitor/check`);
    console.log('Check result:', checkResponse.data);
    
    // Test 3: Check if we have any auctions
    console.log('\n3️⃣ Checking auctions...');
    const auctionsResponse = await axios.get(`${BASE_URL}/api/auctions`);
    console.log(`Found ${auctionsResponse.data.auctions.length} auctions`);
    
    if (auctionsResponse.data.auctions.length > 0) {
      const auction = auctionsResponse.data.auctions[0];
      console.log(`First auction: ${auction.opalType} - Current bid: $${auction.currentBid || auction.startingBid}`);
      console.log(`URL: ${auction.postUrl}`);
    }
    
    console.log('\n✅ Facebook monitoring test completed!');
    console.log('\n💡 If no bids are detected:');
    console.log('   - Facebook may be blocking automated access');
    console.log('   - Try using the Chrome extension instead');
    console.log('   - Check if the Facebook post has actual comments');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testFacebookMonitoring().catch(console.error);
