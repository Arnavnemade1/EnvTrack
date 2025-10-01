// Enhanced AI tracking with accurate estimates
const aiEstimates = {
  'openai.com': {
    name: 'ChatGPT',
    energyPerQuery: 0.000421,
    carbonIntensity: 0.435,
    waterPerKWh: 2
  },
  'chatgpt.com': {
    name: 'ChatGPT',
    energyPerQuery: 0.000421,
    carbonIntensity: 0.435,
    waterPerKWh: 2
  },
  'x.ai': {
    name: 'Grok',
    energyPerQuery: 0.0001,
    carbonIntensity: 0.435,
    waterPerKWh: 2
  },
  'anthropic.com': {
    name: 'Claude',
    energyPerQuery: 0.0005,
    carbonIntensity: 0.435,
    waterPerKWh: 2
  },
  'claude.ai': {
    name: 'Claude',
    energyPerQuery: 0.0005,
    carbonIntensity: 0.435,
    waterPerKWh: 2
  },
  'google.com': {
    name: 'Gemini',
    energyPerQuery: 0.0003,
    carbonIntensity: 0.435,
    waterPerKWh: 2
  }
};

let pendingRequests = {};

// Initialize stats on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ stats: {}, debugLog: [] });
  console.log('EnviroTrack: Initialized');
});

// Add debug logging
function addDebugLog(message) {
  chrome.storage.local.get(['debugLog'], (result) => {
    const log = result.debugLog || [];
    log.push({ time: new Date().toISOString(), message });
    if (log.length > 50) log.shift();
    chrome.storage.local.set({ debugLog: log });
  });
}

// Track request starts
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const url = details.url;
    console.log('EnviroTrack: Checking request:', url);
    addDebugLog('Request detected: ' + url);
    
    if (details.method === 'POST' && isAIAPI(url)) {
      pendingRequests[details.requestId] = {
        startTime: Date.now(),
        url: url
      };
      console.log('EnviroTrack: AI Request started', url);
      addDebugLog('AI Request TRACKED: ' + url);
    }
  },
  { urls: ["<all_urls>"] },
  []
);

// Track request completions
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.requestId in pendingRequests) {
      const req = pendingRequests[details.requestId];
      const duration = Date.now() - req.startTime;
      const domain = getDomainFromUrl(req.url);
      
      console.log('EnviroTrack: Request completed', domain, duration + 'ms');
      addDebugLog('Completed: ' + domain + ' (' + duration + 'ms)');
      
      updateStats(domain, duration);
      delete pendingRequests[details.requestId];
    }
  },
  { urls: ["<all_urls>"] }
);

// Track request errors
chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    if (details.requestId in pendingRequests) {
      const req = pendingRequests[details.requestId];
      const duration = Date.now() - req.startTime;
      const domain = getDomainFromUrl(req.url);
      
      console.log('EnviroTrack: Request error but still counting', domain);
      addDebugLog('Error but counted: ' + domain);
      
      updateStats(domain, duration);
      delete pendingRequests[details.requestId];
    }
  },
  { urls: ["<all_urls>"] }
);

// Identify AI API endpoints - EXPANDED patterns
function isAIAPI(url) {
  const patterns = [
    // ChatGPT
    'chat.openai.com/backend-api',
    'chatgpt.com/backend-api',
    'api.openai.com/v1/chat',
    'chatgpt.com/public-api',
    
    // Grok
    'api.grok.x.ai',
    'grok.x.ai/api',
    
    // Claude
    'api.anthropic.com',
    'claude.ai/api',
    'claude.ai/append_message',
    
    // Gemini
    'generativelanguage.googleapis.com',
    'gemini.google.com/api',
    'aistudio.google.com/api'
  ];
  
  return patterns.some(pattern => url.includes(pattern));
}

// Extract domain
function getDomainFromUrl(url) {
  try {
    const u = new URL(url);
    const hostname = u.hostname;
    
    // Handle subdomains
    if (hostname.includes('chatgpt.com')) return 'chatgpt.com';
    if (hostname.includes('openai.com')) return 'openai.com';
    if (hostname.includes('claude.ai')) return 'claude.ai';
    if (hostname.includes('anthropic.com')) return 'anthropic.com';
    if (hostname.includes('x.ai')) return 'x.ai';
    if (hostname.includes('google.com')) return 'google.com';
    
    const parts = hostname.split('.');
    return parts.slice(-2).join('.');
  } catch (e) {
    console.error('EnviroTrack: URL parse error', e);
    return 'unknown';
  }
}

// Update statistics
function updateStats(domain, duration) {
  console.log('EnviroTrack: Updating stats for', domain);
  addDebugLog('Updating stats: ' + domain);
  
  if (!(domain in aiEstimates)) {
    console.log('EnviroTrack: Unknown domain', domain, 'Available:', Object.keys(aiEstimates));
    addDebugLog('Unknown domain: ' + domain);
    return;
  }
  
  const est = aiEstimates[domain];
  const energy = est.energyPerQuery;
  const co2 = energy * est.carbonIntensity * 1000; // grams
  const water = energy * est.waterPerKWh * 1000; // ml

  chrome.storage.local.get(['stats'], (result) => {
    let stats = result.stats || {};
    
    if (!stats[domain]) {
      stats[domain] = { 
        name: est.name,
        queries: 0, 
        time: 0, 
        energy: 0, 
        co2: 0, 
        water: 0 
      };
    }
    
    stats[domain].queries += 1;
    stats[domain].time += duration / 1000;
    stats[domain].energy += energy;
    stats[domain].co2 += co2;
    stats[domain].water += water;
    
    chrome.storage.local.set({ stats }, () => {
      console.log('EnviroTrack: Stats saved!', stats[domain]);
      addDebugLog('Stats saved: ' + JSON.stringify(stats[domain]));
    });
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getDebugLog') {
    chrome.storage.local.get(['debugLog'], (result) => {
      sendResponse({ log: result.debugLog || [] });
    });
    return true;
  }
});
