// FormSolver AI — app.js

const STORAGE_KEY = 'formsolver_settings';
const STATS_KEY   = 'formsolver_stats';
let generatedAnswers = [];

/* ── Settings helpers ── */
function getSetting(key, fallback) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    return JSON.parse(raw)[key] ?? fallback;
  } catch { return fallback; }
}

function getPersonalInfo() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const s = JSON.parse(raw);
    return { name:s.name||'', id:s.id||'', org:s.org||'', dept:s.dept||'', email:s.email||'', phone:s.phone||'', extra:s.extra||'' };
  } catch { return {}; }
}

function buildPersonalContext(info) {
  const map = [['이름',info.name],['학번/사번',info.id],['소속',info.org],['학과/부서',info.dept],['이메일',info.email],['전화번호',info.phone],['기타',info.extra]];
  const lines = map.filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`);
  return lines.length ? lines.join('\n') : null;
}

function incrementStat(key) {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    const s = raw ? JSON.parse(raw) : {uses:0,forms:0,forged:0};
    s[key] = (s[key]||0) + 1;
    s.uses  = (s.uses||0) + 1;
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {}
}

/* ── On load ── */
window.addEventListener('DOMContentLoaded', () => {
  const apiKey = getSetting('apiKey', '');
  if (!apiKey && document.getElementById('apiWarning')) {
    document.getElementById('apiWarning').classList.remove('hidden');
  }
  const ctx = getSetting('defaultContext', '');
  if (ctx && document.getElementById('context')) {
    document.getElementById('context').value = ctx;
  }
  // Prefill URL from fenrir viewer
  const pre = sessionStorage.getItem('prefill_url');
  if (pre && document.getElementById('formUrl')) {
    document.getElementById('formUrl').value = pre;
    sessionStorage.removeItem('prefill_url');
  }
});

/* ── UI helpers ── */
function setProgress(pct) { document.getElementById('progress').style.width = pct + '%'; }

function setStatus(msg, type='loading') {
  const bar = document.getElementById('statusBar');
  bar.classList.remove('hidden');
  document.getElementById('statusDot').className = 'status-dot ' + type;
  document.getElementById('statusText').textContent = msg;
}

function markStepDone(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('active');
  el.classList.add('done');
  el.querySelector('.step-num').textContent = 'ᚠ';
}

/* ── Form fetch & parse ── */
async function fetchFormHTML(url) {
  const proxyBase = getSetting('proxyUrl', 'https://api.allorigins.win/get?url=');
  const res = await fetch(proxyBase + encodeURIComponent(url));
  if (!res.ok) throw new Error('폼 데이터를 가져올 수 없습니다 (HTTP ' + res.status + ')');
  return (await res.json()).contents;
}

function extractRawData(html) {
  const m = html.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*(\[[\s\S]*?\]);\s*<\/script>/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

function parseQuestions(raw) {
  if (!raw?.[1]?.[1]) return { title:'구글 폼', questions:[] };
  const TYPE = {0:'short_text',1:'long_text',2:'short_text',3:'paragraph',4:'multiple_choice',5:'checkbox',7:'dropdown',9:'date',10:'time',11:'scale',13:'grid'};
  const questions = [];
  for (const item of raw[1][1]) {
    if (!item[1] || !Array.isArray(item[4])) continue;
    for (const block of item[4]) {
      if (!block) continue;
      questions.push({ id:block[0], title:item[1], description:item[2]||'', type:TYPE[block[3]]||'short_text', options:Array.isArray(block[1])?block[1].map(o=>o[0]).filter(Boolean):[], required:block[2]===1 });
    }
  }
  return { title:raw[1][8]||'구글 폼', questions };
}

function fallbackExtract(html) {
  const questions = [];
  for (const m of html.matchAll(/"([^"]{5,200}?)"\s*,\s*null\s*,\s*null\s*,\s*\[/g)) {
    const text = m[1].trim();
    if (text.length>4 && !text.startsWith('http') && !text.includes('\\n'))
      questions.push({ title:text, type:'short_text', options:[], description:'' });
  }
  return questions.slice(0,20);
}

/* ── Claude API ── */
async function callClaude(userMsg, systemPrompt) {
  const apiKey    = getSetting('apiKey', '');
  const model     = getSetting('model', 'claude-sonnet-4-20250514');
  const maxTokens = getSetting('maxTokens', 4000);

  if (!apiKey) throw new Error('API 키가 설정되지 않았습니다. 설정 페이지에서 입력해주세요.');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, system: systemPrompt, messages:[{role:'user',content:userMsg}] }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'API 오류'); }
  return (await res.json()).content[0].text;
}

function buildPrompt(formTitle, questions, context) {
  const personalInfo = getPersonalInfo();
  const personalCtx  = buildPersonalContext(personalInfo);
  const lang = getSetting('lang', 'ko');
  const includeReason = getSetting('includeReason', true);

  let system = `당신은 구글 폼의 모든 질문에 정확하고 적절한 답변을 생성하는 전문 AI입니다.
규칙: 1) 마크다운 없이 순수 JSON만 응답 2) 각 질문에 최선의 답변 제공 3) 객관식은 options에서 선택 4) 개인정보 필드는 제공된 정보로 채우세요`;
  if (lang==='ko') system += '\n5) 반드시 한국어로 답변하세요';
  if (lang==='en') system += '\n5) Answer in English';
  if (includeReason) system += '\n6) 각 답변에 brief_reason 필드로 짧은 근거를 추가하세요 (개인정보 필드 제외)';
  if (personalCtx)   system += `\n\n제출자 정보 (해당 필드에 자동 입력):\n${personalCtx}`;
  if (context)       system += `\n\n폼 컨텍스트:\n${context}`;

  let user;
  if (questions.length > 0) {
    const qList = questions.map((q,i)=>{
      let t=`Q${i+1}. ${q.title}`;
      if (q.description) t+=`\n설명: ${q.description}`;
      if (q.options.length) t+=`\n선택지: ${q.options.join(' / ')}`;
      t+=`\n유형: ${q.type}`;
      return t;
    }).join('\n\n');
    user = `폼 제목: ${formTitle}\n\n질문들:\n\n${qList}\n\n응답 JSON:\n{"answers":[{"question":"질문","answer":"답변","type":"유형","selected_options":["선택"]${includeReason?',"brief_reason":"근거"':''}}]}`;
  } else {
    user = `폼을 직접 파싱하지 못했습니다. 컨텍스트 기반으로 최선의 답변을 생성하세요.\n{"answers":[{"question":"질문","answer":"답변","type":"유형","selected_options":[]}],"note":"파싱 불가"}`;
  }
  return { system, user };
}

function parseAIResponse(text) {
  const clean = text.replace(/```json|```/g,'').trim();
  try { return JSON.parse(clean); } catch {
    const m = clean.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('AI 응답 파싱 실패');
  }
}

/* ── Render ── */
const PERSONAL_KW = ['이름','성명','학번','사번','번호','소속','학교','학과','부서','이메일','email','전화','연락처','학년','반'];
const isPersonal = t => PERSONAL_KW.some(k=>t.toLowerCase().includes(k));

function renderResults(formTitle, questions, answers, note) {
  const el = document.getElementById('answersContainer');
  el.innerHTML = '';
  if (note) el.innerHTML = `<div class="warning-box">ᚢ ${note}</div>`;
  el.innerHTML += `<div class="form-title-display">${formTitle}</div>`;

  answers.forEach((item,i) => {
    const personal = isPersonal(item.question||'');
    const card = document.createElement('div');
    card.className = 'answer-card';
    card.style.animationDelay = (i*0.055)+'s';

    const selOpts = item.selected_options||[];
    const allOpts = (questions[i]&&questions[i].options)||[];

    let ansHTML = '';
    if (selOpts.length && allOpts.length) {
      ansHTML = `<div class="options-list">${allOpts.map(o=>`<span class="option-pill ${selOpts.includes(o)?'selected':''}">${o}</span>`).join('')}</div>`;
    } else if (item.answer) {
      ansHTML = `<div class="a-text">${item.answer}</div>`;
    }

    const reasonHTML = item.brief_reason && !personal
      ? `<div style="font-size:12px;color:var(--muted);font-style:italic;margin-top:8px;padding-top:6px;border-top:1px solid var(--border);">ᚱ ${item.brief_reason}</div>`
      : '';

    const copyVal = item.answer || selOpts.join(', ');

    card.innerHTML = `
      <div class="q-label">Q${i+1} &nbsp;<span class="tag ${personal?'tag-personal':'tag-question'}">${personal?'개인정보':'문제'}</span></div>
      <div class="q-text">${item.question||''}</div>
      ${ansHTML}${reasonHTML}
      ${copyVal?`<button class="copy-btn" onclick="copyText('${copyVal.replace(/'/g,"\\'")}',this)">복사</button>`:''}
    `;
    el.appendChild(card);
  });
}

/* ── Main ── */
async function fetchAndSolve() {
  const formUrl = document.getElementById('formUrl').value.trim();
  const context = document.getElementById('context').value.trim();

  if (!formUrl || !formUrl.includes('google.com/forms')) { alert('올바른 Google Form URL을 입력해주세요.'); return; }

  const apiKey = getSetting('apiKey','');
  if (!apiKey) {
    document.getElementById('apiWarning').classList.remove('hidden');
    alert('API 키를 먼저 설정해주세요. 설정 페이지로 이동합니다.');
    window.location.href = 'settings.html';
    return;
  }

  const btn = document.getElementById('solveBtn');
  btn.disabled = true;

  try {
    setProgress(10);
    setStatus('폼 데이터를 소환하는 중...','loading');

    let formTitle='구글 폼', questions=[];
    try {
      const html = await fetchFormHTML(formUrl);
      setProgress(30); setStatus('폼 구조를 해석하는 중...','loading');
      const raw = extractRawData(html);
      if (raw) { const p=parseQuestions(raw); formTitle=p.title; questions=p.questions; }
      if (!questions.length) questions = fallbackExtract(html);
    } catch(e) { setStatus('직접 접근 실패 — AI로 분석 중...','loading'); }

    setProgress(50);
    const {system,user} = buildPrompt(formTitle, questions, context);
    setProgress(65); setStatus('Claude가 답변을 엮는 중...','loading');

    const aiText = await callClaude(user, system);
    setProgress(90);
    const parsed = parseAIResponse(aiText);
    generatedAnswers = parsed.answers||[];

    renderResults(formTitle, questions, generatedAnswers, parsed.note);
    setProgress(100);
    setStatus(`ᚠ 완료 — ${generatedAnswers.length}개의 답변이 결박되었습니다`,'success');

    markStepDone('step1');
    incrementStat('forms');

    const rs = document.getElementById('results-section');
    rs.classList.remove('hidden');
    rs.scrollIntoView({behavior:'smooth',block:'start'});
  } catch(err) {
    setStatus('오류: '+err.message,'error');
    console.error(err);
  } finally { btn.disabled=false; }
}

/* ── Utilities ── */
function copyText(text,btn) {
  navigator.clipboard.writeText(text).then(()=>{
    const o=btn.textContent; btn.textContent='ᚠ 복사됨';
    setTimeout(()=>btn.textContent=o,1600);
  });
}

function copyAllAnswers() {
  const lines = generatedAnswers.map((a,i)=>`Q${i+1}. ${a.question}\n답: ${a.answer||a.selected_options?.join(', ')||''}`).join('\n\n');
  navigator.clipboard.writeText(lines).then(()=>{
    const btn=event.target; btn.textContent='ᚠ 복사 완료';
    setTimeout(()=>btn.textContent='ᚹ 전체 답변 복사',2000);
  });
}

function resetAll() {
  document.getElementById('results-section').classList.add('hidden');
  document.getElementById('answersContainer').innerHTML='';
  document.getElementById('statusBar').classList.add('hidden');
  document.getElementById('progress').style.width='0%';
  document.getElementById('formUrl').value='';
  generatedAnswers=[];
  const el=document.getElementById('step1');
  el.classList.remove('done','active');
  el.querySelector('.step-num').textContent='I';
  el.classList.add('active');
}
