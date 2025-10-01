let showDebug = false;
let lastKnownUpdate = 0;

document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  
  // Listen for update notifications (non-intrusive)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'STATS_UPDATED') {
      loadStats();
    }
  });
  
  // Check for updates every 5 seconds (but only update if data changed)
  setInterval(() => {
    chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
      if (response && response.lastUpdate > lastKnownUpdate) {
        lastKnownUpdate = response.lastUpdate;
        loadStats();
      }
    });
  }, 5000);
});

function loadStats() {
  chrome.storage.local.get(['stats'], (result) => {
    const stats = result.stats || {};
    const domains = Object.keys(stats);
    
    if (domains.length === 0) {
      showNoDataScreen();
      return;
    }
    
    // Calculate totals
    let totals = {
      queries: 0,
      time: 0,
      energy: 0,
      co2: 0,
      water: 0
    };
    
    domains.forEach(domain => {
      const s = stats[domain];
      totals.queries += s.queries;
      totals.time += s.time;
      totals.energy += s.energy;
      totals.co2 += s.co2;
      totals.water += s.water;
    });
    
    // Generate AI summary
    const summary = generateSummary(totals, domains, stats);
    
    // Calculate equivalents
    const phonesCharged = (totals.energy * 1000 / 12).toFixed(1);
    const kmDriving = (totals.co2 / 120).toFixed(2);
    const bottlesWater = (totals.water / 500).toFixed(2);
    
    // Build HTML
    let html = `
      <div class="summary-card">
        <div class="summary-title">📊 Impact Summary</div>
        <div class="summary-text">${summary}</div>
      </div>
      
      <div class="stats-overview">
        <div class="stat-card">
          <div class="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </div>
          <div class="stat-label">Total Queries</div>
          <div class="stat-value">${totals.queries}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
            </svg>
          </div>
          <div class="stat-label">Energy Used</div>
          <div class="stat-value">${(totals.energy * 1000).toFixed(2)}<span class="stat-unit">Wh</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
            </svg>
          </div>
          <div class="stat-label">CO₂ Emissions</div>
          <div class="stat-value">${totals.co2.toFixed(1)}<span class="stat-unit">g</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
            </svg>
          </div>
          <div class="stat-label">Water Used</div>
          <div class="stat-value">${totals.water.toFixed(0)}<span class="stat-unit">ml</span></div>
        </div>
      </div>
      
      <div class="impact-section">
        <div class="impact-title">Environmental Equivalent</div>
        <div class="impact-grid">
          <div class="impact-item">
            <div class="impact-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                <line x1="12" y1="18" x2="12.01" y2="18"></line>
              </svg>
            </div>
            <span class="impact-value">${phonesCharged}</span>
            <span class="impact-label">Phone Charges</span>
          </div>
          <div class="impact-item">
            <div class="impact-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path>
                <circle cx="7" cy="17" r="2"></circle>
                <circle cx="17" cy="17" r="2"></circle>
              </svg>
            </div>
            <span class="impact-value">${kmDriving}</span>
            <span class="impact-label">KM Driving</span>
          </div>
          <div class="impact-item">
            <div class="impact-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2">
                <path d="M9 18H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4"></path>
                <path d="M15 18h4a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-4"></path>
                <path d="M9 2v20"></path>
                <path d="M15 2v20"></path>
              </svg>
            </div>
            <span class="impact-value">${bottlesWater}</span>
            <span class="impact-label">Water Bottles</span>
          </div>
        </div>
      </div>
      
      <div class="platforms-section">
        <div class="section-title">Platform Breakdown</div>
    `;
    
    // Sort platforms by queries
    const sortedDomains = domains.sort((a, b) => stats[b].queries - stats[a].queries);
    
    sortedDomains.forEach(domain => {
      const s = stats[domain];
      html += `
        <div class="platform-card">
          <div class="platform-header">
            <div class="platform-name">${s.name || domain}</div>
            <div class="platform-queries">${s.queries} queries</div>
          </div>
          <div class="platform-stats">
            <div class="platform-stat">
              <span class="platform-stat-value">${(s.energy * 1000).toFixed(1)}</span>
              <span class="platform-stat-label">Wh</span>
            </div>
            <div class="platform-stat">
              <span class="platform-stat-value">${s.co2.toFixed(1)}</span>
              <span class="platform-stat-label">CO₂ (g)</span>
            </div>
            <div class="platform-stat">
              <span class="platform-stat-value">${s.water.toFixed(0)}</span>
              <span class="platform-stat-label">Water (ml)</span>
            </div>
          </div>
        </div>
      `;
    });
    
    html += `
      </div>
      <button class="button" id="resetBtn">Reset All Statistics</button>
      <button class="button secondary" id="debugBtn">Show Debug Info</button>
      <div id="debugSection"></div>
    `;
    
    document.getElementById('content').innerHTML = html;
    
    // Add reset handler
    document.getElementById('resetBtn').addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all statistics?')) {
        chrome.storage.local.set({ stats: {}, debugLog: [], lastUpdate: Date.now() }, () => {
          loadStats();
        });
      }
    });
    
    // Add debug handler
    document.getElementById('debugBtn').addEventListener('click', toggleDebug);
  });
}

