// EnviroTrack with EnviroCast Quantum Algorithm
// Powered by IBM AER Circuit-inspired calculations

const aiEstimates = {
  'openai.com': {
    name: 'ChatGPT',
    energyPerQuery: 0.000421,
    carbonIntensity: 0.435,
    waterPerKWh: 2,
    computeComplexity: 1.2 // Quantum weighting factor
  },
  'chatgpt.com': {
    name: 'ChatGPT',
    energyPerQuery: 0.000421,
    carbonIntensity: 0.435,
    waterPerKWh: 2,
    computeComplexity: 1.2
  },
  'x.ai': {
    name: 'Grok',
    energyPerQuery: 0.0001,
    carbonIntensity: 0.435,
    waterPerKWh: 2,
    computeComplexity: 0.8
  },
  'anthropic.com': {
    name: 'Claude',
    energyPerQuery: 0.0005,
    carbonIntensity: 0.435,
    waterPerKWh: 2,
    computeComplexity: 1.0
  },
  'claude.ai': {
    name: 'Claude',
    energyPerQuery: 0.0005,
    carbonIntensity: 0.435,
    waterPerKWh: 2,
    computeComplexity: 1.0
  },
  'google.com': {
    name: 'Gemini',
    energyPerQuery: 0.0003,
    carbonIntensity: 0.435,
    waterPerKWh: 2,
    computeComplexity: 0.9
  }
};

let pendingRequests = {};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ 
    stats: {}, 
    debugLog: [],
    lastUpdate: Date.now()
  });
  console.log('EnviroTrack: Quantum algorithm initialized');
});

function addDebugLog(message) {
  chrome.storage.local.get(['debugLog'], (result) => {
    const log = result.debugLog || [];
    log.push({ time: new Date().toISOString(), message });
    if (log.length > 50) log.shift();
    chrome.storage.local.set({ debugLog: log });
  });
}

// EnviroCast Quantum Algorithm - inspired by IBM AER circuit optimization
function applyQuantumCorrection(energy, complexity, duration) {
  // Simulate quantum circuit optimization factor
  const quantumFactor = Math.sqrt(complexity) * (1 + Math.log10(duration / 1000 + 1) * 0.1);
  return energy * quantumFactor;
}

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const url = details.url;
    
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
      
      // Notify popup of update without forcing refresh
      chrome.runtime.sendMessage({ type: 'STATS_UPDATED' }).catch(() => {});
    }
  },
  { urls: ["<all_urls>"] }
);

chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    if (details.requestId in pendingRequests) {
      const req = pendingRequests[details.requestId];
      const duration = Date.now() - req.startTime;
      const domain = getDomainFromUrl(req.url);
      
      updateStats(domain, duration);
      delete pendingRequests[details.requestId];
    }
  },
  { urls: ["<all_urls>"] }
);

function isAIAPI(url) {
  const patterns = [
    'chat.openai.com/backend-api',
    'chatgpt.com/backend-api',
    'api.openai.com/v1/chat',
    'chatgpt.com/public-api',
    'api.grok.x.ai',
    'grok.x.ai/api',
    'api.anthropic.com',
    'claude.ai/api',
    'claude.ai/append_message',
    'generativelanguage.googleapis.com',
    'gemini.google.com/api',
    'aistudio.google.com/api'
  ];
  
  return patterns.some(pattern => url.includes(pattern));
}

function getDomainFromUrl(url) {
  try {
    const u = new URL(url);
    const hostname = u.hostname;
    
    if (hostname.includes('chatgpt.com')) return 'chatgpt.com';
    if (hostname.includes('openai.com')) return 'openai.com';
    if (hostname.includes('claude.ai')) return 'claude.ai';
    if (hostname.includes('anthropic.com')) return 'anthropic.com';
    if (hostname.includes('x.ai')) return 'x.ai';
    if (hostname.includes('google.com')) return 'google.com';
    
    const parts = hostname.split('.');
    return parts.slice(-2).join('.');
  } catch (e) {
    return 'unknown';
  }
}

function updateStats(domain, duration) {
  if (!(domain in aiEstimates)) {
    addDebugLog('Unknown domain: ' + domain);
    return;
  }
  
  const est = aiEstimates[domain];
  
  // Apply EnviroCast Quantum Algorithm
  const baseEnergy = est.energyPerQuery;
  const energy = applyQuantumCorrection(baseEnergy, est.computeComplexity, duration);
  const co2 = energy * est.carbonIntensity * 1000;
  const water = energy * est.waterPerKWh * 1000;

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
    
    chrome.storage.local.set({ 
      stats,
      lastUpdate: Date.now()
    }, () => {
      console.log('EnviroTrack: Quantum-adjusted stats saved', stats[domain]);
      addDebugLog('Stats saved with quantum correction');
    });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getDebugLog') {
    chrome.storage.local.get(['debugLog'], (result) => {
      sendResponse({ log: result.debugLog || [] });
    });
    return true;
  }
  
  if (request.action === 'getStats') {
    chrome.storage.local.get(['stats', 'lastUpdate'], (result) => {
      sendResponse({ 
        stats: result.stats || {},
        lastUpdate: result.lastUpdate
      });
    });
    return true;
  }
});
