// ============================================================
// app.js — Main Orchestrator (Full-Stack Version)
// ProReady
// ============================================================

/* global API, generatePlan, drawReadinessGauge, drawSubScoreBar,
          renderAlerts, renderInsights, renderDayTabs, renderDayPanel,
          renderCompareModal, showToast, Chart */

// ── State ────────────────────────────────────────────────────
let state = {
  user: null,
  activeView: 'dashboard',
  currentPlan: null,
  plans: [],
  reports: [],
  activeDayIndex: 0,
  wizardStep: 1,
  wizardData: {},
  chartInstance: null
};

// ── Auth & Init ──────────────────────────────────────────────
async function init() {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (token && userStr) {
    state.user = JSON.parse(userStr);
    showApp();
  } else {
    showAuth();
  }

  setupEventListeners();
}

function showAuth() {
  document.getElementById('auth-view').classList.remove('hidden');
  document.getElementById('app-shell').classList.add('hidden');
}

async function showApp() {
  document.getElementById('auth-view').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  
  // Setup Role UI
  const isCoach = state.user.role === 'coach';
  document.querySelectorAll('.role-player').forEach(el => el.classList.toggle('hidden', isCoach));
  document.querySelectorAll('.role-coach').forEach(el => el.classList.toggle('hidden', !isCoach));
  
  document.getElementById('header-athlete-name').textContent = state.user.name;
  document.getElementById('header-sport').textContent = state.user.sport === 'football' ? '⚽' : (state.user.sport === 'cricket' ? '🏏' : '🏅');

  if (isCoach) {
    showView('network');
    loadNetwork();
  } else {
    await loadPlayerData();
    showView('dashboard');
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  state.user = null;
  showAuth();
}

// ── Data Loading (Player) ────────────────────────────────────
async function loadPlayerData() {
  try {
    state.plans = await API.getPlans();
    state.reports = await API.getReports();
    if (state.plans.length > 0) {
      state.currentPlan = state.plans[0]; // Latest
    }
    refreshDashboard();
    refreshPlanView();
    refreshHistory();
    refreshReport();
    loadPlayerVideos();
  } catch (err) {
    showToast(err.message || 'Error loading data', 'error');
  }
}

// ── Navigation ───────────────────────────────────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  
  const view = document.getElementById(`view-${name}`);
  const nav  = document.getElementById(`nav-${name}`);
  if (view) view.classList.add('active');
  if (nav)  nav.classList.add('active');
  state.activeView = name;

  // Close sidebar on mobile
  document.querySelector('.sidebar')?.classList.remove('active');
  document.getElementById('sidebar-overlay')?.classList.remove('active');

  // Refresh current view logic
  if (name === 'plan') refreshPlanView();
  if (name === 'dashboard') refreshDashboard();
  if (name === 'history') refreshHistory();
  if (name === 'report') refreshReport();
  if (name === 'profile') populateProfileForm();
}

function setupMobileMenu() {
  const toggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  toggle?.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
  });

  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
  });
}

// ── Dashboard ─────────────────────────────────────────────────
function refreshDashboard() {
  // Dashboard is now a static hub, videos are loaded automatically in loadPlayerVideos()
}

