/**
 * MHENT QUIZ ENGINE v2.0
 * Configurable, self-rendering quiz engine for MHEnt. Study
 *
 * Set window.QUIZ_CONFIG before loading this script:
 * {
 *   lang:       'ko' | 'ja' | 'zh' | 'en'
 *   accent:     CSS color, e.g. '#ec4899'
 *   accentRgb:  RGB string for rgba(), e.g. '236,72,153'
 *   types:      string[] of question types, or null/omit for all types
 *   modeTitle:  string — heading shown in start screen
 *   modeIcon:   emoji
 *   backUrl:    string — URL for "Về luyện tập" button
 *   langName:   string — e.g. 'Tiếng Hàn'
 * }
 */
(function () {
'use strict';

/* ── Config ─────────────────────────────────────────────────────── */
const C          = window.QUIZ_CONFIG || {};
const LANG       = C.lang       || 'ko';
const ACCENT     = C.accent     || '#ec4899';
const ACCENT_RGB = C.accentRgb  || '236,72,153';
const LANG_NAME  = C.langName   || '';
const BACK_URL   = C.backUrl    || `/${LANG}/practice/index.html`;
const MODE_TITLE = C.modeTitle  || 'Quiz Tổng Hợp';
const MODE_ICON  = C.modeIcon   || '🎯';

const ALL_TYPES = [
  'mcq_meaning_word', 'mcq_word_meaning',
  'mcq_listening', 'mcq_fill',
  'type_meaning', 'type_listening', 'scramble'
];
const USE_TYPES = (C.types && C.types.length) ? C.types : ALL_TYPES;

const TYPE_LABELS = {
  mcq_meaning_word: '🎯 Nghĩa→Từ',
  mcq_word_meaning: '🎯 Từ→Nghĩa',
  mcq_listening:    '🔊 Nghe→Chọn',
  mcq_fill:         '📝 Điền từ',
  type_meaning:     '✍️ Nghĩa→Gõ',
  type_listening:   '🔊 Nghe→Gõ',
  scramble:         '🔀 Scramble',
};

/* ── State ──────────────────────────────────────────────────────── */
let allWords = [], questions = [], sessionLog = [];
let currentIdx = 0, score = 0, combo = 0, maxCombo = 0;
let correctCount = 0, wrongCount = 0, answered = false;
let timerRemaining = 15, timerMaxSec = 15, timerInterval = null, timerEnabled = true;
let perks = { skip: 3, hint: 3, listen: 5 };
let scrambleAnswer = [], scrambleTileMap = [];
let activeFilter = 'all';

/* ── CSS Injection ───────────────────────────────────────────────── */
function injectCSS() {
  if (document.getElementById('qe-css')) return;
  document.documentElement.style.setProperty('--qa', ACCENT);
  document.documentElement.style.setProperty('--qa-rgb', ACCENT_RGB);
  const el = document.createElement('style');
  el.id = 'qe-css';
  el.textContent = `
    :root { --qa:${ACCENT}; --qa-rgb:${ACCENT_RGB}; --qc:#10b981; --qw:#ef4444; --qwarn:#f59e0b; }

    /* HUD */
    .qe-hud { position:sticky; top:0; z-index:999; background:var(--study-surface); border-bottom:1px solid var(--study-border); padding:10px 20px; display:flex; align-items:center; gap:14px; backdrop-filter:blur(12px); }
    .qe-hud-prog { flex:1; height:6px; background:var(--study-border); border-radius:9999px; overflow:hidden; }
    .qe-hud-prog-fill { height:100%; background:linear-gradient(90deg,var(--qa),#a855f7); border-radius:9999px; transition:width 0.5s cubic-bezier(0.16,1,0.3,1); }
    .qe-hud-stat { display:flex; align-items:center; gap:5px; font-size:13px; font-weight:800; color:var(--study-text-muted); white-space:nowrap; }
    .qe-hud-stat .v { color:var(--study-text); font-size:14px; }
    .qe-combo { display:flex; align-items:center; gap:4px; padding:4px 12px; background:linear-gradient(135deg,rgba(var(--qa-rgb),0.15),rgba(168,85,247,0.15)); border:1px solid rgba(var(--qa-rgb),0.3); border-radius:9999px; font-size:13px; font-weight:900; color:var(--qa); transition:all 0.3s; }
    .qe-combo.hot { background:linear-gradient(135deg,rgba(245,158,11,0.2),rgba(239,68,68,0.15)); border-color:rgba(245,158,11,0.4); color:#f59e0b; animation:qePulse 0.5s ease; }
    @keyframes qePulse { 0%{transform:scale(1)} 50%{transform:scale(1.18)} 100%{transform:scale(1)} }

    /* Timer */
    .qe-timer { position:relative; width:44px; height:44px; flex-shrink:0; }
    .qe-timer svg { transform:rotate(-90deg); width:44px; height:44px; }
    .qe-timer-track { fill:none; stroke:var(--study-border); stroke-width:4; }
    .qe-timer-arc { fill:none; stroke:var(--qa); stroke-width:4; stroke-linecap:round; stroke-dasharray:113; stroke-dashoffset:0; transition:stroke-dashoffset 1s linear,stroke 0.3s; }
    .qe-timer-arc.warn { stroke:var(--qwarn); }
    .qe-timer-arc.danger { stroke:var(--qw); }
    .qe-timer-num { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:900; color:var(--study-text); }

    /* Main */
    .qe-main { max-width:760px; margin:0 auto; padding:24px 20px 140px; }

    /* Start Screen */
    .qe-start-hero { background:linear-gradient(135deg,rgba(var(--qa-rgb),0.12),rgba(168,85,247,0.1)); border:1px solid rgba(var(--qa-rgb),0.3); border-radius:var(--radius-card); padding:28px; margin-bottom:24px; text-align:center; }
    .qe-start-hero h1 { font-size:26px; font-weight:900; margin:6px 0 10px; }
    .qe-start-hero p { font-size:14.5px; color:var(--study-text-muted); max-width:520px; margin:0 auto; }
    .qe-setting-box { background:var(--study-surface); border:1px solid var(--study-border); border-radius:var(--radius-card); padding:20px; margin-bottom:16px; box-shadow:var(--study-shadow); }
    .qe-setting-lbl { font-size:13px; font-weight:800; color:var(--study-text-muted); display:block; margin-bottom:8px; }
    .qe-select { width:100%; padding:10px 12px; border-radius:12px; border:2px solid var(--study-border); background:var(--study-subtle); color:var(--study-text); font-size:14px; font-weight:700; font-family:'Nunito',sans-serif; outline:none; cursor:pointer; }
    .qe-settings-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px; }
    .qe-mode-chips { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:8px; }
    .qe-mode-chip { padding:10px 12px; border-radius:10px; background:var(--study-subtle); font-size:13px; font-weight:700; }
    .qe-btn-start { width:100%; padding:18px; border-radius:16px; border:none; background:linear-gradient(135deg,var(--qa),#a855f7); color:#fff; font-size:17px; font-weight:900; font-family:'Nunito',sans-serif; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; transition:0.2s; }
    .qe-btn-start:hover { opacity:0.9; transform:translateY(-1px); }

    /* Perks */
    .qe-perks { display:flex; gap:8px; justify-content:center; margin-bottom:16px; }
    .qe-perk { display:flex; flex-direction:column; align-items:center; gap:3px; padding:8px 14px; border-radius:12px; border:1.5px solid var(--study-border); background:var(--study-surface); color:var(--study-text); font-size:12px; font-weight:800; font-family:'Nunito',sans-serif; cursor:pointer; transition:0.2s; }
    .qe-perk:hover:not(:disabled) { border-color:var(--qa); background:rgba(var(--qa-rgb),0.06); }
    .qe-perk:disabled { opacity:0.35; cursor:not-allowed; }
    .qe-perk-icon { font-size:18px; }
    .qe-perk-cnt { font-size:10px; background:var(--study-subtle); border-radius:9999px; padding:0 6px; color:var(--study-text-muted); }

    /* Question Card */
    .qe-card { background:var(--study-surface); border:1px solid var(--study-border); border-radius:var(--radius-card); padding:28px; box-shadow:var(--study-shadow); margin-bottom:20px; position:relative; overflow:hidden; animation:qeSlideIn 0.35s cubic-bezier(0.16,1,0.3,1); }
    @keyframes qeSlideIn { from{opacity:0;transform:translateY(18px) scale(0.98)} to{opacity:1;transform:none} }
    .qe-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg,var(--qa),#a855f7); }
    .qe-type-badge { display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:800; letter-spacing:0.07em; text-transform:uppercase; color:var(--qa); background:rgba(var(--qa-rgb),0.1); padding:3px 10px; border-radius:9999px; margin-bottom:14px; }
    .qe-word-display { font-size:3rem; font-weight:900; text-align:center; color:var(--study-text); margin:16px 0 8px; line-height:1.2; min-height:64px; display:flex; align-items:center; justify-content:center; gap:12px; word-break:break-all; }
    .qe-phonetic { font-size:1rem; color:var(--qa); font-weight:700; text-align:center; margin-bottom:8px; }
    .qe-context { font-size:14px; color:var(--study-text-muted); text-align:center; margin-bottom:20px; line-height:1.6; }
    .qe-context strong { color:var(--qa); font-weight:900; }

    /* Listen button */
    .qe-listen-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 18px; border-radius:9999px; background:rgba(var(--qa-rgb),0.1); border:1px solid rgba(var(--qa-rgb),0.25); color:var(--qa); font-weight:800; font-size:13px; cursor:pointer; transition:0.2s; }
    .qe-listen-btn:hover { background:rgba(var(--qa-rgb),0.18); transform:scale(1.03); }
    @keyframes qeListenPulse { 0%,100%{box-shadow:0 0 0 0 rgba(var(--qa-rgb),0)} 50%{box-shadow:0 0 0 10px rgba(var(--qa-rgb),0.2)} }
    .qe-listen-btn.pulsing { animation:qeListenPulse 0.6s ease; }

    /* ABCD Options */
    .qe-options { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .qe-opt { padding:14px 16px; border-radius:14px; border:2px solid var(--study-border); background:var(--study-surface); color:var(--study-text); font-size:15px; font-weight:700; font-family:'Nunito',sans-serif; cursor:pointer; transition:all 0.18s; display:flex; align-items:center; gap:10px; text-align:left; line-height:1.4; }
    .qe-opt:hover:not(:disabled) { border-color:var(--qa); background:rgba(var(--qa-rgb),0.06); transform:translateY(-2px); box-shadow:var(--study-shadow-hover); }
    .qe-opt-key { width:26px; height:26px; border-radius:7px; background:var(--study-subtle); display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:900; flex-shrink:0; color:var(--study-text-muted); transition:0.18s; }
    .qe-opt:hover:not(:disabled) .qe-opt-key { background:rgba(var(--qa-rgb),0.15); color:var(--qa); }
    .qe-opt.correct { border-color:var(--qc); background:rgba(16,185,129,0.12); color:var(--qc); animation:qeCorrect 0.4s ease; }
    .qe-opt.correct .qe-opt-key { background:rgba(16,185,129,0.2); color:var(--qc); }
    .qe-opt.wrong { border-color:var(--qw); background:rgba(239,68,68,0.1); color:var(--qw); animation:qeShake 0.4s ease; }
    .qe-opt.wrong .qe-opt-key { background:rgba(239,68,68,0.15); color:var(--qw); }
    @keyframes qeCorrect { 0%{transform:scale(1)} 40%{transform:scale(1.04)} 100%{transform:scale(1)} }
    @keyframes qeShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
    @media(max-width:540px){ .qe-options{grid-template-columns:1fr} .qe-word-display{font-size:2.2rem} }

    /* Typing */
    .qe-type-input { width:100%; padding:16px 18px; border-radius:14px; border:2px solid var(--study-border); background:var(--study-surface); color:var(--study-text); font-size:1.25rem; font-family:'Nunito',sans-serif; font-weight:800; outline:none; margin-bottom:12px; box-sizing:border-box; transition:border-color 0.2s,box-shadow 0.2s; }
    .qe-type-input:focus { border-color:var(--qa); box-shadow:0 0 0 3px rgba(var(--qa-rgb),0.15); }
    .qe-type-input.correct { border-color:var(--qc); background:rgba(16,185,129,0.06); color:var(--qc); }
    .qe-type-input.wrong { border-color:var(--qw); background:rgba(239,68,68,0.06); animation:qeShake 0.35s ease; }
    .qe-type-submit { width:100%; padding:14px; border-radius:14px; border:none; background:linear-gradient(135deg,var(--qa),#a855f7); color:#fff; font-size:15px; font-weight:900; font-family:'Nunito',sans-serif; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:0.2s; }
    .qe-type-submit:hover { opacity:0.9; transform:translateY(-1px); }
    .qe-type-hint { font-size:12px; color:var(--study-text-muted); text-align:center; margin-top:8px; }

    /* Scramble */
    .qe-scr-answer { min-height:58px; background:var(--study-subtle); border:2px dashed var(--study-border); border-radius:14px; padding:12px; display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:12px; transition:border-color 0.2s; }
    .qe-scr-answer.correct { border-color:var(--qc); background:rgba(16,185,129,0.07); }
    .qe-scr-answer.wrong { border-color:var(--qw); animation:qeShake 0.35s ease; }
    .qe-scr-tiles { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
    .qe-tile { padding:10px 16px; background:var(--study-surface); border:2px solid var(--study-border); border-radius:10px; font-size:1.1rem; font-weight:800; cursor:pointer; transition:all 0.18s; user-select:none; }
    .qe-tile:hover { border-color:var(--qa); background:rgba(var(--qa-rgb),0.06); transform:translateY(-2px); }
    .qe-tile.used { opacity:0.25; pointer-events:none; }
    .qe-tile.ans { background:rgba(var(--qa-rgb),0.08); border-color:rgba(var(--qa-rgb),0.4); color:var(--qa); }
    .qe-tile.ans:hover { background:rgba(239,68,68,0.1); border-color:var(--qw); }
    .qe-scr-btns { display:flex; gap:8px; }
    .qe-scr-clear { flex:1; padding:11px; border-radius:12px; border:1.5px solid var(--study-border); background:var(--study-surface); color:var(--study-text); font-weight:800; font-size:13px; font-family:'Nunito',sans-serif; cursor:pointer; }
    .qe-scr-submit { flex:2; padding:11px; border-radius:12px; border:none; background:linear-gradient(135deg,var(--qa),#a855f7); color:#fff; font-weight:900; font-size:13px; font-family:'Nunito',sans-serif; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; }

    /* Keyboard hint */
    .qe-kbd-hint { font-size:11.5px; color:var(--study-text-muted); text-align:center; display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin-top:16px; }
    .qe-kbd { display:inline-block; padding:2px 7px; border-radius:5px; border:1px solid var(--study-border); background:var(--study-subtle); font-size:10.5px; font-family:monospace; font-weight:700; color:var(--study-text-muted); }

    /* Feedback bar */
    .qe-feedback { position:fixed; bottom:0; left:0; right:0; padding:18px 24px; display:flex; align-items:center; gap:16px; z-index:500; transform:translateY(100%); transition:transform 0.3s cubic-bezier(0.16,1,0.3,1); }
    .qe-feedback.show { transform:translateY(0); }
    .qe-feedback.ok { background:linear-gradient(135deg,rgba(16,185,129,0.97),rgba(6,148,104,0.97)); }
    .qe-feedback.ng { background:linear-gradient(135deg,rgba(239,68,68,0.97),rgba(220,38,38,0.97)); }
    .qe-fb-icon { font-size:28px; }
    .qe-fb-body { flex:1; }
    .qe-fb-lbl { font-size:13px; font-weight:800; color:rgba(255,255,255,0.8); text-transform:uppercase; letter-spacing:0.07em; }
    .qe-fb-ans { font-size:18px; font-weight:900; color:#fff; }
    .qe-fb-next { padding:12px 28px; border-radius:9999px; background:rgba(255,255,255,0.25); border:2px solid rgba(255,255,255,0.5); color:#fff; font-weight:900; font-size:14px; font-family:'Nunito',sans-serif; cursor:pointer; display:flex; align-items:center; gap:6px; white-space:nowrap; transition:0.2s; }
    .qe-fb-next:hover { background:rgba(255,255,255,0.4); }

    /* Bonus pop */
    .qe-bonus { position:fixed; top:80px; left:50%; transform:translateX(-50%) translateY(-20px); opacity:0; background:linear-gradient(135deg,#f59e0b,#ef4444); color:#fff; padding:8px 20px; border-radius:9999px; font-weight:900; font-size:14px; z-index:600; transition:all 0.4s cubic-bezier(0.16,1,0.3,1); pointer-events:none; }
    .qe-bonus.show { opacity:1; transform:translateX(-50%) translateY(0); }

    /* Result Screen */
    .qe-result { padding:32px 20px 140px; max-width:800px; margin:0 auto; }
    .qe-result-hero { text-align:center; margin-bottom:24px; }
    .qe-result-emoji { font-size:52px; margin-bottom:10px; }
    .qe-result-title { font-size:24px; font-weight:900; margin:0 0 6px; }
    .qe-result-desc { color:var(--study-text-muted); font-size:15px; }
    .qe-result-top { display:flex; align-items:center; gap:28px; justify-content:center; flex-wrap:wrap; margin-bottom:28px; }
    .qe-ring-wrap { position:relative; width:140px; height:140px; flex-shrink:0; }
    .qe-ring-wrap svg { transform:rotate(-90deg); }
    .qe-ring-text { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
    .qe-ring-pct { font-size:32px; font-weight:900; color:var(--study-text); }
    .qe-ring-lbl { font-size:11px; font-weight:700; color:var(--study-text-muted); }
    .qe-stat-boxes { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
    .qe-stat-box { background:var(--study-subtle); border-radius:14px; padding:14px 18px; text-align:center; min-width:80px; }
    .qe-stat-val { font-size:26px; font-weight:900; }
    .qe-stat-lbl { font-size:11px; font-weight:700; color:var(--study-text-muted); margin-top:2px; }

    /* Results Table */
    .qe-table-section { background:var(--study-surface); border:1px solid var(--study-border); border-radius:var(--radius-card); overflow:hidden; box-shadow:var(--study-shadow); margin-bottom:20px; }
    .qe-table-hdr { display:flex; align-items:center; justify-content:space-between; padding:16px 20px 12px; flex-wrap:wrap; gap:10px; border-bottom:1px solid var(--study-border); }
    .qe-table-title { font-size:15px; font-weight:900; margin:0; }
    .qe-filter-tabs { display:flex; gap:6px; flex-wrap:wrap; }
    .qe-filter-tab { padding:5px 14px; border-radius:9999px; font-size:12px; font-weight:800; font-family:'Nunito',sans-serif; cursor:pointer; border:1.5px solid var(--study-border); background:var(--study-surface); color:var(--study-text-muted); transition:0.2s; }
    .qe-filter-tab.active { background:var(--qa); border-color:var(--qa); color:#fff; }
    .qe-table-wrap { overflow-x:auto; max-height:380px; overflow-y:auto; }
    .qe-table { width:100%; border-collapse:collapse; font-size:13.5px; }
    .qe-table th { position:sticky; top:0; background:var(--study-subtle); padding:10px 14px; text-align:left; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.06em; color:var(--study-text-muted); white-space:nowrap; border-bottom:1px solid var(--study-border); }
    .qe-table td { padding:11px 14px; border-bottom:1px solid var(--study-border); vertical-align:middle; }
    .qe-table tr:last-child td { border-bottom:none; }
    .qe-table tr.row-correct { background:rgba(16,185,129,0.04); }
    .qe-table tr.row-wrong { background:rgba(239,68,68,0.04); }
    .qe-table tr.hidden { display:none; }
    .qe-word-cell { font-size:15px; font-weight:900; color:var(--study-text); display:flex; align-items:center; gap:8px; }
    .qe-mini-listen { background:none; border:none; cursor:pointer; font-size:14px; opacity:0.6; transition:0.15s; }
    .qe-mini-listen:hover { opacity:1; transform:scale(1.15); }
    .qe-badge { display:inline-block; padding:2px 9px; border-radius:9999px; font-size:11px; font-weight:800; }
    .qe-badge.ok { background:rgba(16,185,129,0.15); color:#10b981; }
    .qe-badge.ng { background:rgba(239,68,68,0.12); color:#ef4444; }
    .qe-badge.tm { background:rgba(245,158,11,0.15); color:#f59e0b; }
    .qe-badge.sk { background:rgba(100,116,139,0.12); color:#64748b; }

    /* Result Actions */
    .qe-result-actions { display:flex; gap:10px; flex-wrap:wrap; justify-content:center; margin-bottom:24px; }
    .qe-btn-retry { padding:13px 22px; border-radius:9999px; border:none; background:linear-gradient(135deg,#f59e0b,#ef4444); color:#fff; font-weight:900; font-size:14px; font-family:'Nunito',sans-serif; cursor:pointer; display:inline-flex; align-items:center; gap:7px; transition:0.2s; }
    .qe-btn-redo { padding:13px 22px; border-radius:9999px; border:none; background:linear-gradient(135deg,var(--qa),#a855f7); color:#fff; font-weight:900; font-size:14px; font-family:'Nunito',sans-serif; cursor:pointer; display:inline-flex; align-items:center; gap:7px; transition:0.2s; }
    .qe-btn-back { padding:13px 22px; border-radius:9999px; background:var(--study-surface); color:var(--study-text); border:2px solid var(--study-border); font-weight:900; font-size:14px; font-family:'Nunito',sans-serif; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; gap:7px; transition:0.2s; }
    .qe-btn-retry:hover,.qe-btn-redo:hover,.qe-btn-back:hover { transform:translateY(-2px); box-shadow:var(--study-shadow-hover); }

    /* Responsive */
    @media(max-width:600px) {
      .qe-result-top { flex-direction:column; }
      .qe-stat-boxes { grid-template-columns:repeat(2,1fr); }
      .qe-settings-grid { grid-template-columns:1fr; }
    }
  `;
  document.head.appendChild(el);
}

/* ── HTML Rendering ──────────────────────────────────────────────── */
function renderApp() {
  const root = document.getElementById('quiz-app');
  if (!root) return;

  // Detect which types are active for display
  const modeChips = USE_TYPES.map(t => `<div class="qe-mode-chip">${TYPE_LABELS[t] || t}</div>`).join('');

  root.innerHTML = `
  <!-- HUD -->
  <div class="qe-hud" id="qeHud" style="display:none;">
    <div class="qe-hud-stat"><i class="fa-solid fa-circle-question" style="color:var(--qa)"></i><span class="v" id="qeHudQ">1/20</span></div>
    <div class="qe-hud-prog"><div class="qe-hud-prog-fill" id="qeHudFill" style="width:5%"></div></div>
    <div class="qe-combo" id="qeCombo">🔥 Combo <span id="qeComboN">0</span></div>
    <div class="qe-hud-stat"><i class="fa-solid fa-star" style="color:#f59e0b"></i><span class="v" id="qeHudScore">0</span></div>
    <div class="qe-timer" id="qeTimer">
      <svg viewBox="0 0 44 44">
        <circle class="qe-timer-track" cx="22" cy="22" r="18"/>
        <circle class="qe-timer-arc" id="qeTimerArc" cx="22" cy="22" r="18"/>
      </svg>
      <div class="qe-timer-num" id="qeTimerNum">15</div>
    </div>
  </div>

  <!-- Main -->
  <div class="qe-main" id="qeMain">

    <!-- Start Screen -->
    <div id="qeStart">
      <div class="qe-start-hero">
        <span style="font-size:13px;font-weight:800;color:var(--qa);text-transform:uppercase;">QUIZ ARENA</span>
        <h1>${MODE_ICON} ${MODE_TITLE}${LANG_NAME ? ' — ' + LANG_NAME : ''}</h1>
        <p>Trả lời đúng liên tiếp để tăng <strong>combo 🔥</strong>, trả lời nhanh để nhận <strong>⚡ x2 bonus</strong>!</p>
      </div>
      <div class="qe-setting-box">
        <label class="qe-setting-lbl">📚 CHỌN BỘ TỪ VỰNG</label>
        <select id="qeDeckSel" class="qe-select"></select>
      </div>
      <div class="qe-settings-grid">
        <div class="qe-setting-box" style="margin-bottom:0">
          <label class="qe-setting-lbl">🎲 SỐ CÂU HỎI</label>
          <select id="qeCountSel" class="qe-select">
            <option value="10">10 câu — Nhanh</option>
            <option value="20" selected>20 câu — Tiêu chuẩn</option>
            <option value="30">30 câu — Toàn diện</option>
            <option value="all">Tất cả từ trong bộ</option>
          </select>
        </div>
        <div class="qe-setting-box" style="margin-bottom:0">
          <label class="qe-setting-lbl">⏱️ THỜI GIAN MỖI CÂU</label>
          <select id="qeTimerSel" class="qe-select">
            <option value="0">Không giới hạn</option>
            <option value="15" selected>15 giây</option>
            <option value="20">20 giây</option>
            <option value="30">30 giây</option>
          </select>
        </div>
      </div>
      <div class="qe-setting-box">
        <label class="qe-setting-lbl" style="margin-bottom:10px;">📋 CÁC DẠNG CÂU HỎI TRONG BÀI</label>
        <div class="qe-mode-chips">${modeChips}</div>
      </div>
      <button class="qe-btn-start" onclick="QE.startQuiz()"><i class="fa-solid fa-play"></i> Bắt Đầu Quiz!</button>
    </div>

    <!-- Question Area -->
    <div id="qeQuestion" style="display:none;">
      <div class="qe-perks">
        <button class="qe-perk" id="qePerkSkip" onclick="QE.usePerk('skip')" title="Bỏ qua (S)"><span class="qe-perk-icon">⏭️</span><span>Bỏ qua</span><span class="qe-perk-cnt" id="qePerkSkipN">×3</span></button>
        <button class="qe-perk" id="qePerkHint" onclick="QE.usePerk('hint')" title="Gợi ý (H)"><span class="qe-perk-icon">💡</span><span>Gợi ý</span><span class="qe-perk-cnt" id="qePerkHintN">×3</span></button>
        <button class="qe-perk" id="qePerkListen" onclick="QE.usePerk('listen')" title="Nghe (L)"><span class="qe-perk-icon">🔊</span><span>Nghe</span><span class="qe-perk-cnt" id="qePerkListenN">×5</span></button>
      </div>
      <div class="qe-card" id="qeCard">
        <div class="qe-type-badge" id="qeBadge">🎯 Trắc Nghiệm</div>
        <div class="qe-word-display" id="qeDisplay"></div>
        <div class="qe-phonetic" id="qePhonetic"></div>
        <div class="qe-context" id="qeContext"></div>
        <!-- ABCD -->
        <div class="qe-options" id="qeOptions">
          <button class="qe-opt" id="qeOpt0" onclick="QE.selectOpt(0)"><span class="qe-opt-key">1</span><span id="qeOpt0T"></span></button>
          <button class="qe-opt" id="qeOpt1" onclick="QE.selectOpt(1)"><span class="qe-opt-key">2</span><span id="qeOpt1T"></span></button>
          <button class="qe-opt" id="qeOpt2" onclick="QE.selectOpt(2)"><span class="qe-opt-key">3</span><span id="qeOpt2T"></span></button>
          <button class="qe-opt" id="qeOpt3" onclick="QE.selectOpt(3)"><span class="qe-opt-key">4</span><span id="qeOpt3T"></span></button>
        </div>
        <!-- Typing -->
        <div id="qeTyping" style="display:none;">
          <input type="text" id="qeTypeInput" class="qe-type-input" placeholder="Gõ từ vào đây..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" onkeydown="QE.typeKeydown(event)">
          <button class="qe-type-submit" onclick="QE.submitTyping()"><i class="fa-solid fa-paper-plane"></i> Xác nhận <kbd class="qe-kbd" style="color:rgba(255,255,255,0.8);background:rgba(255,255,255,0.15);border-color:rgba(255,255,255,0.3);">Enter</kbd></button>
          <div class="qe-type-hint" id="qeTypeHint"></div>
        </div>
        <!-- Scramble -->
        <div id="qeScramble" style="display:none;">
          <p style="font-size:13px;color:var(--study-text-muted);margin-bottom:8px;font-weight:700;">Bấm vào các ô chữ để ghép thành từ đúng:</p>
          <div class="qe-scr-answer" id="qeScrAnswer"></div>
          <div class="qe-scr-tiles" id="qeScrTiles"></div>
          <div class="qe-scr-btns">
            <button class="qe-scr-clear" onclick="QE.clearScramble()">↩️ Xóa lại</button>
            <button class="qe-scr-submit" onclick="QE.submitScramble()"><i class="fa-solid fa-check"></i> Xác nhận <kbd class="qe-kbd" style="color:rgba(255,255,255,0.8);background:rgba(255,255,255,0.15);border-color:rgba(255,255,255,0.3);font-size:10px;">Enter</kbd></button>
          </div>
        </div>
        <!-- Keyboard hint -->
        <div class="qe-kbd-hint" id="qeKbdHint">
          <span><kbd class="qe-kbd">1</kbd><kbd class="qe-kbd">2</kbd><kbd class="qe-kbd">3</kbd><kbd class="qe-kbd">4</kbd> chọn đáp án</span>
          <span><kbd class="qe-kbd">Space</kbd> tiếp tục</span>
          <span><kbd class="qe-kbd">L</kbd> nghe • <kbd class="qe-kbd">H</kbd> gợi ý</span>
        </div>
      </div>
    </div>

    <!-- Result Screen -->
    <div class="qe-result" id="qeResult" style="display:none;">
      <div class="qe-result-hero">
        <div class="qe-result-emoji" id="qeResEmoji">🎉</div>
        <h2 class="qe-result-title" id="qeResTitle">Hoàn thành!</h2>
        <p class="qe-result-desc" id="qeResDesc"></p>
      </div>
      <div class="qe-result-top">
        <div class="qe-ring-wrap">
          <svg viewBox="0 0 140 140" width="140" height="140">
            <circle cx="70" cy="70" r="60" fill="none" stroke="var(--study-border)" stroke-width="10"/>
            <circle id="qeRingFill" cx="70" cy="70" r="60" fill="none" stroke="${ACCENT}" stroke-width="10"
                stroke-linecap="round" stroke-dasharray="377" stroke-dashoffset="377"
                style="transition:stroke-dashoffset 1s ease,stroke 0.5s;"/>
          </svg>
          <div class="qe-ring-text"><div class="qe-ring-pct" id="qeResPct">0%</div><div class="qe-ring-lbl">ĐỘ CHÍNH XÁC</div></div>
        </div>
        <div class="qe-stat-boxes">
          <div class="qe-stat-box"><div class="qe-stat-val" id="qeResC" style="color:#10b981">0</div><div class="qe-stat-lbl">✅ Đúng</div></div>
          <div class="qe-stat-box"><div class="qe-stat-val" id="qeResW" style="color:#ef4444">0</div><div class="qe-stat-lbl">❌ Sai</div></div>
          <div class="qe-stat-box"><div class="qe-stat-val" id="qeResS" style="color:#f59e0b">0</div><div class="qe-stat-lbl">⭐ Điểm</div></div>
          <div class="qe-stat-box"><div class="qe-stat-val" id="qeResCB">0</div><div class="qe-stat-lbl">🔥 Combo Max</div></div>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="qe-result-actions">
        <button class="qe-btn-retry" id="qeRetryWrongBtn" onclick="QE.retryWrong()">🔁 Ôn lại từ sai <span id="qeWrongN"></span></button>
        <button class="qe-btn-redo" onclick="QE.startQuiz()">↺ Làm lại</button>
        <a class="qe-btn-back" href="${BACK_URL}">← Về luyện tập</a>
      </div>

      <!-- Detail table -->
      <div class="qe-table-section">
        <div class="qe-table-hdr">
          <h3 class="qe-table-title">📊 Chi Tiết Từng Từ</h3>
          <div class="qe-filter-tabs">
            <button class="qe-filter-tab active" id="qeFAll" onclick="QE.filterResult('all')">Tất cả</button>
            <button class="qe-filter-tab" id="qeFC" onclick="QE.filterResult('correct')">✅ Đã thuộc</button>
            <button class="qe-filter-tab" id="qeFW" onclick="QE.filterResult('wrong')">❌ Chưa thuộc</button>
          </div>
        </div>
        <div class="qe-table-wrap">
          <table class="qe-table">
            <thead><tr><th>#</th><th>Từ</th><th>Nghĩa</th><th>Dạng câu</th><th>Kết quả</th><th>Điểm</th></tr></thead>
            <tbody id="qeTableBody"></tbody>
          </table>
        </div>
      </div>
    </div>

  </div><!-- /qe-main -->

  <!-- Feedback bar -->
  <div class="qe-feedback" id="qeFeedback">
    <div class="qe-fb-icon" id="qeFbIcon">✅</div>
    <div class="qe-fb-body">
      <div class="qe-fb-lbl" id="qeFbLbl">Chính xác!</div>
      <div class="qe-fb-ans" id="qeFbAns"></div>
    </div>
    <button class="qe-fb-next" onclick="QE.next()">Tiếp <i class="fa-solid fa-arrow-right"></i> <kbd class="qe-kbd" style="color:rgba(255,255,255,0.8);background:rgba(255,255,255,0.15);border-color:rgba(255,255,255,0.3);">Space</kbd></button>
  </div>

  <!-- Bonus pop -->
  <div class="qe-bonus" id="qeBonus">⚡ x2 BONUS!</div>
  `;
}

/* ── Deck Loading ────────────────────────────────────────────────── */
function loadDecks() {
  const decks = window.studyStorage?.getDecks(LANG) || [];
  const sel = document.getElementById('qeDeckSel');
  if (!sel) return;
  sel.innerHTML = '';
  if (!decks.length) {
    sel.innerHTML = '<option value="">— Chưa có bộ từ vựng —</option>';
    return;
  }
  decks.forEach(d => {
    const o = document.createElement('option');
    o.value = d.id;
    o.textContent = `${d.title} (${d.words.length} từ)`;
    sel.appendChild(o);
  });
}

/* ── Start Quiz ──────────────────────────────────────────────────── */
function startQuiz(wordsOverride) {
  let src = wordsOverride;
  if (!src) {
    const deckId = document.getElementById('qeDeckSel')?.value;
    const deck = (deckId && window.studyStorage?.getDeckById(LANG, deckId))
               || window.studyStorage?.getDecks(LANG)?.[0];
    if (!deck?.words?.length) {
      window.studyUI?.showToast('Bộ từ vựng trống!', 'error'); return;
    }
    src = deck.words.filter(w => w.word && w.meaning);
  }
  if (src.length < 2) {
    window.studyUI?.showToast('Cần ít nhất 2 từ để tạo quiz!', 'error'); return;
  }
  allWords = src;
  const countSel = document.getElementById('qeCountSel')?.value || '20';
  const total = countSel === 'all' ? allWords.length : Math.min(parseInt(countSel), allWords.length);
  timerMaxSec = parseInt(document.getElementById('qeTimerSel')?.value || '0');
  timerEnabled = timerMaxSec > 0;

  questions = buildQuestions(allWords, total);
  sessionLog = [];
  currentIdx = 0; score = 0; combo = 0; maxCombo = 0;
  correctCount = 0; wrongCount = 0; answered = false;
  perks = { skip: 3, hint: 3, listen: 5 };
  updatePerksUI();

  $('qeStart').style.display = 'none';
  $('qeResult').style.display = 'none';
  $('qeQuestion').style.display = 'block';
  $('qeHud').style.display = 'flex';
  $('qeFeedback').className = 'qe-feedback';
  updateHUD();
  loadQuestion();
}

/* ── Build Questions ─────────────────────────────────────────────── */
function buildQuestions(words, total) {
  const shuffled = shuffle([...words]).slice(0, total);
  return shuffled.map(word => {
    // Weighted random from USE_TYPES
    const pool = USE_TYPES.slice();
    // Filter out invalid types for this word
    const valid = pool.filter(t => {
      if (t === 'scramble' && word.word.length < 2) return false;
      if (t === 'mcq_fill' && !word.example) return false;
      return true;
    });
    if (!valid.length) valid.push('mcq_meaning_word');
    const type = valid[Math.floor(Math.random() * valid.length)];
    const distractors = shuffle(words.filter(w => w.id !== word.id)).slice(0, 3);
    return { word, type, distractors };
  });
}

/* ── Load Question ───────────────────────────────────────────────── */
function loadQuestion() {
  if (currentIdx >= questions.length) { showResult(); return; }
  answered = false;
  hideFeedback();
  const q = questions[currentIdx];
  renderQuestion(q);
  updateHUD();
  startTimer();
  if (q.type === 'mcq_listening' || q.type === 'type_listening') {
    setTimeout(() => speak(q.word.word), 450);
  }
}

/* ── Render Question ─────────────────────────────────────────────── */
function renderQuestion(q) {
  const { word, type, distractors } = q;
  // Reset panels
  $('qeOptions').style.display = 'grid';
  $('qeTyping').style.display = 'none';
  $('qeScramble').style.display = 'none';
  $('qePhonetic').textContent = '';
  $('qeContext').textContent = '';
  // Re-animate card
  const card = $('qeCard');
  card.style.animation = 'none'; void card.offsetHeight; card.style.animation = '';

  const badge = $('qeBadge');
  const display = $('qeDisplay');

  switch (type) {
    case 'mcq_meaning_word':
      badge.textContent = '🎯 Nghĩa → Từ (ABCD)';
      display.style.fontSize = '1.7rem'; display.textContent = word.meaning;
      renderOpts(shuffle([word.word, ...distractors.map(d => d.word)]), word.word);
      $('qeKbdHint').style.display = 'flex'; break;

    case 'mcq_word_meaning':
      badge.textContent = '🎯 Từ → Nghĩa (ABCD)';
      display.style.fontSize = '2.8rem';
      display.innerHTML = `${esc(word.word)} <button class="qe-listen-btn" onclick="QE.speakPulse(this,'${ea(word.word)}')" title="Nghe">🔊</button>`;
      $('qePhonetic').textContent = word.phonetic || '';
      renderOpts(shuffle([word.meaning, ...distractors.map(d => d.meaning)]), word.meaning);
      $('qeKbdHint').style.display = 'flex'; break;

    case 'mcq_listening':
      badge.textContent = '🔊 Nghe → Chọn Từ (ABCD)';
      display.style.fontSize = '1rem';
      display.innerHTML = `<button class="qe-listen-btn" id="qeBigListen" onclick="QE.speakPulse(this,'${ea(word.word)}')" style="font-size:1rem;padding:14px 28px;">🔊 Nhấn để nghe lại</button>`;
      renderOpts(shuffle([word.word, ...distractors.map(d => d.word)]), word.word);
      $('qeKbdHint').style.display = 'flex'; break;

    case 'mcq_fill': {
      badge.textContent = '📝 Điền Từ Vào Câu (ABCD)';
      const blank = (word.example || '').replace(word.word, '___________');
      display.style.fontSize = '1rem'; display.textContent = '';
      $('qeContext').innerHTML = `<strong>${esc(blank)}</strong><br><span style="font-size:12px;opacity:0.7;">${esc(word.exampleTrans || '')}</span>`;
      renderOpts(shuffle([word.word, ...distractors.map(d => d.word)]), word.word);
      $('qeKbdHint').style.display = 'flex'; break;
    }

    case 'type_meaning':
      badge.textContent = '✍️ Nghĩa → Gõ Từ';
      display.style.fontSize = '1.8rem'; display.textContent = word.meaning;
      showTyping(); $('qeKbdHint').style.display = 'none'; break;

    case 'type_listening':
      badge.textContent = '🔊 Nghe → Gõ Từ';
      display.style.fontSize = '1rem';
      display.innerHTML = `<button class="qe-listen-btn" onclick="QE.speakPulse(this,'${ea(word.word)}')" style="font-size:1rem;padding:14px 28px;">🔊 Nhấn để nghe lại</button>`;
      showTyping(); $('qeKbdHint').style.display = 'none'; break;

    case 'scramble':
      badge.textContent = '🔀 Sắp Xếp Chữ Cái';
      display.style.fontSize = '1.7rem'; display.textContent = word.meaning;
      $('qeOptions').style.display = 'none';
      $('qeScramble').style.display = 'block';
      $('qeKbdHint').style.display = 'none';
      buildScramble(word.word); break;
  }
}

function showTyping() {
  $('qeOptions').style.display = 'none';
  $('qeTyping').style.display = 'block';
  const inp = $('qeTypeInput');
  inp.value = ''; inp.className = 'qe-type-input'; inp.disabled = false;
  $('qeTypeHint').textContent = '';
  setTimeout(() => inp.focus(), 100);
}

/* ── ABCD Options ────────────────────────────────────────────────── */
function renderOpts(options, correctAns) {
  for (let i = 0; i < 4; i++) {
    const btn = $(`qeOpt${i}`);
    btn.className = 'qe-opt'; btn.disabled = false;
    btn.dataset.correct = options[i] === correctAns ? '1' : '0';
    $(`qeOpt${i}T`).textContent = options[i] || '';
  }
}

function selectOpt(idx) {
  if (answered) return;
  answered = true; stopTimer();
  const btn = $(`qeOpt${idx}`);
  const ok = btn.dataset.correct === '1';
  for (let i = 0; i < 4; i++) {
    const b = $(`qeOpt${i}`); b.disabled = true;
    if (b.dataset.correct === '1') b.classList.add('correct');
    else if (i === idx && !ok) b.classList.add('wrong');
  }
  handleResult(ok, questions[currentIdx].word);
}

/* ── Typing ──────────────────────────────────────────────────────── */
function typeKeydown(e) {
  if (e.key === 'Enter') { e.preventDefault(); if (!answered) submitTyping(); else next(); }
}

function submitTyping() {
  if (answered) return;
  const inp = $('qeTypeInput');
  const val = inp.value.trim();
  if (!val) return;
  answered = true; stopTimer();
  const word = questions[currentIdx].word;
  const ok = norm(val) === norm(word.word);
  inp.disabled = true;
  inp.className = 'qe-type-input ' + (ok ? 'correct' : 'wrong');
  handleResult(ok, word, ok ? '' : `Đáp án đúng: ${word.word}`);
}

/* ── Scramble ────────────────────────────────────────────────────── */
function buildScramble(wordStr) {
  scrambleTileMap = shuffle(wordStr.split('')).map((ch, i) => ({ ch, idx: i, used: false }));
  scrambleAnswer = [];
  $('qeScrAnswer').innerHTML = '';
  $('qeScrAnswer').className = 'qe-scr-answer';
  $('qeScrTiles').innerHTML = '';
  scrambleTileMap.forEach((t, i) => {
    const el = document.createElement('div');
    el.className = 'qe-tile'; el.textContent = t.ch;
    el.dataset.ti = i;
    el.addEventListener('click', () => addTile(i, el));
    $('qeScrTiles').appendChild(el);
  });
}

function addTile(ti, el) {
  if (answered || scrambleTileMap[ti].used) return;
  scrambleTileMap[ti].used = true; el.classList.add('used');
  scrambleAnswer.push({ ch: scrambleTileMap[ti].ch, ti });
  const ansEl = $('qeScrAnswer');
  const tile = document.createElement('div');
  tile.className = 'qe-tile ans'; tile.textContent = scrambleTileMap[ti].ch;
  tile.addEventListener('click', () => {
    if (answered) return;
    scrambleTileMap[ti].used = false;
    document.querySelector(`[data-ti="${ti}"]`)?.classList.remove('used');
    scrambleAnswer.splice(scrambleAnswer.findIndex(a => a.ti === ti), 1);
    tile.remove();
  });
  ansEl.appendChild(tile);
}

function clearScramble() {
  if (answered) return;
  scrambleAnswer = [];
  scrambleTileMap.forEach(t => t.used = false);
  document.querySelectorAll('#qeScrTiles .qe-tile').forEach(t => t.classList.remove('used'));
  $('qeScrAnswer').innerHTML = '';
}

function submitScramble() {
  if (answered) return;
  if (!scrambleAnswer.length) { window.studyUI?.showToast('Hãy chọn ít nhất một ô chữ!', 'error'); return; }
  answered = true; stopTimer();
  const userWord = scrambleAnswer.map(t => t.ch).join('');
  const word = questions[currentIdx].word;
  const ok = norm(userWord) === norm(word.word);
  $('qeScrAnswer').className = 'qe-scr-answer ' + (ok ? 'correct' : 'wrong');
  handleResult(ok, word, ok ? '' : `Đáp án đúng: ${word.word}`);
}

/* ── Result Handler ──────────────────────────────────────────────── */
function handleResult(ok, word, msg) {
  let pts = 0, resultTag;
  if (ok) {
    correctCount++; combo++; if (combo > maxCombo) maxCombo = combo;
    pts = (timerEnabled && timerRemaining > timerMaxSec * 0.5) ? 20 : 10;
    if (pts === 20) showBonus();
    score += pts; resultTag = 'correct';
    window.studyUI?.playDing();
    showFeedback(true, word, msg || `${word.word} — ${word.meaning}`);
  } else {
    wrongCount++; combo = 0; pts = 0;
    resultTag = msg?.includes('Hết giờ') ? 'timeout' : msg?.includes('Bỏ qua') ? 'skip' : 'wrong';
    window.studyUI?.playWrong();
    showFeedback(false, word, msg || `Đáp án đúng: ${word.word}`);
  }
  updateCombo(); updateHUD();
  sessionLog.push({ word, type: questions[currentIdx].type, result: resultTag, pts });
}

/* ── Feedback ────────────────────────────────────────────────────── */
function showFeedback(ok, word, msg) {
  const bar = $('qeFeedback');
  bar.className = 'qe-feedback show ' + (ok ? 'ok' : 'ng');
  $('qeFbIcon').textContent = ok ? '✅' : '❌';
  $('qeFbLbl').textContent = ok ? '🎉 Chính xác!' : '😢 Chưa đúng rồi';
  $('qeFbAns').textContent = msg;
}
function hideFeedback() { $('qeFeedback').className = 'qe-feedback'; }

function next() {
  if (!answered) return;
  currentIdx++;
  loadQuestion();
}

/* ── Timer ───────────────────────────────────────────────────────── */
function startTimer() {
  stopTimer();
  if (!timerEnabled) { $('qeTimer').style.display = 'none'; return; }
  $('qeTimer').style.display = 'block';
  timerRemaining = timerMaxSec;
  const arc = $('qeTimerArc');
  const circ = 113;
  const tick = () => {
    $('qeTimerNum').textContent = timerRemaining;
    arc.style.strokeDashoffset = circ - (timerRemaining / timerMaxSec) * circ;
    arc.className = 'qe-timer-arc' + (timerRemaining <= 5 ? ' danger' : timerRemaining <= timerMaxSec * 0.4 ? ' warn' : '');
    if (timerRemaining <= 0) {
      stopTimer();
      if (!answered) {
        answered = true;
        wrongCount++; combo = 0; updateCombo();
        window.studyUI?.playWrong();
        const word = questions[currentIdx].word;
        for (let i = 0; i < 4; i++) { const b = $(`qeOpt${i}`); if (b) { b.disabled = true; if (b.dataset.correct === '1') b.classList.add('correct'); } }
        const inp = $('qeTypeInput'); if (inp) inp.disabled = true;
        showFeedback(false, word, `⏰ Hết giờ! Đáp án: ${word.word}`);
        sessionLog.push({ word, type: questions[currentIdx].type, result: 'timeout', pts: 0 });
        updateHUD();
      }
      return;
    }
    timerRemaining--;
  };
  tick(); timerInterval = setInterval(tick, 1000);
}
function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }

/* ── HUD ─────────────────────────────────────────────────────────── */
function updateHUD() {
  const total = questions.length;
  $('qeHudQ').textContent = `${Math.min(currentIdx + 1, total)}/${total}`;
  $('qeHudFill').style.width = `${(currentIdx / total) * 100}%`;
  $('qeHudScore').textContent = score;
}
function updateCombo() {
  $('qeComboN').textContent = combo;
  $('qeCombo').className = 'qe-combo' + (combo >= 3 ? ' hot' : '');
}
function showBonus() {
  const pop = $('qeBonus'); pop.classList.add('show');
  setTimeout(() => pop.classList.remove('show'), 1500);
}

/* ── Perks ───────────────────────────────────────────────────────── */
function updatePerksUI() {
  $('qePerkSkipN').textContent = `×${perks.skip}`;
  $('qePerkHintN').textContent = `×${perks.hint}`;
  $('qePerkListenN').textContent = `×${perks.listen}`;
  $('qePerkSkip').disabled = perks.skip <= 0 || answered;
  $('qePerkHint').disabled = perks.hint <= 0 || answered;
  $('qePerkListen').disabled = perks.listen <= 0;
}

function usePerk(type) {
  const q = questions[currentIdx]; if (!q) return;
  if (type === 'skip' && perks.skip > 0 && !answered) {
    perks.skip--; answered = true; stopTimer();
    wrongCount++; combo = 0; updateCombo();
    showFeedback(false, q.word, `Đã bỏ qua — Đáp án: ${q.word.word}`);
    sessionLog.push({ word: q.word, type: q.type, result: 'skip', pts: 0 });
    updateHUD();
  } else if (type === 'hint' && perks.hint > 0 && !answered) {
    perks.hint--;
    const hint = q.word.word.slice(0, Math.ceil(q.word.word.length / 2)) + '...';
    $('qeTypeHint').textContent = `💡 Gợi ý: "${hint}"`;
    window.studyUI?.showToast(`💡 Gợi ý: ${hint}`, 'info', 2500);
  } else if (type === 'listen' && perks.listen > 0) {
    perks.listen--;
    speak(q.word.word);
  }
  updatePerksUI();
}

/* ── Show Results ────────────────────────────────────────────────── */
function showResult() {
  stopTimer(); hideFeedback();
  $('qeQuestion').style.display = 'none';
  $('qeHud').style.display = 'none';

  const total = correctCount + wrongCount;
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const wrongList = sessionLog.filter(r => r.result !== 'correct');

  $('qeResPct').textContent = `${pct}%`;
  $('qeResC').textContent = correctCount;
  $('qeResW').textContent = wrongCount;
  $('qeResS').textContent = score;
  $('qeResCB').textContent = maxCombo;

  // Score ring
  setTimeout(() => {
    const ring = $('qeRingFill');
    ring.style.strokeDashoffset = 377 - (pct / 100) * 377;
    ring.style.stroke = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  }, 100);

  // Emoji/message
  let emoji, title, desc;
  if (pct >= 90) { emoji = '🏆'; title = 'Xuất sắc!'; desc = 'Cậu đã làm chủ tất cả từ này rồi!'; }
  else if (pct >= 70) { emoji = '🌟'; title = 'Tốt lắm!'; desc = 'Tiếp tục ôn để đạt hoàn hảo nhé!'; }
  else if (pct >= 50) { emoji = '💪'; title = 'Cố lên!'; desc = 'Còn vài từ cần ôn thêm chút nữa!'; }
  else { emoji = '📚'; title = 'Cần ôn thêm'; desc = 'Luyện đều đặn mỗi ngày sẽ tốt hơn!'; }
  $('qeResEmoji').textContent = emoji;
  $('qeResTitle').textContent = title;
  $('qeResDesc').textContent = desc;

  // Retry wrong button
  const retryBtn = $('qeRetryWrongBtn');
  if (wrongList.length > 0) {
    $('qeWrongN').textContent = `(${wrongList.length} từ)`;
    retryBtn.style.display = 'inline-flex';
    retryBtn._wrongWords = wrongList.map(r => r.word);
  } else {
    retryBtn.style.display = 'none';
  }

  // Build table
  buildResultTable();
  activeFilter = 'all';
  setFilterTab('all');

  $('qeResult').style.display = 'block';
  window.studyUI?.showToast(`🎯 Kết quả: ${pct}% — ${score} điểm!`, 'success', 4000);
}

function buildResultTable() {
  const tbody = $('qeTableBody');
  tbody.innerHTML = '';
  sessionLog.forEach((entry, i) => {
    const { word, type, result, pts } = entry;
    const isOk = result === 'correct';
    const badge =
      result === 'correct'  ? '<span class="qe-badge ok">✅ Đã thuộc</span>' :
      result === 'timeout'  ? '<span class="qe-badge tm">⏰ Hết giờ</span>' :
      result === 'skip'     ? '<span class="qe-badge sk">⏭️ Bỏ qua</span>' :
                              '<span class="qe-badge ng">❌ Chưa thuộc</span>';
    const tr = document.createElement('tr');
    tr.className = isOk ? 'row-correct' : 'row-wrong';
    tr.dataset.result = result;
    tr.innerHTML = `
      <td style="color:var(--study-text-muted);font-weight:700;">${i + 1}</td>
      <td><div class="qe-word-cell">${esc(word.word)}<button class="qe-mini-listen" onclick="QE.speak('${ea(word.word)}')" title="Nghe">🔊</button></div>${word.phonetic ? `<div style="font-size:11px;color:var(--qa);margin-top:2px;">${esc(word.phonetic)}</div>` : ''}</td>
      <td style="color:var(--study-text-muted);font-size:13px;">${esc(word.meaning)}</td>
      <td style="font-size:12px;color:var(--study-text-muted);white-space:nowrap;">${TYPE_LABELS[type] || type}</td>
      <td>${badge}</td>
      <td style="font-weight:900;color:${isOk ? '#10b981' : 'var(--study-text-muted)'};">${pts > 0 ? '+' + pts : '—'}</td>
    `;
    tbody.appendChild(tr);
  });
  updateFilterCounts();
}

function filterResult(filter) {
  activeFilter = filter;
  setFilterTab(filter);
  document.querySelectorAll('#qeTableBody tr').forEach(tr => {
    const r = tr.dataset.result;
    if (filter === 'all') tr.classList.remove('hidden');
    else if (filter === 'correct') tr.classList.toggle('hidden', r !== 'correct');
    else tr.classList.toggle('hidden', r === 'correct');
  });
}

function setFilterTab(filter) {
  ['qeFAll', 'qeFC', 'qeFW'].forEach(id => $(`${id}`)?.classList.remove('active'));
  const map = { all: 'qeFAll', correct: 'qeFC', wrong: 'qeFW' };
  $(map[filter])?.classList.add('active');
}

function updateFilterCounts() {
  const total = sessionLog.length;
  const ok = sessionLog.filter(r => r.result === 'correct').length;
  const ng = total - ok;
  $('qeFAll').textContent = `Tất cả (${total})`;
  $('qeFC').textContent = `✅ Đã thuộc (${ok})`;
  $('qeFW').textContent = `❌ Chưa thuộc (${ng})`;
}

function retryWrong() {
  const wrongWords = $('qeRetryWrongBtn')._wrongWords;
  if (!wrongWords?.length) return;
  // Reset to start screen settings but pass wrong words directly
  startQuiz(wrongWords);
}

/* ── Keyboard ────────────────────────────────────────────────────── */
function setupKeyboard() {
  document.addEventListener('keydown', e => {
    const tag = document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.code === 'Space') { e.preventDefault(); if (answered) next(); }
    else if (['Digit1','Digit2','Digit3','Digit4'].includes(e.code)) {
      const idx = +e.code.slice(-1) - 1;
      if (!answered && $('qeOptions').style.display !== 'none') selectOpt(idx);
    }
    else if (e.code === 'Enter') {
      if (!answered) {
        if ($('qeScramble').style.display !== 'none') submitScramble();
      } else { next(); }
    }
    else if (e.code === 'KeyL') usePerk('listen');
    else if (e.code === 'KeyH' && !answered) usePerk('hint');
    else if (e.code === 'KeyS' && !answered) usePerk('skip');
  });
}

/* ── Utils ───────────────────────────────────────────────────────── */
function speak(text) { window.studySpeech?.speak(text, LANG); }
function speakPulse(btn, text) {
  speak(text);
  btn.classList.add('pulsing');
  setTimeout(() => btn.classList.remove('pulsing'), 650);
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function norm(s) { return (s || '').trim().toLowerCase().replace(/\s+/g, ''); }
function esc(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function ea(s) { return (s || '').replace(/'/g, "\\'").replace(/"/g, '&quot;'); }
function $(id) { return document.getElementById(id); }

/* ── Init ────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  injectCSS();
  renderApp();
  loadDecks();
  setupKeyboard();
});

/* ── Global API ──────────────────────────────────────────────────── */
window.QE = {
  startQuiz, selectOpt, submitTyping, typeKeydown,
  clearScramble, submitScramble, addTile,
  next, usePerk, filterResult, retryWrong,
  speak, speakPulse
};

})();
