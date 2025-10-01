// Content script to detect AI requests
(function() {
  'use strict';
  
  const AI_PLATFORMS = {
    'chatgpt.com': 'ChatGPT',
    'claude.ai': 'Claude',
    'gemini.google.com': 'Gemini',
    'chat.deepseek.com': 'DeepSeek',
    'copilot.microsoft.com': 'Copilot',
    'grok.com': 'Grok',
    'poe.com': 'Poe',
    'perplexity.ai': 'Perplexity',
    'character.ai': 'Character.AI',
    'huggingface.co': 'HuggingFace',
    'replicate.com': 'Replicate'
  };
  
  function getPlatform() {
    const hostname = window.location.hostname;
    for (const [domain, name] of Object.entries(AI_PLATFORMS)) {
      if (hostname.includes(domain)) {
        return name;
      }
    }
    return 'Unknown';
  }
  
  const platform = getPlatform();
  let requestCounter = 0;
  
  // Intercept fetch requests
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const requestId = `req_${Date.now()}_${requestCounter++}`;
    const url = args[0]?.toString() || 'unknown';
    
    // Check if this looks like an AI request
    const isAIRequest = url.includes('/api/') || 
                        url.includes('/chat') || 
                        url.includes('/completion') ||
                        url.includes('/generate') ||
                        url.includes('/stream');
    
    if (isAIRequest) {
      chrome.runtime.sendMessage({
        type: 'REQUEST_START',
        requestId: requestId,
        url: url,
        platform: platform
      });
      
      try {
        const response = await originalFetch.apply(this, args);
        
        // Clone response to read it
        const clonedResponse = response.clone();
        
        // Wait for response to complete
        clonedResponse.text().then(() => {
          chrome.runtime.sendMessage({
            type: 'REQUEST_END',
            requestId: requestId
          });
        }).catch(() => {
          chrome.runtime.sendMessage({
            type: 'REQUEST_END',
            requestId: requestId
          });
        });
        
        return response;
      } catch (error) {
        chrome.runtime.sendMessage({
          type: 'REQUEST_END',
          requestId: requestId
        });
        throw error;
      }
    }
    
    return originalFetch.apply(this, args);
  };
  
  // Intercept XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._url = url;
    this._method = method;
    return originalXHROpen.apply(this, [method, url, ...rest]);
  };
  
  XMLHttpRequest.prototype.send = function(...args) {
    const url = this._url || '';
    const isAIRequest = url.includes('/api/') || 
                        url.includes('/chat') || 
                        url.includes('/completion') ||
                        url.includes('/generate') ||
                        url.includes('/stream');
    
    if (isAIRequest) {
      const requestId = `xhr_${Date.now()}_${requestCounter++}`;
      
      chrome.runtime.sendMessage({
        type: 'REQUEST_START',
        requestId: requestId,
        url: url,
        platform: platform
      });
      
      this.addEventListener('loadend', function() {
        chrome.runtime.sendMessage({
          type: 'REQUEST_END',
          requestId: requestId
        });
      });
    }
    
    return originalXHRSend.apply(this, args);
  };
  
  console.log('EnviroTrack: Monitoring', platform);
})();
