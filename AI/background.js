// Enhanced AI tracking with accurate estimates
const aiEstimates = {
  'openai.com': {
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
  chrome.storage.local.set({ stats: {} });
  console.log('EnviroTrack: Initialized');
});

// Track request starts
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.method === 'POST' && isAIAPI(details.url)) {
      pendingRequests[details.requestId] = {
        startTime: Date.now(),
        url: details.url
      };
      console.log('EnviroTrack: Request started', details.url);
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
      updateStats(domain, duration);
      console.log('EnviroTrack: Request completed', domain, duration + 'ms');
      delete pendingRequests[details.requestId];
    }
  },
  { urls: ["<all_urls>"] }
);

// Identify AI API endpoints
function isAIAPI(url) {
  return (
    url.includes('chat.openai.com/backend-api') ||
    url.includes('chatgpt.com/backend-api') ||
    url.includes('api.openai.com') ||
    url.includes('api.grok.x.ai') ||
    url.includes('grok.x.ai') ||
    url.includes('api.anthropic.com') ||
    url.includes('claude.ai/api') ||
    url.includes('generativelanguage.googleapis.com') ||
    url.includes('gemini.google.com')
  );
}

// Extract domain
function getDomainFromUrl(url) {
  try {
    const u = new URL(url);
    const parts = u.hostname.split('.');
    return parts.slice(-2).join('.');
  } catch (e) {
    return 'unknown';
  }
}

// Update statistics
function updateStats(domain, duration) {
  if (!(domain in aiEstimates)) {
    console.log('EnviroTrack: Unknown domain', domain);
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
      console.log('EnviroTrack: Stats updated', stats[domain]);
    });
  });
}
