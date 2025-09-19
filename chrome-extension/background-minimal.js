// Minimal background script for testing
console.log('Minimal background script loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('Minimal extension installed');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  if (message.action === 'ping') {
    sendResponse({ 
      success: true, 
      message: 'Background script is working!',
      timestamp: new Date().toISOString()
    });
  }
});
