// Popup script
document.addEventListener('DOMContentLoaded', function() {
  loadStats();
  
  // Refresh stats every 2 seconds
  setInterval(loadStats, 2000);
});

function loadStats() {
  chrome.runtime.sendMessage({ type: 'GET_STATS' }, function(data) {
    if (!data) {
      document.getElementById('content').innerHTML = '<div class="no-data">No data available</div>';
      return;
    }
    
    const { totalRequests, totalEnergy, totalCO2, sessions, dailyStats } = data;
    
    if (totalRequests === 0) {
      document.getElementById('content').innerHTML = `
        <div class="no-data">
          <p>No AI requests tracked yet.</p>
          <p style="margin-top: 10px;">Visit an AI platform to start tracking!</p>
        </div>
      `;
      return;
    }
    
    // Get today's platform usage
    const today = new Date().toISOString().split('T')[0];
    const todayStats = dailyStats[today] || { platforms: {} };
    const platformEntries = Object.entries(todayStats.platforms).sort((a, b) => b[1] - a[1]);
    
    // Calculate equivalents
    const phonesCharged = (totalEnergy * 1000 / 12).toFixed(1); // 12Wh per phone charge
    const kmDriving = (totalCO2 / 120).toFixed(2); // 120g CO2 per km
    const treesNeeded = (totalCO2 / 21000).toFixed(3); // 21kg CO2 per tree per year
    
    const html = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Requests</div>
          <div class="stat-value">${totalRequests}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Energy Used</div>
          <div class="stat-value">${(totalEnergy * 1000).toFixed(1)}<span class="stat-unit">Wh</span></div>
        </div>
        <div class="stat-card full">
          <div class="stat-label">CO₂ Emissions</div>
          <div class="stat-value">${totalCO2.toFixed(1)}<span class="stat-unit">g</span></div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Environmental Impact</div>
        <div class="comparison">
          <div class="comparison-item">Could charge ${phonesCharged} smartphones</div>
          <div class="comparison-item">Equals ${kmDriving} km of driving</div>
          <div class="comparison-item">Takes ${treesNeeded} trees/year to offset</div>
        </div>
      </div>
      
      ${platformEntries.length > 0 ? `
      <div class="section">
        <div class="section-title">Today's Usage by Platform</div>
        <div class="platform-list">
          ${platformEntries.map(([platform, count]) => `
            <div class="platform-item">
              <span class="platform-name">${platform}</span>
              <span class="platform-count">${count} requests</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      <button class="button" id="resetBtn">Reset Statistics</button>
    `;
    
    document.getElementById('content').innerHTML = html;
    
    // Add reset button listener
    document.getElementById('resetBtn').addEventListener('click', function() {
      if (confirm('Are you sure you want to reset all statistics?')) {
        chrome.runtime.sendMessage({ type: 'RESET_STATS' }, function() {
          loadStats();
        });
      }
    });
  });
}
