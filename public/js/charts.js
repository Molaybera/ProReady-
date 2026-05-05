// ============================================================
// charts.js — Canvas-based Readiness Gauge
// ProReady
// ============================================================

function drawReadinessGauge(canvas, score, label) {
  if (!canvas) return;
  const ctx   = canvas.getContext('2d');
  const W     = canvas.width;
  const H     = canvas.height;
  const cx    = W / 2;
  const cy    = H / 2 + 10;
  const R     = Math.min(W, H) * 0.38;
  const START = Math.PI * 0.75;
  const END   = Math.PI * 2.25;
  const RANGE = END - START;

  ctx.clearRect(0, 0, W, H);

  // Track background arc
  ctx.beginPath();
  ctx.arc(cx, cy, R, START, END);
  ctx.strokeStyle = '#e1e7ef';
  ctx.lineWidth   = 14;
  ctx.lineCap     = 'round';
  ctx.stroke();

  // Score color
  const color =
    score >= 76 ? '#2f9e44' :
    score >= 51 ? '#f59f00' : '#e03131';

  // Score arc (filled portion)
  const fillAngle = START + RANGE * (score / 100);
  ctx.beginPath();
  ctx.arc(cx, cy, R, START, fillAngle);
  ctx.strokeStyle = color;
  ctx.lineWidth   = 14;
  ctx.lineCap     = 'round';
  ctx.stroke();

  // Glow effect
  ctx.beginPath();
  ctx.arc(cx, cy, R, START, fillAngle);
  ctx.strokeStyle = color + '55';
  ctx.lineWidth   = 22;
  ctx.lineCap     = 'round';
  ctx.stroke();

  // Score number
  ctx.font         = `bold ${Math.round(R * 0.55)}px Outfit, sans-serif`;
  ctx.fillStyle    = '#1e293b';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(score, cx, cy - 4);

  // Label text
  ctx.font      = `500 ${Math.round(R * 0.21)}px Outfit, sans-serif`;
  ctx.fillStyle = '#64748b';
  ctx.fillText(label || 'Readiness', cx, cy + R * 0.48);

  // Min / Max labels
  ctx.font      = `600 ${Math.round(R * 0.18)}px Outfit, sans-serif`;
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'left';
  ctx.fillText('0', cx - R - 4, cy + R * 0.38);
  ctx.textAlign = 'right';
  ctx.fillText('100', cx + R + 4, cy + R * 0.38);
}

function drawSubScoreBar(container, value, label, color) {
  if (!container) return;
  container.innerHTML = `
    <div class="sub-score-label">
      <span>${label}</span>
      <strong style="color:${color}">${value}</strong>
    </div>
    <div class="sub-score-track">
      <div class="sub-score-fill" style="width:${value}%;background:${color}"></div>
    </div>
  `;
}
