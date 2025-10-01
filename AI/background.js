// Background service worker for tracking AI requests
let requestTimes = new Map();

// Initialize storage
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    totalRequests: 0,
    totalEnergy: 0,
    totalCO2: 0,
    sessions: [],
    dailyStats: {}
  });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REQUEST_START') {
    const requestId = message.requestId;
    requestTimes.set(requestId, {
      startTime: Date.now(),
      url: message.url,
      platform: message.platform
    });
    sendResponse({ success: true });
  }
  
  if (message.type === 'REQUEST_END') {
    const requestId = message.requestId;
    const requestData = requestTimes.get(requestId);
    
    if (requestData) {
      const duration = Date.now() - requestData.startTime;
      requestTimes.delete(requestId);
      
      // Calculate energy consumption (rough estimates)
      // Average AI query: 0.001-0.01 kWh depending on model size
      const energyKWh = (duration / 1000) * 0.002; // 2Wh per second of processing
      const co2Grams = energyKWh * 475; // Average grid: 475g CO2/kWh
      
      // Store the data
      chrome.storage.local.get(['totalRequests', 'totalEnergy', 'totalCO2', 'sessions', 'dailyStats'], (data) => {
        const today = new Date().toISOString().split('T')[0];
        const dailyStats = data.dailyStats || {};
        
        if (!dailyStats[today]) {
          dailyStats[today] = {
            requests: 0,
            energy: 0,
            co2: 0,
            platforms: {}
          };
        }
        
        // Update daily stats
        dailyStats[today].requests += 1;
        dailyStats[today].energy += energyKWh;
        dailyStats[today].co2 += co2Grams;
        
        if (!dailyStats[today].platforms[requestData.platform]) {
          dailyStats[today].platforms[requestData.platform] = 0;
        }
        dailyStats[today].platforms[requestData.platform] += 1;
        
        // Update totals
        const newSession = {
          timestamp: Date.now(),
          duration: duration,
          energy: energyKWh,
          co2: co2Grams,
          platform: requestData.platform,
          url: requestData.url
        };
        
        const sessions = data.sessions || [];
        sessions.push(newSession);
        
        // Keep only last 100 sessions
        if (sessions.length > 100) {
          sessions.shift();
        }
        
        chrome.storage.local.set({
          totalRequests: (data.totalRequests || 0) + 1,
          totalEnergy: (data.totalEnergy || 0) + energyKWh,
          totalCO2: (data.totalCO2 || 0) + co2Grams,
          sessions: sessions,
          dailyStats: dailyStats
        });
      });
      
      sendResponse({ success: true, duration, energyKWh, co2Grams });
    } else {
      sendResponse({ success: false });
    }
  }
  
  if (message.type === 'GET_STATS') {
    chrome.storage.local.get(['totalRequests', 'totalEnergy', 'totalCO2', 'sessions', 'dailyStats'], (data) => {
      sendResponse(data);
    });
    return true; // Keep channel open for async response
  }
  
  if (message.type === 'RESET_STATS') {
    chrome.storage.local.set({
      totalRequests: 0,
      totalEnergy: 0,
      totalCO2: 0,
      sessions: [],
      dailyStats: {}
    });
    sendResponse({ success: true });
  }
  
  return true;
});
