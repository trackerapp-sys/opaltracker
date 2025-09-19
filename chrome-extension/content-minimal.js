// Minimal Chrome Extension Content Script for Testing
console.log('🔥 Minimal Opal Tracker content script loaded');

// Test if Chrome APIs are available
if (typeof chrome !== 'undefined' && chrome.runtime) {
  console.log('✅ Chrome runtime available');
} else {
  console.log('❌ Chrome runtime not available');
}

// Listen for messages from the web page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Received message:', request);
  
  if (request.action === 'ping') {
    console.log('📨 Ping received, responding...');
    sendResponse({ 
      success: true, 
      message: 'Extension is working!',
      timestamp: new Date().toISOString(),
      url: window.location.href
    });
    return true;
  }
  
  if (request.action === 'detectGroups') {
    console.log('📨 Group detection requested');
    
    // Simple mock response for testing
    const mockGroups = [
      { id: 'test1', name: 'Test Group 1' },
      { id: 'test2', name: 'Test Group 2' }
    ];
    
    setTimeout(() => {
      console.log('📤 Sending mock groups response');
      sendResponse({ 
        success: true, 
        groups: mockGroups,
        count: mockGroups.length,
        timestamp: new Date().toISOString()
      });
    }, 500);
    
    return true; // Keep message channel open
  }
});

console.log('🎯 Minimal content script ready for testing');
