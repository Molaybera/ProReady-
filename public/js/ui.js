// ============================================================
// ui.js — DOM Rendering Helpers
// ProReady
// ============================================================

// Parse a YYYY-MM-DD string as local noon (avoids UTC-midnight / timezone shift)
function parseLocalDate(dateStr) {
  if (!dateStr || !dateStr.includes('-')) return new Date(dateStr);
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}
function fmtDate(dateStr, opts) {
  return parseLocalDate(dateStr).toLocaleDateString('en-IN', opts);
}

// ── Alerts ───────────────────────────────────────────────────
function renderAlerts(alerts, container) {
  if (!container) return;
  if (!alerts || alerts.length === 0) {
    container.innerHTML = `<div class="no-alerts"><span>✅</span> No active alerts — great preparation!</div>`;
    return;
  }
  container.innerHTML = alerts.map(a => `
    <div class="alert-card alert-${a.type}">
      <div class="alert-icon">${a.icon}</div>
      <div class="alert-body">
        <div class="alert-title">${a.title}</div>
        <div class="alert-msg">${a.message}</div>
      </div>
    </div>
  `).join('');
}

// ── Insights ─────────────────────────────────────────────────
function renderInsights(insights, container) {
  if (!container) return;
  if (!insights || insights.length === 0) {
    container.innerHTML = `<p class="muted">No insights yet.</p>`;
    return;
  }
  container.innerHTML = insights.map(ins => `
    <div class="insight-card insight-${ins.type}">
      <span class="insight-icon">${ins.icon}</span>
      <p>${ins.text}</p>
    </div>
  `).join('');
}

// ── Day Tabs ─────────────────────────────────────────────────
function renderDayTabs(days, activeIndex, onSelect) {
  const container = document.getElementById('day-tabs');
  if (!container) return;
  container.innerHTML = days.map((d, i) => `
    <button
      class="day-tab ${i === activeIndex ? 'active' : ''} ${d.isMatchDay ? 'match-day-tab' : ''}"
      data-index="${i}"
    >
      <span class="day-tab-label">${d.day_label}</span>
      <span class="day-tab-date">${d.date}</span>
    </button>
  `).join('');

  container.querySelectorAll('.day-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      container.querySelectorAll('.day-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onSelect(idx);
    });
  });
}

// ── Dashboard Time Row ───────────────────────────────────────────
function buildTimeCard(slot, data, sport) {
  const meta = {
    morning:   { label: 'Morning',   time: '08:00 AM', icon: '🌅', cls: 'morning'   },
    afternoon: { label: 'Afternoon', time: '01:00 PM', icon: '☀️', cls: 'afternoon' },
    evening:   { label: 'Evening',   time: '06:00 PM', icon: '🌆', cls: 'evening'   },
    night:     { label: 'Night',     time: '09:00 PM', icon: '🌙', cls: 'night'     },
  }[slot];

  const tags = (data.tags || []).map(t => `<span class="dash-tag">${t}</span>`).join('');
  
  // Calculate stroke dashoffset for a sleek circular progress or use a clean horizontal bar
  const intensityBar = data.intensity > 0
    ? `<div class="dash-intensity-wrap">
         <div class="dash-intensity-label">Intensity <span>${data.intensity}%</span></div>
         <div class="dash-intensity-bar"><div class="dash-intensity-fill" style="width:${data.intensity}%; background: ${data.intensity > 70 ? '#e03131' : data.intensity > 40 ? '#f59f00' : '#2f9e44'};"></div></div>
       </div>`
    : `<div class="dash-intensity-wrap rest">
         <div class="dash-intensity-label">Recovery Session</div>
       </div>`;

  return `
    <div class="dash-time-row">
      <!-- Sidebar -->
      <div class="dash-time-sidebar ${meta.cls}">
        <div class="dash-ts-icon">${meta.icon}</div>
        <div class="dash-ts-label">${meta.label}</div>
        <div class="dash-ts-time">${meta.time}</div>
      </div>
      
      <!-- Content Area -->
      <div class="dash-time-content">
        <div class="dash-mini-cards">
          <!-- Activity Card -->
          <div class="dash-mini-card">
            <div class="dash-mc-header">Activity</div>
            <div class="dash-mc-value">${data.activity}</div>
          </div>
          <!-- Nutrition Card -->
          <div class="dash-mini-card">
            <div class="dash-mc-header">🍽️ Nutrition</div>
            <div class="dash-mc-value">${data.food}</div>
          </div>
          <!-- Intensity Card -->
          <div class="dash-mini-card dash-mc-intensity">
            ${intensityBar}
          </div>
        </div>
        
        <!-- Notes & Tags Row -->
        <div class="dash-notes-row">
          <div class="dash-notes-content"><strong>📋 Notes:</strong> ${data.notes}</div>
          <div class="dash-tags-container">${tags}</div>
        </div>
      </div>
    </div>
  `;
}

