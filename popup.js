// popup.js - UI logic

const scanBtn = document.getElementById("scanBtn");
const modeSel = document.getElementById("mode");
const restoreBtn = document.getElementById("restoreBtn");
const backBtn = document.getElementById("backBtn");
const modeContent = document.getElementById("modeContent");
const summary = document.getElementById("summary");
const scoreRing = document.getElementById("scoreRing");
const goodPctLabel = document.getElementById("goodPct");
const badPctLabel = document.getElementById("badPct");
const progressFill = document.getElementById("progressFill");
const colorScoreLabel = document.getElementById("colorScore");
const altScoreLabel = document.getElementById("altScore");
const apiInput = document.getElementById("apiInput");
const saveApiBtn = document.getElementById("saveApiBtn");
const devList = document.getElementById("devList");
const userList = document.getElementById("userList");
const patchBox = document.getElementById("patchBox");
const userResult = document.getElementById("userResult");
const statusBar = document.getElementById("statusBar");

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["PUREPATH_MODE","OPENAI_API_KEY"], (r) => {
    if(r.PUREPATH_MODE) modeSel.value = r.PUREPATH_MODE;
    if(r.OPENAI_API_KEY) apiInput.value = r.OPENAI_API_KEY;
    renderModeUI();
    showNote(""); // clear status
  });
});

// Back button: simply re-render current mode UI and clear status
backBtn.addEventListener("click", () => {
  renderModeUI();
  showNote("");
});

modeSel.addEventListener("change", () => {
  chrome.storage.local.set({ PUREPATH_MODE: modeSel.value });
  renderModeUI();
  showNote("");
});

saveApiBtn.addEventListener("click", () => {
  const key = apiInput.value.trim();
  chrome.runtime.sendMessage({ action: "setApiKey", key }, (resp) => {
    if(resp && resp.ok) showNote("API key saved locally.");
    else showNote("Error saving API key.");
  });
});

scanBtn.addEventListener("click", async () => {
  const tab = await getActiveTab();
  if(!tab || !tab.id) return showNote("No active tab.");

  chrome.tabs.sendMessage(tab.id, { command: "collect_issues", limit: 800 }, (resp) => {
    if(chrome.runtime.lastError){
      showNote("Cannot scan this page. Try a normal website (http/https).");
      return;
    }
    if(!resp){
      showNote("No response from page.");
      return;
    }
    renderSummary(resp);
    renderModeResults(resp);
    showNote("Scan complete.");
  });
});

restoreBtn.addEventListener("click", async () => {
  const tab = await getActiveTab();
  if(!tab || !tab.id) return showNote("No active tab.");
  chrome.tabs.sendMessage(tab.id, { command: "restore" }, () => {
    if(chrome.runtime.lastError) showNote("Could not restore this page.");
    else showNote("Original page restored.");
  });
});

// --- Status messages ---
function showNote(msg){
  statusBar.textContent = msg || "";
}

// --- Summary scoring ---
// Simple linear score: if colorIssues >=60 -> 0, if 0 -> 100.
// Same for altIssues with 40.
function renderSummary(resp){
  const totals = resp.totals || {};
  const colorIssues = totals.colorTotal || 0;
  const altIssues = totals.altTotal || 0;

  const colorScore = Math.max(0, Math.round(100 - Math.min(colorIssues,60)/60*100));
  const altScore = Math.max(0, Math.round(100 - Math.min(altIssues,40)/40*100));
  const overall = Math.round((colorScore + altScore)/2);

  scoreRing.textContent = `${overall}%`;
  goodPctLabel.textContent = `${overall}%`;
  badPctLabel.textContent = `${100-overall}%`;
  progressFill.style.width = `${overall}%`;
  colorScoreLabel.textContent = `${colorScore}%`;
  altScoreLabel.textContent = `${altScore}%`;
  summary.hidden = false;
}

