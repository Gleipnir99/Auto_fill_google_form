// FormSolver — shared.js

const STORAGE_KEY = 'formsolver_settings';
const STATS_KEY   = 'formsolver_stats';

/* ── Model pricing (USD per 1M tokens) ── */
const MODEL_PRICING = {
  'claude-sonnet-4-20250514':    { input: 3.00,  output: 15.00 },
  'claude-opus-4-6':             { input: 15.00, output: 75.00 },
  'claude-haiku-4-5-20251001':   { input: 0.25,  output: 1.25  },
};

function getModelPrice(model) {
  // Fuzzy match
  if (model.includes('opus'))   return MODEL_PRICING['claude-opus-4-6'];
  if (model.includes('haiku'))  return MODEL_PRICING['claude-haiku-4-5-20251001'];
  return MODEL_PRICING['claude-sonnet-4-20250514']; // default
}

/* ── Token usage tracking ── */
function trackUsage(model, inputTokens, outputTokens) {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    const s = raw ? JSON.parse(raw) : { uses:0, docs:0, inputTokens:0, outputTokens:0, costUsd:0 };

    const price = getModelPrice(model);
    const cost  = (inputTokens / 1_000_000) * price.input
                + (outputTokens / 1_000_000) * price.output;

    s.inputTokens  = (s.inputTokens  || 0) + inputTokens;
    s.outputTokens = (s.outputTokens || 0) + outputTokens;
    s.costUsd      = (s.costUsd      || 0) + cost;

    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {}
}

/* ── Settings ── */
function getSetting(key, fallback) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    return JSON.parse(raw)[key] ?? fallback;
  } catch { return fallback; }
}

function incrementStat(key) {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    const s = raw ? JSON.parse(raw) : { uses:0, docs:0 };
    s[key] = (s[key]||0) + 1;
    s.uses  = (s.uses||0) + 1;
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {}
}

/* ── File → base64 ── */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsDataURL(file);
  });
}

/* ── File → plain text ── */
function fileToText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsText(file, 'utf-8');
  });
}

/* ── Claude API ── */
async function callClaude(content, systemPrompt) {
  const apiKey    = getSetting('apiKey', '');
  const model     = getSetting('model', 'claude-sonnet-4-20250514');
  const maxTokens = parseInt(getSetting('maxTokens', 4000));

  if (!apiKey) throw new Error('API 키가 설정되지 않았습니다. settings.html에서 입력해주세요.');

  const msgContent = typeof content === 'string' ? content : content;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'x-api-key':     apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model, max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: msgContent }],
    }),
  });

  if (!res.ok) {
    const e = await res.json().catch(()=>({}));
    throw new Error(e.error?.message || `API 오류 HTTP ${res.status}`);
  }

  const data = await res.json();

  // Track token usage
  if (data.usage) {
    trackUsage(model, data.usage.input_tokens || 0, data.usage.output_tokens || 0);
  }

  return data.content[0].text;
}

/* ── Claude API with web search ── */
async function callClaudeWithSearch(contentBlocks, systemPrompt) {
  const apiKey    = getSetting('apiKey', '');
  const model     = getSetting('model', 'claude-sonnet-4-20250514');
  const maxTokens = parseInt(getSetting('maxTokens', 6000));

  if (!apiKey) throw new Error('API 키가 설정되지 않았습니다.');

  // Accept either a string or a content array (same as callClaude)
  const msgContent = typeof contentBlocks === 'string'
    ? contentBlocks
    : contentBlocks;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'x-api-key':     apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model, max_tokens: maxTokens,
      system: systemPrompt,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: msgContent }],
    }),
  });

  if (!res.ok) {
    const e = await res.json().catch(()=>({}));
    throw new Error(e.error?.message || `API 오류 HTTP ${res.status}`);
  }

  const data = await res.json();

  if (data.usage) {
    trackUsage(model, data.usage.input_tokens || 0, data.usage.output_tokens || 0);
  }

  const texts = data.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
  return texts;
}