// ── Day Panel ─────────────────────────────────────────────────
function renderDayPanel(day, sport) {
  const container = document.getElementById('day-panel');
  if (!container || !day) return;

  const matchBanner = day.isMatchDay ? `<div class="match-day-banner">🏆 MATCH DAY — Execute your plan!</div>` : '';
  const imminentBanner = day.isImminent ? `<div class="imminent-banner">⚡ Match in ${day.timeStr}! Act NOW.</div>` : '';

  const slots = ['morning', 'afternoon', 'evening', 'night'];
  const cards = slots.map(s => buildTimeCard(s, day.schedule[s], sport)).join('');

  container.innerHTML = `
    ${imminentBanner}${matchBanner}
    <div class="day-header" style="padding-bottom: 10px; border-bottom: 2px solid var(--border); margin-bottom: 20px;">
      <h2 class="day-title" style="font-size: 24px;">${day.day_label}</h2>
      <span class="day-date-badge" style="font-size: 14px; padding: 6px 12px;">${day.date}</span>
    </div>
    <div class="dashboard-timeline">${cards}</div>
  `;
}

// ── History Cards ────────────────────────────────────────────
function renderHistory(plans, onCompare) {
  const container = document.getElementById('history-list');
  if (!container) return;

  if (!plans || plans.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📂</div><p>No match history yet.<br>Generate your first plan to begin tracking.</p></div>`;
    return;
  }

  container.innerHTML = plans.map(p => {
    const sport = p.sport || 'football';
    const sportName = sport === 'football' ? 'Football ⚽' : 'Cricket 🏏';
    const score = p.readiness_score || 0;
    const scoreColor = score >= 76 ? '#2f9e44' : score >= 51 ? '#f59f00' : '#e03131';
    const report = p.report;
    const resultBadge = report
      ? `<span class="result-badge result-${report.result}">${report.result.toUpperCase()}</span>`
      : `<span class="result-badge result-pending">Report Pending</span>`;
    const dateFmt = p.matchDate ? fmtDate(p.matchDate, { weekday:'long', day:'numeric', month:'long', year:'numeric' }) : 'Unknown';

    return `
      <div class="history-card" data-id="${p.id}">
        <div class="hc-sport">${sportName}</div>
        <div class="hc-info">
          <div class="hc-match-date">📅 Match: ${dateFmt}</div>
          <div class="hc-gen-date">Generated: ${new Date(p.generatedAt).toLocaleDateString('en-IN')}</div>
        </div>
        <div class="hc-score" style="color:${scoreColor}">
          <span class="hc-score-num">${score}</span>
          <span class="hc-score-lbl">Readiness</span>
        </div>
        <div class="hc-footer">
          ${resultBadge}
          <button class="btn-compare" data-id="${p.id}">🔍 Compare</button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.btn-compare').forEach(btn => {
    btn.addEventListener('click', () => onCompare(btn.dataset.id));
  });
}

// ── Compare Modal ────────────────────────────────────────────
function renderCompareModal(past, current) {
  const modal = document.getElementById('compare-modal');
  if (!modal) return;

  const pScore = past.readiness_score || 0;
  const cScore = current ? current.readiness_score || 0 : null;

  const pReport = past.report;
  const resultRow = pReport ? `
    <tr><td>Match Result</td><td><strong class="result-badge result-${pReport.result}">${pReport.result.toUpperCase()}</strong></td></tr>
    <tr><td>Performance Rating</td><td><strong>${pReport.rating}/10</strong></td></tr>
    <tr><td>Notes</td><td><em>${pReport.notes || '—'}</em></td></tr>
  ` : '<tr><td colspan="2"><em>No match report filed.</em></td></tr>';

  const currentBlock = cScore !== null ? `
    <div class="compare-col">
      <h4>Current Prep</h4>
      <div class="compare-score" style="color:${cScore>=76?'#2f9e44':cScore>=51?'#f59f00':'#e03131'}">${cScore}</div>
      <p>Sleep: ${current.inputs?.sleepHours || '?'}h</p>
      <p>Soreness: ${current.inputs?.soreness || '?'}</p>
      <p>Intensity: ${current.inputs?.intensity || '?'}</p>
      <p class="compare-verdict">${cScore > pScore ? '📈 Better prepared than last match!' : cScore === pScore ? '↔️ Same preparation level.' : '📉 Lower readiness than last match.'}</p>
    </div>
  ` : '<div class="compare-col muted"><p>No active plan to compare.</p></div>';

  modal.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop"></div>
    <div class="modal-box">
      <button class="modal-close" id="modal-close">✕</button>
      <h3 class="modal-title">📊 Match Comparison</h3>
      <div class="compare-grid">
        <div class="compare-col">
          <h4>Past Match — ${past.sport === 'football' ? '⚽ Football' : '🏏 Cricket'}</h4>
          <div class="compare-score" style="color:${pScore>=76?'#2f9e44':pScore>=51?'#f59f00':'#e03131'}">${pScore}</div>
          <p>Sleep: ${past.inputs?.sleepHours || '?'}h</p>
          <p>Soreness: ${past.inputs?.soreness || '?'}</p>
          <p>Intensity: ${past.inputs?.intensity || '?'}</p>
          <table class="compare-report">${resultRow}</table>
        </div>
        ${currentBlock}
      </div>
      <button class="btn-primary" id="modal-close-btn">Close</button>
    </div>
  `;
  modal.classList.remove('hidden');
  document.getElementById('modal-backdrop')?.addEventListener('click', () => modal.classList.add('hidden'));
  document.getElementById('modal-close')?.addEventListener('click', () => modal.classList.add('hidden'));
  document.getElementById('modal-close-btn')?.addEventListener('click', () => modal.classList.add('hidden'));
}

// ── Toast Notification ────────────────────────────────────────
function showToast(message, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = message;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3000);
}