function renderModeUI(){
  const mode = modeSel.value;

  // Don't destroy devList/userList; just control visibility
  devList.innerHTML = "";
  userList.innerHTML = "";
  patchBox.style.display = "none";
  userResult.style.display = "none";

  if(mode === "developer"){
    devList.style.display = "block";
    userList.style.display = "none";
    modeContent.innerHTML = "";
    modeContent.appendChild(devList);
    modeContent.appendChild(patchBox);
  } else {
    devList.style.display = "none";
    userList.style.display = "block";
    modeContent.innerHTML = "";
    modeContent.appendChild(userList);
    modeContent.appendChild(userResult);

    userList.innerHTML = `
      <div class="section-title">User Mode – One-Click Accessible View</div>
      <div class="note">
        Apply presets that improve readability for low-vision and color-blind users. Changes are temporary and do not touch the website’s source code.
      </div>
      <div class="section-title">Presets</div>
      <div class="preset-row">
        <button class="preset-btn" data-preset="high-contrast">High Contrast</button>
        <button class="preset-btn" data-preset="large-text">Large Text</button>
        <button class="preset-btn" data-preset="cb-protanopia">Protanopia Mode</button>
        <button class="preset-btn" data-preset="cb-deuteranopia">Deuteranopia Mode</button>
        <button class="preset-btn" data-preset="cb-tritanopia">Tritanopia Mode</button>
        <button class="preset-btn" data-preset="highlight">Text Highlight</button>
      </div>
      <div style="margin-top:10px;">
        <button id="fixItBtn" class="primary">Fix It For Me</button>
      </div>
    `;

    setTimeout(() => {
      Array.from(userList.querySelectorAll(".preset-btn")).forEach(b =>
        b.addEventListener("click", () => applyPreset(b.getAttribute("data-preset")))
      );
      const fixItBtn = document.getElementById("fixItBtn");
      if(fixItBtn) fixItBtn.addEventListener("click", userFixIt);
    }, 50);
  }
}

function renderModeResults(resp){
  const mode = modeSel.value;
  if(mode === "developer") renderDeveloperResults(resp);
  else renderUserResults(resp);
}