function generateSummary(totals, domains, stats) {
  if (totals.queries === 1) {
    return `You've made <span class="summary-highlight">1 AI query</span>. Your environmental footprint is just beginning to take shape. Keep monitoring your usage!`;
  }
  
  if (totals.queries < 10) {
    const topPlatform = domains.sort((a, b) => stats[b].queries - stats[a].queries)[0];
    return `You've made <span class="summary-highlight">${totals.queries} queries</span>, mostly on <span class="summary-highlight">${stats[topPlatform].name}</span>. Your carbon footprint is <span class="summary-highlight">${totals.co2.toFixed(1)}g CO₂</span> - equivalent to a short car trip.`;
  }
  
  if (totals.queries < 50) {
    const co2Impact = totals.co2 < 100 ? 'minimal' : 'moderate';
    return `With <span class="summary-highlight">${totals.queries} queries</span>, your AI usage has a <span class="summary-highlight">${co2Impact}</span> environmental impact. The quantum algorithm calculated <span class="summary-highlight">${totals.co2.toFixed(1)}g CO₂</span> emissions across ${domains.length} platform${domains.length > 1 ? 's' : ''}.`;
  }
  
  const avgEnergyPerQuery = (totals.energy / totals.queries * 1000).toFixed(2);
  const topPlatform = domains.sort((a, b) => stats[b].queries - stats[a].queries)[0];
  
  return `Heavy AI user detected! <span class="summary-highlight">${totals.queries} queries</span> across ${domains.length} platforms. Your primary platform is <span class="summary-highlight">${stats[topPlatform].name}</span> (${stats[topPlatform].queries} queries). Total impact: <span class="summary-highlight">${totals.co2.toFixed(1)}g CO₂</span>, averaging ${avgEnergyPerQuery}Wh per query.`;
}

function showNoDataScreen() {
  let html = `
    <div class="no-data">
      <div class="no-data-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
      </div>
      <div class="no-data-title">No Data Yet</div>
      <div class="no-data-text">
        Visit ChatGPT, Claude, Grok, or Gemini<br>
        and send a message to start tracking!<br><br>
        The quantum algorithm will begin calculating<br>
        your environmental impact automatically.
      </div>
      <button class="button secondary" id="debugBtn">Show Debug Info</button>
      <div id="debugSection"></div>
    </div>
  `;
  
  document.getElementById('content').innerHTML = html;
  document.getElementById('debugBtn').addEventListener('click', toggleDebug);
}

function toggleDebug() {
  showDebug = !showDebug;
  
  if (showDebug) {
    chrome.runtime.sendMessage({ action: 'getDebugLog' }, (response) => {
      const log = response.log || [];
      let debugHtml = `
        <div class="debug-section">
          <div class="debug-title">Debug Log (Last 50 events)</div>
          <div class="debug-log">
      `;
      
      if (log.length === 0) {
        debugHtml += '<div>No requests detected yet. Try sending a message to an AI!</div>';
      } else {
        log.forEach(entry => {
          debugHtml += `<div>${entry.time}: ${entry.message}</div>`;
        });
      }
      
      debugHtml += '</div></div>';
      document.getElementById('debugSection').innerHTML = debugHtml;
    });
  } else {
    document.getElementById('debugSection').innerHTML = '';
  }
}
