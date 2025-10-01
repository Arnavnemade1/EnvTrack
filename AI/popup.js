let showDebug = false;

document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  
  // Refresh every 2 seconds
  setInterval(loadStats, 2000);
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
    
    // Calculate equivalents
    const phonesCharged = (totals.energy * 1000 / 12).toFixed(1);
    const kmDriving = (totals.co2 / 120).toFixed(2);
    const bottlesWater = (totals.water / 500).toFixed(2);
    
    // Build HTML
    let html = `
      <div class="stats-overview">
        <div class="stat-card">
          <span class="stat-icon">⚡</span>
          <div class="stat-label">Total Queries</div>
          <div class="stat-value">${totals.queries}</div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">🔋</span>
          <div class="stat-label">Energy Used</div>
          <div class="stat-value">${(totals.energy * 1000).toFixed(2)}<span class="stat-unit">Wh</span></div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">☁️</span>
          <div class="stat-label">CO₂ Emissions</div>
          <div class="stat-value">${totals.co2.toFixed(1)}<span class="stat-unit">g</span></div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">💧</span>
          <div class="stat-label">Water Used</div>
          <div class="stat-value">${totals.water.toFixed(0)}<span class="stat-unit">ml</span></div>
        </div>
      </div>
      
      <div class="impact-section">
        <div class="impact-title">Environmental Equivalent</div>
        <div class="impact-grid">
          <div class="impact-item">
            <span class="impact-emoji">📱</span>
            <span class="impact-value">${phonesCharged}</span>
            <span class="impact-label">Phone Charges</span>
          </div>
          <div class="impact-item">
            <span class="impact-emoji">🚗</span>
            <span class="impact-value">${kmDriving}</span>
            <span class="impact-label">KM Driving</span>
          </div>
          <div class="impact-item">
            <span class="impact-emoji">🍶</span>
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
        chrome.storage.local.set({ stats: {}, debugLog: [] }, loadStats);
      }
    });
    
    // Add debug handler
    document.getElementById('debugBtn').addEventListener('click', toggleDebug);
  });
}

function showNoDataScreen() {
  let html = `
    <div class="no-data">
      <div class="no-data-icon">🔍</div>
      <div class="no-data-title">No Data Yet</div>
      <div class="no-data-text">
        Visit ChatGPT, Claude, Grok, or Gemini<br>
        and send a message to start tracking!
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
