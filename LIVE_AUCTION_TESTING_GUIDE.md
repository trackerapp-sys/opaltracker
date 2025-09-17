# 🧪 Live Auction Testing Guide

## 📋 **Testing Bidder/Winner Names**

### **Method 1: Facebook Group Test (Recommended)**

#### **Setup:**
1. **Create a test Facebook group** or use an existing one
2. **Add the Chrome extension** to your browser
3. **Configure the extension** to point to your local server (`http://localhost:5003`)

#### **Test Process:**
1. **Create a live auction** in the Opal Tracker
2. **Add 2-3 test items** with different starting bids
3. **Post the auction** to your Facebook group
4. **Start Live Control** in the Opal Tracker
5. **Have people comment** with bids like:
   - `$50` (John Smith)
   - `$75` (Sarah Johnson) 
   - `$100` (Mike Wilson)

#### **Expected Behavior:**
- ✅ Chrome extension captures bidder names from Facebook comments
- ✅ Live Control shows current bidder name under "Current Bid"
- ✅ When item ends, shows winner in green box
- ✅ Automatic progression to next item

---

### **Method 2: Mock Data Testing**

#### **Manual Testing:**
1. **Go to Live Auction Control**
2. **Open browser developer tools** (F12)
3. **In Console, run:**
```javascript
// Simulate a bidder name update
fetch('/api/live-auctions/YOUR_AUCTION_ID/items/YOUR_ITEM_ID', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    currentBid: '150',
    currentBidder: 'Test Bidder Name'
  })
});
```

#### **Database Testing:**
1. **Check the database** for `currentBidder` field
2. **Verify the field** is being saved correctly
3. **Test the UI** displays the bidder name

---

### **Method 3: Chrome Extension Testing**

#### **Setup Chrome Extension:**
1. **Load unpacked extension** from `chrome-extension/` folder
2. **Go to Facebook group** with auction post
3. **Click extension icon** to start monitoring
4. **Check console logs** for bid detection

#### **Test Scenarios:**
- ✅ **Single bidder**: One person bidding
- ✅ **Multiple bidders**: Several people competing
- ✅ **Bid increments**: $50, $75, $100, $125
- ✅ **Name variations**: Different Facebook name formats

---

## 🔧 **Troubleshooting**

### **Common Issues:**

#### **Bidder names not showing:**
- Check Chrome extension is running
- Verify Facebook post URL is correct
- Check console for error messages

#### **Live Control not updating:**
- Refresh the page
- Check server logs for API errors
- Verify auction ID is correct

#### **Timer not working:**
- Check browser console for errors
- Verify item status is "active"
- Check network requests to API

---

## 📊 **Test Checklist**

### **Before Testing:**
- [ ] Chrome extension installed and configured
- [ ] Live auction created with test items
- [ ] Facebook group ready for testing
- [ ] Server running on localhost:5003

### **During Testing:**
- [ ] Extension detects Facebook comments
- [ ] Bidder names appear in Live Control
- [ ] Timer counts down correctly
- [ ] Automatic progression works
- [ ] Winner display shows correctly

### **After Testing:**
- [ ] All bidder names captured
- [ ] Winner information saved
- [ ] Export functionality works
- [ ] No console errors

---

## 🎯 **Expected Results**

### **Live Control Display:**
```
LOT-001 - Boulder Opal
Status: 🟢 ACTIVE

Starting Bid: $50
Current Bid: $150
👤 Sarah Johnson

Duration: 5 minutes
Time Remaining: 2:30
```

### **When Item Ends:**
```
🏆 Winner
Sarah Johnson
$150
```

### **Console Logs:**
```
🔍 Scanning for bids...
📊 Bid detected: $150 by Sarah Johnson
✅ Bidder name captured: Sarah Johnson
```

---

## 🚀 **Next Steps**

1. **Test with real Facebook group**
2. **Verify bidder name capture**
3. **Test automatic progression**
4. **Check winner display**
5. **Export results to CSV**

---

## 📞 **Support**

If you encounter issues:
1. Check browser console for errors
2. Verify server logs
3. Test Chrome extension functionality
4. Check Facebook post format

**Happy Testing! 🎉**