// --- Developer UI ---
function renderDeveloperResults(resp){
  devList.innerHTML = "";
  patchBox.style.display = "block";
  userResult.style.display = "none";

  const colorIssues = resp.colorIssues || [];
  const altIssues = resp.altIssues || [];

  const colorHeader = document.createElement("div");
  colorHeader.className = "section-title";
  colorHeader.textContent = `Color Contrast Issues (showing ${colorIssues.length}, total ~${resp.totals?.colorTotal || colorIssues.length})`;
  devList.appendChild(colorHeader);

  colorIssues.forEach((iss, idx) => {
    const card = document.createElement("div");
    card.className = "issue-card";
    card.innerHTML = `
      <div class="row">
        <div class="label">Issue ${idx+1}</div>
        <div class="muted">${iss.tag}</div>
      </div>
      <div class="label" style="margin-top:8px">${iss.text}</div>
      <div class="issue-meta">
        <div><span class="color-swatch" style="background:${iss.fg}"></span> Text: ${iss.fg}</div>
        <div style="margin-top:6px"><span class="color-swatch" style="background:${iss.bg}"></span> Background: ${iss.bg}</div>
        <div style="margin-top:6px">Contrast ratio: ${Number(iss.ratio).toFixed(2)}</div>
      </div>
      <div class="suggestion" id="suggest-${idx}">
        <div class="muted">AI suggestion not requested.</div>
      </div>
      <div style="margin-top:8px;">
        <button class="small-btn" id="aiColorBtn-${idx}">AI Suggest Color</button>
        <button class="small-btn" id="previewColor-${idx}">Preview Darker Text</button>
      </div>
    `;
    devList.appendChild(card);

    setTimeout(() => {
      const aiBtn = document.getElementById(`aiColorBtn-${idx}`);
      const pvBtn = document.getElementById(`previewColor-${idx}`);
      if(aiBtn) aiBtn.addEventListener("click", () => requestAISuggestionColor(iss, idx));
      if(pvBtn) pvBtn.addEventListener("click", () => previewColorFix(iss, idx));
    }, 10);
  });

  const altHeader = document.createElement("div");
  altHeader.className = "section-title";
  altHeader.textContent = `Missing Alt Text (showing ${altIssues.length}, total ~${resp.totals?.altTotal || altIssues.length})`;
  devList.appendChild(altHeader);

  altIssues.forEach((iss, idx) => {
    const card = document.createElement("div");
    card.className = "issue-card alt";
    card.innerHTML = `
      <div class="row">
        <div class="label">Image ${idx+1}</div>
        <div class="muted">${iss.filename}</div>
      </div>
      <div class="issue-meta">
        ${iss.caption ? `<div class="muted">Nearby: ${iss.caption}</div>` : ""}
        <div class="muted">Source: ${iss.src}</div>
      </div>
      <div class="suggestion" id="altsug-${idx}">
        <div class="muted">AI alt not requested.</div>
      </div>
      <div style="margin-top:8px;">
        <button class="small-btn" id="aiAltBtn-${idx}">AI Generate Alt</button>
        <button class="small-btn" id="applyAlt-${idx}">Apply Alt (Preview)</button>
      </div>
    `;
    devList.appendChild(card);

    setTimeout(() => {
      const aiAlt = document.getElementById(`aiAltBtn-${idx}`);
      const applyAlt = document.getElementById(`applyAlt-${idx}`);
      if(aiAlt) aiAlt.addEventListener("click", () => requestAISuggestionAlt(iss, idx));
      if(applyAlt) applyAlt.addEventListener("click", () => previewApplyAlt(iss, idx));
    }, 10);
  });

  patchBox.textContent = generatePatchText(resp);
}

function generatePatchText(resp){
  let css = "/* PurePath suggested accessibility patch (manual apply) */\n";
  const items = resp.colorIssues || [];
  items.slice(0,40).forEach((it) => {
    css += `/* ${it.tag} - contrast ${Number(it.ratio).toFixed(2)} */\n/* Suggest: use a darker text color like #111111 or an AI-suggested color. */\n\n`;
  });
  let altPatch = "\n/* Alt text suggestions (use with AI output) */\n";
  (resp.altIssues || []).slice(0,40).forEach((it) => {
    altPatch += `/* ${it.filename} -> alt: "(AI suggested description)" */\n`;
  });
  return css + altPatch;
}

// --- User UI ---
function renderUserResults(resp){
  const totals = resp.totals || {};
  const shown = (resp.colorIssues || []).length + (resp.altIssues || []).length;
  userResult.style.display = "block";
  userResult.textContent = `Found ${totals.combinedTotal || shown} accessibility issues (showing top ${shown}). Presets improve readability without changing website code.`;
}

// apply single preset
async function applyPreset(preset){
  const tab = await getActiveTab();
  if(!tab || !tab.id) return showNote("No active tab.");
  chrome.tabs.sendMessage(tab.id, { command: "apply_preset", preset }, (r) => {
    if(chrome.runtime.lastError) showNote("Preset could not be applied on this page.");
    else showNote(`Preset applied: ${preset}.`);
  });
}

