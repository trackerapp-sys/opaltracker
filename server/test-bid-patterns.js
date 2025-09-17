// Test the bid detection patterns
const patterns = [
  // Standalone numbers (most common format for this auction)
  /^(\d{1,3}(?:\.\d{1,2})?)$/,
  // Standard formats: "bid 25", "offer 25", "take 25", "25 bid"
  /(?:bid|offer|take|i bid|my bid)\s*:?\s*\$?(\d{1,3}(?:\.\d{1,2})?)/i,
  /(\d{1,3}(?:\.\d{1,2})?)\s*(?:bid|offer)/i,
  // Dollar formats: "$25", "$25.50", "$ 25"
  /\$\s*(\d{1,3}(?:\.\d{1,2})?)/,
  // Number + currency: "25 dollars", "25 bucks", "25$"
  /(\d{1,3}(?:\.\d{1,2})?)\s*(?:dollars?|bucks?|\$)/i,
  // More natural language: "I'll go 85", "85 for me", "I'll pay 25"
  /(?:go|for|pay|take)\s+(\d{1,3})/i,
  /(\d{1,3})\s*(?:for me|please|thanks)/i,
  // Any number in reasonable range for short comments
  /\b(\d{2,3})\b/
];

function testBidDetection(text) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseFloat(match[1]);
      if (amount >= 10 && amount <= 500) {
        return amount;
      }
    }
  }
  return null;
}

// Test cases based on the actual bids you showed
const testCases = [
  '75',      // Should detect 75
  '65',      // Should detect 65
  '55',      // Should detect 55
  '25',      // Should detect 25
  '30',      // Should detect 30
  '35',      // Should detect 35
  '45',      // Should detect 45
  '85',      // Should detect 85
  'Auction ended',  // Should NOT detect
  'Reply',          // Should NOT detect
  'Share',          // Should NOT detect
  '2m',             // Should NOT detect (too small)
  '1d',             // Should NOT detect (too small)
  '12w',            // Should NOT detect (too small)
  '4d'              // Should NOT detect (too small)
];

console.log('🧪 Testing bid detection patterns...\n');

testCases.forEach(testCase => {
  const detected = testBidDetection(testCase);
  console.log(`"${testCase}" → ${detected ? `$${detected}` : 'no bid'}`);
});

console.log('\n✅ Bid detection test completed!');

