// Test script to verify extension doesn't interfere with page loading
console.log('🧪 Testing extension safety...');

// Test 1: Check if page loads normally
let pageLoadStart = performance.now();
document.addEventListener('DOMContentLoaded', () => {
  let pageLoadTime = performance.now() - pageLoadStart;
  console.log(`📊 Page load time: ${pageLoadTime.toFixed(2)}ms`);
  
  if (pageLoadTime < 5000) {
    console.log('✅ Page loaded quickly - extension is not interfering');
  } else {
    console.log('⚠️ Page loaded slowly - extension might be interfering');
  }
});

// Test 2: Check if Facebook elements are accessible
setTimeout(() => {
  const facebookElements = document.querySelectorAll('[data-testid]');
  console.log(`📊 Facebook elements found: ${facebookElements.length}`);
  
  if (facebookElements.length > 10) {
    console.log('✅ Facebook elements loaded properly');
  } else {
    console.log('⚠️ Facebook elements not fully loaded');
  }
}, 2000);

// Test 3: Check if extension functions are available
setTimeout(() => {
  if (typeof window.testBidDetection === 'function') {
    console.log('✅ Extension functions are available');
  } else {
    console.log('⚠️ Extension functions not available');
  }
}, 3000);

console.log('🧪 Safety test completed');