// ── Plan View ────────────────────────────────────────────────
function refreshPlanView() {
  const pendingPlans = state.plans.filter(p => !state.reports.some(r => r.planId?._id === p._id || r.planId === p._id));
  
  if (pendingPlans.length === 0) {
    document.getElementById('plan-no-plan')?.classList.remove('hidden');
    const list = document.getElementById('active-plans-list');
    if (list) list.innerHTML = '';
    return;
  }
  
  document.getElementById('plan-no-plan')?.classList.add('hidden');
  const list = document.getElementById('active-plans-list');
  if (list) {
    list.innerHTML = pendingPlans.map(p => {
      const dateFmt = new Date(p.matchDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
      return `
        <div class="history-card" style="cursor:pointer; transition:transform 0.2s;" onclick="openPlanDetailsModal('${p._id}')" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
          <div class="hc-sport">${p.sport === 'football'?'⚽':'🏏'}</div>
          <div class="hc-info">
            <div class="hc-match-date">📅 Match Date: ${dateFmt}</div>
            <div style="font-size:12px; color:var(--text-3); margin-top:4px;">Readiness Score: ${p.readiness_score}</div>
          </div>
          <div class="hc-footer">
            <button class="btn-primary" style="padding:4px 10px; font-size:12px;">View Day Plan →</button>
          </div>
        </div>
      `;
    }).join('');
  }
}

window.openPlanDetailsModal = function(planId) {
  const plan = state.plans.find(p => p._id === planId);
  if (!plan) return;
  
  state.currentPlan = plan;
  state.activeDayIndex = 0;
  
  const el = id => document.getElementById(id);
  
  // Populate Gauge and Sub-scores inside Modal
  const sportIcon = plan.sport === 'football' ? '⚽ Football' : '🏏 Cricket';
  const sportColor = plan.sport === 'football' ? '#16a34a' : '#ca8a04';
  const badge = el('sport-badge');
  if (badge) { badge.textContent = sportIcon; badge.style.background = sportColor + '22'; badge.style.color = sportColor; }

  const daysLeft = Math.ceil((new Date(plan.matchDate) - new Date()) / 86400000);
  const matchEl = el('match-countdown');
  if (matchEl) {
    if (daysLeft <= 0) matchEl.textContent = '🏆 Match Day!';
    else if (daysLeft === 1) matchEl.textContent = '⏰ 1 day to match';
    else matchEl.textContent = `📅 ${daysLeft} days to match`;
  }

  const canvas = el('readiness-canvas');
  if (canvas) drawReadinessGauge(canvas, plan.readiness_score, 'Readiness Score');

  drawSubScoreBar(el('sub-sleep'), plan.sub_scores.sleepScore, '😴 Sleep', '#2563eb');
  drawSubScoreBar(el('sub-fatigue'), plan.sub_scores.fatigueScore, '💪 Recovery', '#0891b2');
  drawSubScoreBar(el('sub-training'), plan.sub_scores.intensityScore, '🏋️ Training', '#7048e8');

  renderAlerts(plan.alerts, el('alerts-container'));
  renderInsights(plan.insights, el('insights-container'));
  
  // Render Day Tabs
  renderDayTabs(plan.days, state.activeDayIndex, (idx) => {
    state.activeDayIndex = idx;
    renderDayPanel(plan.days[idx], plan.sport);
  });
  renderDayPanel(plan.days[state.activeDayIndex], plan.sport);
  
  // Show modal
  el('plan-details-modal').classList.remove('hidden');
};

// ── Report View ───────────────────────────────────────────────
let activeReportingPlanId = null;

window.openReportForm = function(planId, dateStr, sport) {
  activeReportingPlanId = planId;
  document.getElementById('report-form').classList.remove('hidden');
  document.getElementById('report-form-title').textContent = `File Report for ${sport.toUpperCase()} Match on ${dateStr}`;
  // scroll to form
  document.getElementById('report-form').scrollIntoView({ behavior: 'smooth' });
};

function refreshReport() {
  const pendingPlans = state.plans.filter(p => !state.reports.some(r => r.planId?._id === p._id || r.planId === p._id));
  activeReportingPlanId = null;
  document.getElementById('report-form').classList.add('hidden');
  
  if (pendingPlans.length === 0) {
    document.getElementById('report-no-plan').classList.remove('hidden');
    document.getElementById('report-pending-list').innerHTML = '';
  } else {
    document.getElementById('report-no-plan').classList.add('hidden');
    document.getElementById('report-pending-list').innerHTML = pendingPlans.map(p => {
      const dateFmt = new Date(p.matchDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
      return `
        <div class="history-card" style="cursor:pointer; transition:transform 0.2s;" onclick="openReportForm('${p._id}', '${dateFmt}', '${p.sport}')" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
          <div class="hc-sport">${p.sport === 'football'?'⚽':'🏏'}</div>
          <div class="hc-info">
            <div class="hc-match-date">📅 ${dateFmt}</div>
            <div style="font-size:12px; color:var(--text-3); margin-top:4px;">Readiness Score: ${p.readiness_score}</div>
          </div>
          <div class="hc-footer">
            <button class="btn-primary" style="padding:4px 10px; font-size:12px;">File Report →</button>
          </div>
        </div>
      `;
    }).join('');
  }
}

let selectedResult = null;
async function submitReport() {
  if (!activeReportingPlanId) return showToast('Please select a match to report on.', 'error');
  if (!selectedResult) return showToast('Please select a match result.', 'error');
  
  const rating = document.getElementById('rating-slider')?.value || 7;
  const notes = document.getElementById('report-notes')?.value || '';
  const conditions = document.getElementById('report-conditions')?.value || '';

  try {
    const report = await API.saveReport({
      planId: activeReportingPlanId,
      result: selectedResult,
      rating: parseInt(rating),
      notes,
      conditions
    });
    state.reports.unshift(report);
    showToast('Match report saved! 🏆');
    
    // reset form
    document.getElementById('report-notes').value = '';
    document.getElementById('report-conditions').value = '';
    document.querySelectorAll('.result-btn').forEach(b => b.classList.remove('active'));
    selectedResult = null;
    
    refreshReport();
    refreshHistory();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── History & Analytics ──────────────────────────────────────
function refreshHistory() {
  const completedPlans = state.plans.filter(p => state.reports.some(r => r.planId?._id === p._id || r.planId === p._id));
  const container = document.getElementById('history-list');
  if (!container) return;

  if (completedPlans.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No completed matches found. File a report to see history.</p></div>`;
    renderPerformanceChart();
    return;
  }

  container.innerHTML = completedPlans.map(p => {
    const rep = state.reports.find(r => r.planId?._id === p._id || r.planId === p._id);
    const scoreColor = p.readiness_score >= 76 ? '#2f9e44' : p.readiness_score >= 51 ? '#f59f00' : '#e03131';
    const resultBadge = rep ? `<span class="result-badge result-${rep.result}">${rep.result.toUpperCase()}</span>` : `<span class="result-badge result-pending">Pending</span>`;
    const dateFmt = new Date(p.matchDate).toLocaleDateString('en-IN', { day:'numeric', month:'short' });

    return `
      <div class="history-card" data-id="${p._id}" onclick="openMatchDetailModal('${p._id}')">
        <div class="hc-sport">${p.sport === 'football'?'⚽':'🏏'}</div>
        <div class="hc-info">
          <div class="hc-match-date">📅 ${dateFmt}</div>
          <div style="font-size:12px; color:var(--text-3); margin-top:4px;">Readiness: ${p.readiness_score}</div>
        </div>
        <div class="hc-score" style="color:${scoreColor}">
          <span class="hc-score-num">${p.readiness_score}</span>
          <span class="hc-score-lbl">Readiness</span>
        </div>
        <div class="hc-footer">${resultBadge}</div>
        <div class="hc-actions" style="display:flex;gap:8px;margin-top:12px;border-top:1px solid var(--border);padding-top:12px;" onclick="event.stopPropagation()">
          <button class="btn-icon" style="flex:1" onclick="sharePlan('${p._id}')">⬆️ Share</button>
          <button class="btn-icon" style="flex:1" onclick="downloadPlanPDF('${p._id}')">⬇️ Download PDF</button>
        </div>
      </div>
    `;
  }).join('');

  renderPerformanceChart();
}

window.openMatchDetailModal = function(planId) {
  const plan = state.plans.find(p => p._id === planId);
  if (!plan) return;
  const rep = state.reports.find(r => r.planId?._id === planId || r.planId === planId);
  
  const modal = document.getElementById('history-detail-modal');
  const scoreColor = plan.readiness_score >= 76 ? '#2f9e44' : plan.readiness_score >= 51 ? '#f59f00' : '#e03131';
  
  const reportHTML = rep ? `
    <div class="card" style="background:var(--bg-highlight); border:1px solid var(--primary);">
      <h3 style="margin-bottom:10px; font-size:16px;">Match Result: <span class="result-badge result-${rep.result}">${rep.result.toUpperCase()}</span></h3>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-top:10px;">
        <div>
          <div style="font-size:12px; color:var(--text-3); text-transform:uppercase;">Performance Rating</div>
          <div style="font-size:24px; font-weight:800; color:var(--primary);">${rep.rating}/10</div>
        </div>
        <div>
          <div style="font-size:12px; color:var(--text-3); text-transform:uppercase;">Conditions</div>
          <div style="font-size:14px; font-weight:600;">${rep.conditions || 'N/A'}</div>
        </div>
      </div>
      <div style="margin-top:15px;">
        <div style="font-size:12px; color:var(--text-3); text-transform:uppercase;">Notes & Observations</div>
        <p style="font-size:14px; color:var(--text-2); line-height:1.5; margin-top:5px;">${rep.notes || 'No notes provided.'}</p>
      </div>
    </div>
  ` : `
    <div class="card" style="text-align:center; padding:30px;">
      <p style="color:var(--text-3);">No match report filed for this plan yet.</p>
      <button class="btn-primary" style="margin-top:10px;" onclick="document.getElementById('history-detail-modal').classList.add('hidden'); showView('report');">File Report Now</button>
    </div>
  `;

  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-box" style="max-width: 800px; padding:0; overflow:hidden; display:flex; flex-direction:column; max-height:90vh;">
      <div style="padding:20px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; background:var(--bg-card);">
        <h2 class="modal-title" style="margin:0; font-size:20px;">Match Details — ${new Date(plan.matchDate).toLocaleDateString('en-IN', {day:'numeric', month:'long', year:'numeric'})}</h2>
        <button class="modal-close" style="position:static;" onclick="document.getElementById('history-detail-modal').classList.add('hidden')">✕</button>
      </div>
      
      <div style="padding:20px; overflow-y:auto; flex:1; background:var(--bg-body);">
        <div class="dash-grid" style="grid-template-columns: 1fr 1.2fr; gap:20px; align-items:start;">
          <!-- Left: Stats -->
          <div style="display:flex; flex-direction:column; gap:20px;">
            <div class="card" style="text-align:center;">
              <h4 style="margin-bottom:10px; color:var(--text-3); font-size:12px; text-transform:uppercase;">Readiness Score</h4>
              <div style="font-size:48px; font-weight:800; color:${scoreColor};">${plan.readiness_score}</div>
              <p style="font-size:12px; color:var(--text-3); margin-top:5px;">Based on pre-match preparation</p>
            </div>
            
            <div class="card">
              <h3 style="margin-bottom:15px; font-size:15px; border-bottom:1px solid var(--border); padding-bottom:8px;">Prep Metrics</h3>
              <div id="modal-sub-scores" style="display:flex; flex-direction:column; gap:12px;"></div>
            </div>

            ${reportHTML}
          </div>

          <!-- Right: Graph -->
          <div style="display:flex; flex-direction:column; gap:20px;">
            <div class="card">
              <h3 style="margin-bottom:15px; font-size:15px; border-bottom:1px solid var(--border); padding-bottom:8px;">Performance Comparison</h3>
              <canvas id="match-detail-chart" width="100%" height="80"></canvas>
              <div style="margin-top:15px; font-size:12px; color:var(--text-3); line-height:1.4;">
                <p>This graph compares your <strong>Planned Readiness (${plan.readiness_score})</strong> against your <strong>Actual Performance (${rep ? rep.rating * 10 : 0})</strong>.</p>
              </div>
            </div>
            
            <div class="card">
              <h3 style="margin-bottom:10px; font-size:15px;">Preparation Alerts</h3>
              <div id="modal-alerts"></div>
            </div>
          </div>
        </div>
      </div>
      
      <div style="padding:15px 20px; border-top:1px solid var(--border); background:var(--bg-card); display:flex; justify-content:flex-end; gap:10px;">
        <button class="btn-secondary" onclick="document.getElementById('history-detail-modal').classList.add('hidden')">Close</button>
        <button class="btn-primary" onclick="downloadPlanPDF('${plan._id}')">Download Report PDF</button>
      </div>
    </div>
  `;
  
  modal.classList.remove('hidden');
  
  // Render Sub-scores
  const subContainer = document.getElementById('modal-sub-scores');
  subContainer.innerHTML = '<div id="m-sub-sleep"></div><div id="m-sub-recovery"></div><div id="m-sub-training"></div>';
  drawSubScoreBar(document.getElementById('m-sub-sleep'), plan.sub_scores.sleepScore, '😴 Sleep', '#2563eb');
  drawSubScoreBar(document.getElementById('m-sub-recovery'), plan.sub_scores.fatigueScore, '💪 Recovery', '#0891b2');
  drawSubScoreBar(document.getElementById('m-sub-training'), plan.sub_scores.intensityScore, '🏋️ Training', '#7048e8');

  // Render Alerts
  renderAlerts(plan.alerts, document.getElementById('modal-alerts'));

  // Render Small Chart
  const ctx = document.getElementById('match-detail-chart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Readiness', 'Performance'],
      datasets: [{
        label: 'Score',
        data: [plan.readiness_score, rep ? rep.rating * 10 : 0],
        backgroundColor: [scoreColor, '#16a34a'],
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      scales: { x: { min: 0, max: 100 } },
      plugins: { legend: { display: false } }
    }
  });

  modal.querySelector('.modal-backdrop').addEventListener('click', () => modal.classList.add('hidden'));
};


function renderPerformanceChart() {
  const canvas = document.getElementById('performance-chart');
  if (!canvas || state.reports.length === 0) return;

  // Sort reports chronologically for chart
  const data = [...state.reports].reverse().filter(r => r.planId && r.planId.readiness_score);
  
  if (data.length === 0) return;

  const labels = data.map(r => new Date(r.savedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }));
  const readinessData = data.map(r => r.planId.readiness_score);
  const ratingData = data.map(r => r.rating * 10); // scale 1-10 to 10-100 for comparison

  if (state.chartInstance) state.chartInstance.destroy();

  state.chartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Readiness Score', data: readinessData, borderColor: '#2563eb', backgroundColor: '#2563eb33', tension: 0.3, fill: true },
        { label: 'Match Rating (x10)', data: ratingData, borderColor: '#16a34a', backgroundColor: 'transparent', tension: 0.3, borderDash: [5, 5] }
      ]
    },
    options: {
      responsive: true,
      scales: { y: { min: 0, max: 100 } }
    }
  });
}