// Fix It For Me – combo
async function userFixIt(){
  const tab = await getActiveTab();
  if(!tab || !tab.id) return showNote("No active tab.");
  showNote("Applying high contrast, large text, and a default color-blind mode...");

  const apply = (preset) =>
    chrome.tabs.sendMessage(tab.id, { command: "apply_preset", preset }, () => {});

  apply("high-contrast");
  apply("large-text");
  apply("cb-deuteranopia"); // default most common red–green type
  apply("highlight");

  // light alt enhancement for users
  chrome.tabs.sendMessage(tab.id, { command: "collect_issues", limit: 200 }, async (resp) => {
    if(chrome.runtime.lastError || !resp){
      showNote("Visual fixes applied. Use Restore to undo.");
      return;
    }
    const altIssues = resp.altIssues || [];
    const sample = altIssues.slice(0,10);
    for(const iss of sample){
      const ai = await callAI({ type: "alt", data: { filename: iss.filename, caption: iss.caption || "" } });
      let altText = ai?.ai || "";
      if(typeof altText !== "string") altText = String(altText);
      altText = altText.split("\n")[0].slice(0,240);
      chrome.tabs.sendMessage(tab.id, { command: "inject_alt", nodeXPath: iss.nodeXPath, alt: altText }, () => {});
    }
    showNote("Accessibility view applied. Use Restore to return to original.");
  });
}

// --- AI helpers ---

async function requestAISuggestionColor(issue, idx){
  const sugBox = document.getElementById(`suggest-${idx}`);
  if(sugBox) sugBox.innerHTML = `<div class="muted">Requesting AI suggestion…</div>`;
  const res = await callAI({ type: "color", data: { fg: issue.fg, bg: issue.bg, tag: issue.tag, ratio: issue.ratio } });
  if(res?.error){
    if(sugBox) sugBox.innerHTML = `<div class="muted">AI error: ${res.error}</div>`;
    return;
  }
  const txt = res?.ai || "";
  try {
    const parsed = JSON.parse(txt);
    if(Array.isArray(parsed) && parsed.length){
      const s = parsed[0];
      if(sugBox) sugBox.innerHTML = `
        <div><strong>Suggested:</strong> ${s.hex} (contrast ${s.new_contrast})</div>
        <div class="copy-box">${s.css_snippet}</div>
        <div class="muted">${s.explain}</div>
      `;
      return;
    }
  } catch(e){}
  if(sugBox) sugBox.innerHTML = `<pre style="white-space:pre-wrap">${txt}</pre>`;
}

async function previewColorFix(issue){
  const tab = await getActiveTab();
  if(!tab || !tab.id) return showNote("No active tab.");
  const fallback = Number(issue.ratio) < 1.6 ? "#000000" : "#111111";
  const css = `${issue.tag} { color: ${fallback} !important; }`;
  chrome.tabs.sendMessage(tab.id, { command: "apply_preview_css", css }, () => {
    if(chrome.runtime.lastError) showNote("Preview could not be applied.");
    else showNote("Preview applied on page.");
  });
}

async function requestAISuggestionAlt(issue, idx){
  const box = document.getElementById(`altsug-${idx}`);
  if(box) box.innerHTML = `<div class="muted">Requesting AI alt…</div>`;
  const res = await callAI({ type: "alt", data: { filename: issue.filename, caption: issue.caption || "" } });
  if(res?.error){
    if(box) box.innerHTML = `<div class="muted">AI error: ${res.error}</div>`;
    return;
  }
  const txt = res?.ai || "";
  if(box) box.innerHTML = `<div class="muted">Alt:</div><div class="copy-box">${txt}</div>`;
}

async function previewApplyAlt(issue){
  const tab = await getActiveTab();
  if(!tab || !tab.id) return showNote("No active tab.");
  const res = await callAI({ type: "alt", data: { filename: issue.filename, caption: issue.caption || "" } });
  const alt = (res?.ai || "").toString().slice(0,240);
  chrome.tabs.sendMessage(tab.id, { command: "inject_alt", nodeXPath: issue.nodeXPath, alt }, () => {
    if(chrome.runtime.lastError) showNote("Could not inject alt.");
    else showNote("Alt injected (preview). Use Restore to undo.");
  });
}

function callAI(payload){
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "aiSuggest", payload }, (resp) => {
      resolve(resp || {});
    });
  });
}

function getActiveTab(){
  return new Promise(res => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      res(tabs && tabs[0]);
    });
  });
}
