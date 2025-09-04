// Webhook Notifier - Send bid updates via external services
class WebhookNotifier {
  constructor() {
    this.webhookUrl = 'https://6890239f-4e7c-48b1-ae06-0f1b134d2f42-00-2z7sf66begnj7.janeway.replit.dev/api/webhooks/bid-update';
    this.setupUI();
  }
  
  setupUI() {
    // Create notification panel
    const panel = document.createElement('div');
    panel.id = 'webhook-panel';
    panel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      background: linear-gradient(135deg, #ff6b6b, #ffa726);
      border-radius: 12px;
      padding: 20px;
      color: white;
      font-family: Arial, sans-serif;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      min-width: 300px;
    `;
    
    panel.innerHTML = `
      <h3 style="margin: 0 0 15px 0;">📞 Quick Bid Notifier</h3>
      <div style="margin-bottom: 10px;">
        <input type="number" id="bid-amount" placeholder="Bid Amount (e.g. 200)" 
               style="width: 100%; padding: 8px; border: none; border-radius: 4px; font-size: 16px;">
      </div>
      <div style="margin-bottom: 10px;">
        <input type="text" id="bidder-name" placeholder="Bidder Name (optional)" 
               style="width: 100%; padding: 8px; border: none; border-radius: 4px;">
      </div>
      <button id="send-webhook" style="
        width: 100%;
        padding: 12px;
        border: none;
        border-radius: 6px;
        background: #22c55e;
        color: white;
        font-weight: bold;
        cursor: pointer;
        font-size: 16px;
      ">📞 Send Update</button>
      <div id="webhook-status" style="margin-top: 10px; font-size: 12px;"></div>
    `;
    
    document.body.appendChild(panel);
    
    // Add event listeners
    document.getElementById('send-webhook').onclick = () => this.sendWebhook();
    document.getElementById('bid-amount').onkeydown = (e) => {
      if (e.key === 'Enter') this.sendWebhook();
    };
    
    // Auto-focus on amount field
    document.getElementById('bid-amount').focus();
  }
  
  async sendWebhook() {
    const bidAmount = document.getElementById('bid-amount').value;
    const bidderName = document.getElementById('bidder-name').value || 'Quick Update';
    const statusDiv = document.getElementById('webhook-status');
    
    if (!bidAmount) {
      statusDiv.innerHTML = '❌ Please enter bid amount';
      return;
    }
    
    statusDiv.innerHTML = '📡 Sending...';
    
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auctionUrl: window.location.href,
          bidAmount: bidAmount,
          bidderName: bidderName,
          source: 'Quick Notifier'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        statusDiv.innerHTML = `✅ ${result.message}`;
        statusDiv.style.color = '#22c55e';
        
        // Clear form
        document.getElementById('bid-amount').value = '';
        document.getElementById('bidder-name').value = '';
      } else {
        statusDiv.innerHTML = `❌ ${result.message}`;
        statusDiv.style.color = '#ef4444';
      }
    } catch (error) {
      statusDiv.innerHTML = '❌ Update failed';
      statusDiv.style.color = '#ef4444';
      console.error('Webhook error:', error);
    }
  }
}

// Auto-start when script loads
new WebhookNotifier();

console.log('📞 Webhook Notifier Ready! Enter bid amount and click Send Update.');