// ── Export & Share ───────────────────────────────────────────
window.sharePlan = function(planId) {
  const plan = state.plans.find(p => p._id === planId);
  if (!plan) return;
  const text = `Check out my Match Readiness Plan for my upcoming ${plan.sport} match on ${new Date(plan.matchDate).toLocaleDateString()}! My Readiness Score is ${plan.readiness_score}/100.`;
  if (navigator.share) {
    navigator.share({ title: 'Match Readiness Plan', text }).catch(console.error);
  } else {
    navigator.clipboard.writeText(text);
    showToast('Plan summary copied to clipboard!');
  }
};

window.downloadPlanPDF = function(planId) {
  const plan = state.plans.find(p => p._id === planId);
  if (!plan) return;
  const rep = state.reports.find(r => r.planId?._id === planId || r.planId === planId);
  
  let html = `
    <html><head><title>Match Plan - ${plan.sport}</title>
    <style>
      body { font-family: sans-serif; color: #333; padding: 20px; }
      h1, h2 { color: #1e3a8a; }
      .card { border: 1px solid #ccc; padding: 15px; margin-bottom: 15px; border-radius: 8px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    </style></head><body>
    <h1>Match Readiness Plan: ${plan.sport.toUpperCase()}</h1>
    <p><strong>Match Date:</strong> ${new Date(plan.matchDate).toDateString()}</p>
    <p><strong>Readiness Score:</strong> ${plan.readiness_score} / 100</p>
    <hr/>
    <h2>Daily Schedule</h2>
  `;
  
  plan.days.forEach(d => {
    html += `<div class="card"><h3>${d.day_label} - ${d.date}</h3><div class="grid">`;
    Object.keys(d.schedule).forEach(time => {
      const block = d.schedule[time];
      html += `<div><strong>${time.toUpperCase()}</strong><br/>`;
      html += `Activity: ${block.activity}<br/>Nutrition: ${block.nutrition}<br/>Notes: ${block.notes}</div>`;
    });
    html += `</div></div>`;
  });

  if (rep) {
    html += `<h2>Match Report</h2><div class="card">
      <p><strong>Result:</strong> ${rep.result.toUpperCase()}</p>
      <p><strong>Performance Rating:</strong> ${rep.rating} / 10</p>
      <p><strong>Notes:</strong> ${rep.notes || 'None'}</p>
    </div>`;
  }

  html += `<script>window.onload=function(){window.print();window.close();}</script></body></html>`;
  
  const win = window.open('', '', 'width=800,height=600');
  win.document.write(html);
  win.document.close();
};

