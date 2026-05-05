// ============================================================
// storage.js — LocalStorage Management
// ProReady
// ============================================================

const STORAGE_KEYS = {
  PROFILE: 'amrs_profile',
  PLANS:   'amrs_plans',
  REPORTS: 'amrs_reports',
};

// ── Profile ──────────────────────────────────────────────────
function saveProfile(profile) {
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
}

function getProfile() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.PROFILE)) || null; }
  catch { return null; }
}

// ── Plans ────────────────────────────────────────────────────
function savePlan(plan) {
  const plans = getPlans();
  const idx = plans.findIndex(p => p.id === plan.id);
  if (idx > -1) plans[idx] = plan;
  else plans.push(plan);
  // Keep latest 20
  const trimmed = plans.slice(-20);
  localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(trimmed));
  return plan;
}

function getPlans() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.PLANS)) || []; }
  catch { return []; }
}

function getPlanById(id) {
  return getPlans().find(p => p.id === id) || null;
}

function deletePlan(id) {
  const plans = getPlans().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(plans));
}

function getCurrentPlan() {
  const plans = getPlans();
  return plans.length ? plans[plans.length - 1] : null;
}

// ── Reports ──────────────────────────────────────────────────
function saveReport(planId, report) {
  const reports = getReports();
  const payload = { planId, ...report, savedAt: new Date().toISOString() };
  const idx = reports.findIndex(r => r.planId === planId);
  if (idx > -1) reports[idx] = payload;
  else reports.push(payload);
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));

  // Also attach to plan for quick access
  const plan = getPlanById(planId);
  if (plan) { plan.report = payload; savePlan(plan); }
  return payload;
}

function getReports() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.REPORTS)) || []; }
  catch { return []; }
}

function getReportByPlanId(planId) {
  return getReports().find(r => r.planId === planId) || null;
}

// ── History helpers ───────────────────────────────────────────
function getHistory() {
  // Returns plans with optional report attached, newest first
  return getPlans().slice().reverse();
}

function clearAll() {
  Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
}