/* ── Personal field detection ── */
const PERSONAL_KW = ['이름','성명','학번','사번','번호','소속','학교','학과','부서','이메일','email','전화','연락처','학년','반','성별','나이','생년'];
const isPersonalField = t => PERSONAL_KW.some(k => t.toLowerCase().includes(k));

/* ── Google Form utils ── */
async function fetchViaProxy(targetUrl) {
  const proxyBase = getSetting('proxyUrl', '');
  if (!proxyBase) throw new Error('CORS 프록시가 설정되지 않았습니다.');
  const res = await fetch(proxyBase + encodeURIComponent(targetUrl));
  if (!res.ok) throw new Error(`프록시 오류 HTTP ${res.status}`);
  const text = await res.text();
  if (text.trim().startsWith('{')) {
    try { const j = JSON.parse(text); if (j.contents) return j.contents; } catch {}
  }
  return text;
}

function extractFormRaw(html) {
  const m = html.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*(\[[\s\S]*?\]);\s*<\/script>/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

function parseFormData(raw) {
  if (!raw?.[1]?.[1]) return { title:'구글 폼', description:'', questions:[] };
  const TYPE = { 0:'short_text',1:'long_text',2:'short_text',3:'paragraph',4:'multiple_choice',5:'checkbox',7:'dropdown',9:'date',10:'time',11:'scale',13:'grid' };
  const questions = [];
  for (const item of raw[1][1]) {
    if (!item[1]||!Array.isArray(item[4])) continue;
    for (const block of item[4]) {
      if (!block) continue;
      questions.push({ id:block[0], title:item[1], description:item[2]||'', type:TYPE[block[3]]||'short_text', options:Array.isArray(block[1])?block[1].map(o=>o[0]).filter(Boolean):[], required:block[2]===1, scaleMin:block[4]?.[0]??1, scaleMax:block[4]?.[1]??5, scaleMinLabel:block[4]?.[2]||'', scaleMaxLabel:block[4]?.[3]||'' });
    }
  }
  return { title:raw[1][8]||'구글 폼', description:raw[1][0]||'', questions };
}

function buildPersonalContext(info) {
  const map=[['이름',info.name],['학번/사번',info.id],['소속',info.org],['학과/부서',info.dept],['이메일',info.email],['전화번호',info.phone],['기타',info.extra]];
  return map.filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).join('\n') || null;
}

function getPersonalInfo() {
  try {
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw)return{};
    const s=JSON.parse(raw);
    return{name:s.name||'',id:s.id||'',org:s.org||'',dept:s.dept||'',email:s.email||'',phone:s.phone||'',extra:s.extra||''};
  } catch{return{};}
}

/* ══════════════════════════════════════
   PROJECT STORAGE
══════════════════════════════════════ */
const PROJECTS_KEY = 'formsolver_projects';

function getProjects() {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveProjects(projects) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

function createProject(name, color, icon) {
  const projects = getProjects();
  const proj = {
    id:        'proj_' + Date.now(),
    name,
    color:     color || '#c8a84b',
    icon:      icon  || '📁',
    createdAt: Date.now(),
    entries:   [],
  };
  projects.push(proj);
  saveProjects(projects);
  return proj;
}

function saveEntryToProject(projectId, entry) {
  // entry: { type, title, content, source, createdAt }
  const projects = getProjects();
  const proj = projects.find(p => p.id === projectId);
  if (!proj) return false;
  proj.entries.unshift({
    id:        'entry_' + Date.now(),
    createdAt: Date.now(),
    ...entry,
  });
  saveProjects(projects);
  return true;
}

function deleteEntry(projectId, entryId) {
  const projects = getProjects();
  const proj = projects.find(p => p.id === projectId);
  if (!proj) return;
  proj.entries = proj.entries.filter(e => e.id !== entryId);
  saveProjects(projects);
}

function deleteProject(projectId) {
  const projects = getProjects().filter(p => p.id !== projectId);
  saveProjects(projects);
}

/* ── JSON parser (strips markdown fences) ── */
function parseAIJson(text) {
  const clean = text.replace(/```json|```/g, '').trim();
  try { return JSON.parse(clean); } catch {
    const m = clean.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('AI 응답 파싱 실패 — JSON을 찾을 수 없습니다');
  }
}