// ── Video Upload ──────────────────────────────────────────────
async function handleVideoUpload(e) {
  e.preventDefault();
  const file = document.getElementById('upload-file').files[0];
  if (!file) return;

  const btn = document.getElementById('btn-upload-submit');
  btn.textContent = 'Uploading...';
  btn.disabled = true;

  const formData = new FormData();
  formData.append('title', document.getElementById('upload-title').value);
  formData.append('description', document.getElementById('upload-desc').value);
  formData.append('sport', state.user.sport);
  formData.append('video', file);

  try {
    await API.uploadVideo(formData);
    showToast('Video uploaded successfully!', 'success');
    document.getElementById('upload-form').reset();
    loadPlayerVideos();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.textContent = 'Upload Video 🚀';
    btn.disabled = false;
  }
}

async function loadPlayerVideos() {
  const container1 = document.getElementById('player-videos-list');
  const container2 = document.getElementById('dash-player-videos');
  try {
    const videos = await API.getPlayerVideos();
    const html = videos.map(v => `
      <div class="video-card">
        <video src="${v.videoUrl}" controls class="video-player"></video>
        <div class="video-info">
          <div class="video-title">${v.title}</div>
          <div class="video-desc">${v.description || ''}</div>
        </div>
      </div>
    `).join('');
    
    if(container1) container1.innerHTML = html;
    if(container2) container2.innerHTML = html || '<p style="font-size:13px; color:var(--text-3)">No videos uploaded yet.</p>';
  } catch(err) { console.error(err); }
}

