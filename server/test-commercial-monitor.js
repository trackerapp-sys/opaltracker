/**
 * QUICK TEST SCRIPT - Commercial Facebook Monitor
 * Tests both ScrapingBee and ZenRows with your auction
 */

const axios = require('axios');

async function testCommercialMonitoring() {
  const testAuctionUrl = 'https://www.facebook.com/share/v/16d2fETDWj/';
  const auctionId = '60492f2e-c038-48b9-9193-707711ce14d1';
  const replitApiUrl = 'https://6890239f-4e7c-48b1-ae06-0f1b134d2f42-00-2z7sf66begnj7.janeway.replit.dev';

  console.log('🧪 TESTING COMMERCIAL FACEBOOK MONITORING\n');

  // Test ScrapingBee
  if (process.env.SCRAPINGBEE_API_KEY) {
    console.log('🐝 Testing ScrapingBee...');
    try {
      const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
        params: {
          api_key: process.env.SCRAPINGBEE_API_KEY,
          url: testAuctionUrl,
          render_js: 'true',
          premium_proxy: 'true',
          country_code: 'US',
          wait: 5000
        },
        timeout: 30000
      });

      console.log('✅ ScrapingBee SUCCESS - Page loaded!');
      console.log(`📄 Content length: ${response.data.length} characters`);
      
      // Look for bid patterns in the content
      const bidMatches = response.data.match(/\$(\d{1,3})/g);
      if (bidMatches) {
        console.log(`💰 Found potential bids: ${bidMatches.join(', ')}`);
      }
      
    } catch (error) {
      console.log('❌ ScrapingBee failed:', error.message);
    }
  } else {
    console.log('⚠️ SCRAPINGBEE_API_KEY not found - add it to test ScrapingBee');
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test ZenRows  
  if (process.env.ZENROWS_API_KEY) {
    console.log('⚡ Testing ZenRows...');
    try {
      const response = await axios.get('https://api.zenrows.com/v1/', {
        params: {
          url: testAuctionUrl,
          apikey: process.env.ZENROWS_API_KEY,
          js_render: 'true',
          antibot: 'true',
          premium_proxy: 'true'
        },
        timeout: 30000
      });

      console.log('✅ ZenRows SUCCESS - Page loaded!');
      console.log(`📄 Content length: ${response.data.length} characters`);
      
      // Look for bid patterns
      const bidMatches = response.data.match(/\$(\d{1,3})/g);
      if (bidMatches) {
        console.log(`💰 Found potential bids: ${bidMatches.join(', ')}`);
      }
      
    } catch (error) {
      console.log('❌ ZenRows failed:', error.message);
    }
  } else {
    console.log('⚠️ ZENROWS_API_KEY not found - add it to test ZenRows');
  }

  console.log('\n🎯 Test complete! If either service succeeded, your commercial solution works!\n');
}

// Run the test
testCommercialMonitoring().catch(console.error);