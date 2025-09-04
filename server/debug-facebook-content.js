/**
 * DEBUG: What is ScrapingBee actually finding on Facebook?
 */

import axios from 'axios';
import fs from 'fs';

async function debugFacebookContent() {
  const apiKey = process.env.SCRAPINGBEE_API_KEY;
  
  if (!apiKey) {
    console.log('❌ API key required');
    return;
  }

  try {
    console.log('🔍 DEBUGGING: What ScrapingBee sees on Facebook...\n');

    const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
      params: {
        api_key: apiKey,
        url: 'https://www.facebook.com/share/v/16d2fETDWj/',
        render_js: 'true',
        premium_proxy: 'true',
        country_code: 'US',
        wait: 5000
      },
      timeout: 60000
    });

    const htmlContent = response.data;
    console.log(`📄 Total content: ${htmlContent.length} characters`);
    
    // Clean text extraction
    const cleanText = htmlContent
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log(`📝 Clean text: ${cleanText.length} characters\n`);

    // Show first 1000 characters to see what's actually there
    console.log('🔍 FIRST 1000 CHARACTERS OF FACEBOOK PAGE:');
    console.log('=' .repeat(60));
    console.log(cleanText.substring(0, 1000));
    console.log('=' .repeat(60));
    
    // Look for dollar amounts specifically
    console.log('\n💰 ALL DOLLAR AMOUNTS FOUND:');
    const dollarMatches = cleanText.match(/\$\d+/g);
    if (dollarMatches) {
      console.log(`Found: ${dollarMatches.join(', ')}`);
    } else {
      console.log('None found');
    }
    
    // Look for any numbers that could be bids
    console.log('\n🔢 ALL NUMBERS 20-300 FOUND:');
    const numberMatches = cleanText.match(/\b\d{2,3}\b/g);
    if (numberMatches) {
      const bidRange = numberMatches.filter(n => {
        const num = parseInt(n);
        return num >= 20 && num <= 300;
      });
      console.log(`Found: ${bidRange.join(', ')}`);
    } else {
      console.log('None found');
    }
    
    // Save full content for analysis
    const fileName = `facebook-content-${Date.now()}.html`;
    fs.writeFileSync(fileName, htmlContent);
    console.log(`\n💾 Full content saved to: ${fileName}`);
    
    // Save clean text too
    const textFileName = `facebook-text-${Date.now()}.txt`;
    fs.writeFileSync(textFileName, cleanText);
    console.log(`📝 Clean text saved to: ${textFileName}`);

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

// Run debug
testCommercialSystem().catch(console.error);