// ── Coach Network ─────────────────────────────────────────────
let allNetworkVideos = [];

async function loadNetwork() {
  try {
    allNetworkVideos = await API.getNetwork();
    filterNetwork();
  } catch(err) { showToast(err.message, 'error'); }
}

window.filterNetwork = function() {
  const filter = document.getElementById('network-sport-filter').value;
  const container = document.getElementById('network-list');
  const filtered = filter === 'all' ? allNetworkVideos : allNetworkVideos.filter(v => v.sport === filter);
  
  container.innerHTML = filtered.map(v => `
    <div class="video-card coach-video-card" onclick="openPlayerProfile('${v.uploader._id}', '${v.videoUrl}', '${v.title}')">
      <video src="${v.videoUrl}" class="video-player" muted onmouseover="this.play()" onmouseout="this.pause()"></video>
      <div class="video-info">
        <div class="video-title">${v.title}</div>
        <div class="video-uploader"><span>${v.uploader.name}</span><span>${v.sport==='football'?'⚽':'🏏'}</span></div>
      </div>
    </div>
  `).join('');
};

window.openPlayerProfile = async function(playerId, videoUrl, videoTitle) {
  try {
    const data = await API.getPlayerDetails(playerId);
    
    // Calculate Confidence Level
    let avgReadiness = 0;
    let avgRating = 0;
    let validReports = data.reports.filter(r => r.planId && r.planId.readiness_score);
    if(validReports.length > 0) {
      avgReadiness = validReports.reduce((sum, r) => sum + r.planId.readiness_score, 0) / validReports.length;
      avgRating = validReports.reduce((sum, r) => sum + (r.rating * 10), 0) / validReports.length;
    }
    let overall = (avgReadiness + avgRating) / 2;
    let confLevel = validReports.length === 0 ? 'N/A' : (overall >= 80 ? '🟢 High' : overall >= 55 ? '🟡 Medium' : '🔴 Low');

    // Calculate Achievements from wins
    const winAchievements = data.reports
      .filter(r => r.result === 'win')
      .map(r => `Won a match on ${new Date(r.savedAt).toLocaleDateString('en-IN', {day:'numeric', month:'short'})} (Rating: ${r.rating}/10)`);
    
    const allAchievements = [...winAchievements];

    const modal = document.getElementById('coach-player-modal');
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-box" style="max-width: 1000px; padding:0; overflow:hidden; display:flex; flex-direction:column; max-height:95vh;">
        <div style="padding:20px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; background:var(--bg-card);">
          <div>
            <h2 class="modal-title" style="margin:0; font-size:22px; display:flex; align-items:center; gap:10px;">
              ${data.player.name} 
              <span style="font-size:12px; padding:4px 10px; background:var(--bg-highlight); color:var(--primary); border-radius:12px;">${data.player.sport.toUpperCase()}</span>
            </h2>
          </div>
          <button class="modal-close" style="position:static;" onclick="document.getElementById('coach-player-modal').classList.add('hidden')">✕</button>
        </div>
        
        <div style="padding:20px; overflow-y:auto; flex:1; background:var(--bg-body);">
          <div class="dash-grid" style="grid-template-columns: 1.5fr 1fr; gap:20px; align-items:start;">
            
            <!-- Left Column: Video & Chart -->
            <div style="display:flex; flex-direction:column; gap:20px;">
              <div class="card" style="padding:0; background:#000; border-radius:12px; overflow:hidden; border:none;">
                <video src="${videoUrl}" controls autoplay style="width:100%; max-height:450px; object-fit:contain; display:block;"></video>
                <div style="padding:15px; background:var(--bg-card); border-top:1px solid #333;">
                  <h3 style="margin:0; font-size:16px; color:var(--text-1);">${videoTitle}</h3>
                </div>
              </div>
              
              <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid var(--border); padding-bottom:10px;">
                  <h3 style="margin:0; font-size:16px;">Performance Analytics</h3>
                  <div style="font-size:11px; color:var(--text-3); cursor:help;" title="Readiness: AI prediction before match. Rating: Player performance after match.">ⓘ How it works</div>
                </div>
                <canvas id="coach-player-chart" width="100%" height="45"></canvas>
                <div style="margin-top:15px; font-size:12px; color:var(--text-3); line-height:1.4;">
                  <p><strong>Readiness Score:</strong> AI prediction of the player's potential performance based on sleep, fatigue, and training load.</p>
                  <p style="margin-top:6px;"><strong>Match Rating:</strong> The player's self-reported performance score (out of 10) for completed matches.</p>
                </div>
              </div>
            </div>

            <!-- Right Column: Details & Stats -->
            <div style="display:flex; flex-direction:column; gap:20px;">
              
              <div class="card" style="background:var(--bg-highlight); border:1px solid var(--primary); text-align:center;">
                <h4 style="margin-bottom:8px; color:var(--text-2); font-size:13px; text-transform:uppercase; letter-spacing:1px;">Scout Confidence Rating</h4>
                <div style="font-size:32px; font-weight:800; color:var(--text-1); margin-bottom:5px;">${confLevel}</div>
                <p style="font-size:12px; color:var(--text-3); margin:0;">Calculated from AI Readiness & Match Reports</p>
              </div>

              <div class="card">
                <h3 style="margin-bottom:15px; font-size:16px; border-bottom:1px solid var(--border); padding-bottom:10px;">Player Profile</h3>
                <div style="margin-bottom:15px;">
                  <span style="font-size:12px; color:var(--text-3); text-transform:uppercase; font-weight:600;">Email Contact</span>
                  <div style="font-weight:600; margin-top:2px;"><a href="mailto:${data.player.email}" style="color:var(--primary); text-decoration:none;">${data.player.email}</a></div>
                </div>
                <div>
                  <span style="font-size:12px; color:var(--text-3); text-transform:uppercase; font-weight:600;">Biography</span>
                  <p style="margin-top:4px; font-size:14px; line-height:1.6; color:var(--text-2);">${data.player.bio || 'No biography provided.'}</p>
                </div>
              </div>
              
              <div class="card">
                <h3 style="margin-bottom:15px; font-size:16px; border-bottom:1px solid var(--border); padding-bottom:10px;">Notable Achievements</h3>
                <ul style="margin:0; padding-left:20px; font-size:14px; color:var(--text-2); line-height:1.6;">
                  ${allAchievements.length ? allAchievements.map(a => `<li>${a}</li>`).join('') : '<li>No wins recorded yet.</li>'}
                </ul>
              </div>
              
              <div class="card" style="display:flex; justify-content:space-around; align-items:center; text-align:center;">
                <div>
                  <div style="font-size:24px; font-weight:700; color:var(--primary);">${data.reports.length}</div>
                  <div style="font-size:12px; color:var(--text-3); text-transform:uppercase; margin-top:4px;">Matches<br/>Tracked</div>
                </div>
                <div style="height:40px; width:1px; background:var(--border);"></div>
                <div>
                  <div style="font-size:24px; font-weight:700; color:var(--primary);">${data.videos.length}</div>
                  <div style="font-size:12px; color:var(--text-3); text-transform:uppercase; margin-top:4px;">Videos<br/>Uploaded</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    `;
    modal.classList.remove('hidden');
    
    // Render Chart
    if(validReports.length > 0) {
      const reversed = [...validReports].reverse();
      new Chart(document.getElementById('coach-player-chart'), {
        type: 'bar',
        data: {
          labels: reversed.map(r => new Date(r.savedAt).toLocaleDateString('en-IN', {month:'short', day:'numeric'})),
          datasets: [
            { label: 'Readiness', data: reversed.map(r => r.planId.readiness_score), backgroundColor: '#2563eb' },
            { label: 'Match Rating (x10)', data: reversed.map(r => r.rating * 10), backgroundColor: '#16a34a' }
          ]
        },
        options: { responsive: true, scales: { y: { min: 0, max: 100 } } }
      });
    }

    modal.querySelector('.modal-backdrop').addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.innerHTML = ''; // Clear video to stop playing
    });
  } catch(err) { showToast(err.message, 'error'); }
};

// ── Profile Logic ─────────────────────────────────────────────
function populateProfileForm() {
  document.getElementById('profile-name').value = state.user.name || '';
  document.getElementById('profile-email').value = state.user.email || '';
  document.getElementById('profile-bio').value = state.user.bio || '';
}

async function handleProfileSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('profile-name').value;
  const email = document.getElementById('profile-email').value;
  const bio = document.getElementById('profile-bio').value;
  
  const btn = document.getElementById('btn-profile-submit');
  btn.textContent = 'Saving...';
  btn.disabled = true;
  
  try {
    const updatedUser = await API.updateProfile({ name, email, bio });
    state.user = updatedUser;
    localStorage.setItem('user', JSON.stringify(state.user));
    
    // Update Header
    document.getElementById('header-athlete-name').textContent = state.user.name;
    
    showToast('Profile updated successfully!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.textContent = 'Save Changes';
    btn.disabled = false;
  }
}

// ── Wizard Logic ──────────────────────────────────────────────
function openWizard() {
  state.wizardStep = 1;
  state.wizardData = {};
  document.getElementById('wizard-overlay').classList.remove('hidden');
  showWizardStep(1);
}
function closeWizard() { document.getElementById('wizard-overlay').classList.add('hidden'); }
function showWizardStep(step) {
  state.wizardStep = step;
  document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
  document.getElementById(`step-${step}`)?.classList.add('active');
  document.querySelectorAll('.progress-dot').forEach((dot, i) => dot.classList.toggle('active', i < step));
  document.getElementById('wizard-back').style.display = step === 1 ? 'none' : '';
  document.getElementById('wizard-next').style.display = step === 3 ? 'none' : '';
  document.getElementById('wizard-finish').style.display = step === 3 ? '' : 'none';
}
function wizardNext() {
  if (state.wizardStep === 1) {
    state.wizardData.matchDate = document.getElementById('match-date').value;
    state.wizardData.sport = document.getElementById('wizard-sport').value;
    state.wizardData.matchTime = document.getElementById('match-time')?.value || '15:00';
  }
  if (state.wizardStep === 2) state.wizardData.scheduleHours = document.getElementById('schedule-hours').value;
  if (state.wizardStep < 3) showWizardStep(state.wizardStep + 1);
}
function wizardBack() { if (state.wizardStep > 1) showWizardStep(state.wizardStep - 1); }
async function finishWizard() {
  state.wizardData.sleepHours = document.getElementById('sleep-hours').value;
  state.wizardData.soreness = document.querySelector('.soreness-option.selected')?.dataset.val || 'low';
  state.wizardData.intensity = document.querySelector('.intensity-option.selected')?.dataset.val || 'medium';
  
  const btn = document.getElementById('wizard-finish');
  const originalText = btn.textContent;
  btn.textContent = 'Generating AI Plan...';
  btn.disabled = true;
  
  try {
    const savedPlan = await API.analyzePrep(state.wizardData, state.plans);
    
    // Update user sport globally based on what they just selected
    state.user.sport = state.wizardData.sport;
    localStorage.setItem('user', JSON.stringify(state.user));
    document.getElementById('header-sport').textContent = state.user.sport === 'football' ? '⚽' : '🏏';
    state.plans.unshift(savedPlan);
    state.currentPlan = savedPlan;
    closeWizard();
    showView('dashboard');
    showToast('AI Plan generated successfully! ✨');
  } catch(err) { 
    showToast(err.message, 'error'); 
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

// ── Event Listeners ──────────────────────────────────────────
function setupEventListeners() {
  // Auth with Google
  document.getElementById('btn-google-login')?.addEventListener('click', async () => {
    try {
      const btn = document.getElementById('btn-google-login');
      const originalText = btn.innerHTML;
      btn.textContent = 'Redirecting...';
      btn.disabled = true;

      const url = await API.getGoogleAuthUrl();
      window.location.href = url; // Redirect to Google Consent Screen
    } catch (err) {
      alert('Failed to initialize Google Login: ' + err.message);
      document.getElementById('btn-google-login').disabled = false;
    }
  });

  // Handle OAuth Callback check on page load
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const userDataStr = urlParams.get('user');

  if (token && userDataStr) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', userDataStr);
    
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Wait slightly to let init() catch it or just reload
    window.location.reload();
  }

  // Calendar Sync
  document.getElementById('btn-sync-calendar')?.addEventListener('click', async () => {
    if (!state.currentPlan || !state.currentPlan._id) {
      showToast('No active plan to sync.', 'error');
      return;
    }

    const btn = document.getElementById('btn-sync-calendar');
    const originalText = btn.innerHTML;
    btn.textContent = 'Syncing...';
    btn.disabled = true;

    try {
      await API.syncCalendar(state.currentPlan._id);
      showToast('Successfully synced to Google Calendar! 📅', 'success');
    } catch (err) {
      showToast('Sync Failed: ' + err.message, 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });

  // Nav
  ['dashboard','plan','report','history','upload','network','profile'].forEach(v => {
    document.getElementById(`nav-${v}`)?.addEventListener('click', () => showView(v));
  });

  // Forms
  document.getElementById('upload-form')?.addEventListener('submit', handleVideoUpload);
  document.getElementById('profile-form')?.addEventListener('submit', handleProfileSubmit);

  // Buttons
  document.getElementById('btn-logout')?.addEventListener('click', logout);
  document.getElementById('btn-new-plan')?.addEventListener('click', openWizard);
  document.getElementById('btn-new-plan-empty')?.addEventListener('click', openWizard);
  document.getElementById('btn-new-plan-plan')?.addEventListener('click', openWizard);
  
  // Wizard
  document.getElementById('wizard-next')?.addEventListener('click', wizardNext);
  document.getElementById('wizard-back')?.addEventListener('click', wizardBack);
  document.getElementById('wizard-finish')?.addEventListener('click', finishWizard);
  document.getElementById('wizard-close')?.addEventListener('click', closeWizard);

  // Results & Sliders
  document.querySelectorAll('.result-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.result-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedResult = btn.dataset.result;
    });
  });
  
  const sl = document.getElementById('rating-slider');
  const lbl = document.getElementById('rating-val');
  if(sl && lbl) sl.addEventListener('input', () => lbl.textContent = sl.value);

  const sl2 = document.getElementById('sleep-hours');
  const lbl2 = document.getElementById('sleep-val');
  if(sl2 && lbl2) sl2.addEventListener('input', () => lbl2.textContent = sl2.value + 'h');

  ['soreness-option','intensity-option'].forEach(cls => {
    document.querySelectorAll(`.${cls}`).forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll(`.${cls}`).forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
  });

  document.getElementById('btn-submit-report')?.addEventListener('click', submitReport);
}

// Init
document.addEventListener('DOMContentLoaded', init);
