// content.js - scans page + applies user presets
(function(){
  let appliedStyleElement = null;
  let appliedInlineNodes = [];

  const NAMED_COLORS = {
    black:"#000000", white:"#FFFFFF", red:"#FF0000", green:"#008000", blue:"#0000FF",
    yellow:"#FFFF00", orange:"#FFA500", gray:"#808080", grey:"#808080", silver:"#C0C0C0",
    lime:"#00FF00", navy:"#000080", teal:"#008080", maroon:"#800000", purple:"#800080"
  };

  function hslToHex(h, s, l){
    h = (parseFloat(h) % 360 + 360) % 360;
    s = parseFloat(s)/100;
    l = parseFloat(l)/100;
    const c = (1 - Math.abs(2*l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c/2;
    let r=0,g=0,b=0;
    if(h < 60){ r=c; g=x; b=0; }
    else if(h < 120){ r=x; g=c; b=0; }
    else if(h < 180){ r=0; g=c; b=x; }
    else if(h < 240){ r=0; g=x; b=c; }
    else if(h < 300){ r=x; g=0; b=c; }
    else{ r=c; g=0; b=x; }
    const to255 = v => Math.round((v+m)*255);
    const hex = (n) => ("0"+n.toString(16)).slice(-2);
    return "#" + hex(to255(r)) + hex(to255(g)) + hex(to255(b));
  }

  // supports: hex, rgb/rgba, hsl/hsla, named
  function styleColorToHex(styleVal){
    if(!styleVal) return null;
    styleVal = styleVal.trim().toLowerCase();
    if(styleVal === "transparent" || styleVal === "inherit" || styleVal === "currentcolor") return null;

    // rgb / rgba
    let m = styleVal.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if(m){
      return "#" + [m[1],m[2],m[3]].map(x => ("0"+(parseInt(x)).toString(16)).slice(-2)).join("").toUpperCase();
    }

    // hsl / hsla
    m = styleVal.match(/hsla?\((\d+),\s*(\d+)%?,\s*(\d+)%?/i);
    if(m){
      return hslToHex(m[1], m[2], m[3]).toUpperCase();
    }

    // hex
    if(/^#[0-9a-f]{3,6}$/i.test(styleVal)){
      let hex = styleVal.toUpperCase();
      if(hex.length === 4){ // #rgb
        hex = "#" + hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3];
      }
      return hex;
    }

    // named colors
    if(NAMED_COLORS[styleVal]) return NAMED_COLORS[styleVal];

    // gradients or others: ignore, will fall back
    if(styleVal.startsWith("linear-gradient") || styleVal.startsWith("radial-gradient")) return null;

    return null;
  }

  function isVisible(el){
    try {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width>0 && rect.height>0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        parseFloat(style.opacity || "1") > 0;
    } catch(e){ return false; }
  }

  function textSample(el){
    const t = (el.innerText || el.textContent || "").trim();
    return t.length>0 ? t.replace(/\s+/g," ").slice(0,160) : null;
  }

  function getXPathForElement(el) {
    const idx = (sib, name) => sib ? (Array.from(sib.parentNode.childNodes).filter(n => n.nodeName === name).indexOf(sib) + 1) : 1;
    let segs = [];
    for (; el && el.nodeType == 1; el = el.parentNode) {
      if (el.id) {
        segs.unshift('id("' + el.id + '")');
        break;
      } else {
        let i = idx(el, el.nodeName);
        segs.unshift(el.nodeName.toLowerCase() + '[' + i + ']');
      }
    }
    return segs.length ? '/' + segs.join('/') : null;
  }

  function getElementByXPath(path){
    try {
      return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    } catch(e){ return null; }
  }

  function hexToRgbLocal(hex) {
    hex = hex.replace("#","");
    if(hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
    return [parseInt(hex.substr(0,2),16), parseInt(hex.substr(2,2),16), parseInt(hex.substr(4,2),16)];
  }

  function contrastRatioLocal(a,b){
    const L = (rgb) => {
      let [r,g,b] = rgb.map(n=>n/255);
      r = r<=0.03928 ? r/12.92 : Math.pow((r+0.055)/1.055,2.4);
      g = g<=0.03928 ? g/12.92 : Math.pow((g+0.055)/1.055,2.4);
      b = b<=0.03928 ? b/12.92 : Math.pow((b+0.055)/1.055,2.4);
      return 0.2126*r + 0.7152*g + 0.0722*b;
    };
    const L1 = L(a), L2 = L(b);
    const bright = Math.max(L1,L2), dark = Math.min(L1,L2);
    return (bright + 0.05)/(dark + 0.05);
  }

  function collectContrastIssues(limit=500){
    const nodes = Array.from(document.querySelectorAll("body *"));
    const issues = [];
    const seenKeys = new Set();

    for(const el of nodes){
      try {
        if(!isVisible(el)) continue;

        const text = textSample(el);
        if(!text || text.length < 5) continue; // skip very tiny

        const cs = window.getComputedStyle(el);
        const fontSize = parseFloat(cs.fontSize || "14");
        if(fontSize < 11) continue; // skip very small UI bits

        const fg = styleColorToHex(cs.color);
        let bg = styleColorToHex(cs.backgroundColor);
        let parent = el;
        while((!bg) && parent.parentElement){
          parent = parent.parentElement;
          bg = styleColorToHex(window.getComputedStyle(parent).backgroundColor);
        }
        if(!bg) bg = "#FFFFFF";
        if(!fg) continue;

        const fa = hexToRgbLocal(fg);
        const ba = hexToRgbLocal(bg);
        if(!fa || !ba) continue;

        const ratio = contrastRatioLocal(fa, ba);
        const fontWeight = parseInt(cs.fontWeight || "400");
        const isLarge = (fontSize >= 18 || (fontWeight >= 700 && fontSize >= 14));
        const pass = isLarge ? ratio >= 3.0 : ratio >= 4.5;
        if(pass) continue;

        let selector = el.tagName.toLowerCase();
        if(el.id) selector += "#" + el.id;
        else if(el.className && typeof el.className === "string"){
          const classes = el.className.trim().split(/\s+/).slice(0,2).join(".");
          if(classes) selector += "." + classes;
        }

        const key = `${selector}|${fg}|${bg}|${text.slice(0,40)}`;
        if(seenKeys.has(key)) continue;
        seenKeys.add(key);

        issues.push({
          nodeXPath: getXPathForElement(el),
          tag: selector,
          text: text,
          fg: fg,
          bg: bg,
          ratio: Number(ratio.toFixed(2)),
          isLarge: isLarge
        });
      } catch(e){}
      if(issues.length >= limit) break;
    }
    return issues;
  }

  function getNearbyText(el){
    const title = el.getAttribute("title");
    if(title) return title.slice(0,160);
    const aria = el.getAttribute("aria-label");
    if(aria) return aria.slice(0,160);
    let prev = el.previousElementSibling;
    while(prev){
      const t = (prev.innerText || "").trim();
      if(t) return t.slice(0,160);
      prev = prev.previousElementSibling;
    }
    return "";
  }

  function collectAltIssues(limit=300){
    const imgs = Array.from(document.querySelectorAll("img"));
    const issues = [];
    for(const img of imgs){
      try {
        if(!isVisible(img)) continue;
        const alt = img.getAttribute("alt");
        if(alt && alt.trim().length > 2) continue;
        issues.push({
          nodeXPath: getXPathForElement(img),
          src: img.src || "",
          filename: (img.src || "").split("/").pop() || "image",
          caption: getNearbyText(img)
        });
      } catch(e){}
      if(issues.length >= limit) break;
    }
    return issues;
  }

  function applyCssOverride(cssText){
    removeOverrides();
    appliedStyleElement = document.createElement("style");
    appliedStyleElement.setAttribute("data-purepath","override");
    appliedStyleElement.textContent = cssText;
    (document.head || document.documentElement).appendChild(appliedStyleElement);
  }

  function injectAltText(nodeXPath, altText){
    const el = getElementByXPath(nodeXPath);
    if(!el) return false;
    appliedInlineNodes.push({ el: el, prevAlt: el.getAttribute("alt") });
    try {
      el.setAttribute("alt", altText);
      return true;
    } catch(e){ return false; }
  }

  function removeOverrides(){
    try {
      if(appliedStyleElement){
        appliedStyleElement.remove();
        appliedStyleElement = null;
      }
      if(appliedInlineNodes && appliedInlineNodes.length){
        for(const obj of appliedInlineNodes){
          try {
            if(obj.prevAlt === null) obj.el.removeAttribute("alt");
            else obj.el.setAttribute("alt", obj.prevAlt);
          } catch(e){}
        }
        appliedInlineNodes = [];
      }
    } catch(e){}
  }

  // User-mode presets
  const presets = {
    "high-contrast": `
      html, body {
        background: #FFFFFF !important;
        color: #000000 !important;
        filter: none !important;
      }
      * {
        text-shadow: none !important;
      }
      a, button {
        color: #0b69ff !important;
        font-weight: 700 !important;
      }
      button, input, select, textarea {
        background-color: #FFFFFF !important;
        color: #000000 !important;
        border: 1px solid #111827 !important;
        outline: 3px solid #0b69ff !important;
        outline-offset: 2px !important;
      }
    `,
    "large-text": `
      body * {
        font-size: 1.15em !important;
        line-height: 1.6 !important;
      }
    `,
    "cb-protanopia": `
      html, body {
        filter: contrast(1.15) saturate(1.1) hue-rotate(-15deg) !important;
      }
      a, button {
        color: #0044cc !important;
      }
    `,
    "cb-deuteranopia": `
      html, body {
        filter: contrast(1.15) saturate(1.05) hue-rotate(15deg) !important;
      }
      a, button {
        color: #0044cc !important;
      }
    `,
    "cb-tritanopia": `
      html, body {
        filter: contrast(1.2) saturate(1.1) hue-rotate(135deg) !important;
      }
      a, button {
        color: #0044cc !important;
      }
    `,
    "highlight": `
      p, li {
        background: #fffce0 !important;
      }
      p:hover, li:hover {
        background: #facc15 !important;
      }
    `
  };

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    try {
      if(!msg || !msg.command) { sendResponse({ ok:false }); return; }

      if(msg.command === "collect_issues"){
        const fullColor = collectContrastIssues(msg.limit || 500);
        const fullAlt = collectAltIssues(msg.limit || 300);

        const totals = {
          colorTotal: fullColor.length,
          altTotal: fullAlt.length,
          combinedTotal: fullColor.length + fullAlt.length
        };

        const MAX_DISPLAY = 150;
        const displayColor = fullColor.slice(0, MAX_DISPLAY);
        const displayAlt = fullAlt.slice(0, MAX_DISPLAY);

        sendResponse({ colorIssues: displayColor, altIssues: displayAlt, totals });
        return true;

      } else if(msg.command === "apply_preview_css"){
        applyCssOverride(msg.css || "");
        sendResponse({ ok: true });
        return;

      } else if(msg.command === "inject_alt"){
        const ok = injectAltText(msg.nodeXPath, msg.alt || "");
        sendResponse({ ok: !!ok });
        return;

      } else if(msg.command === "apply_preset"){
        const presetCss = presets[msg.preset] || "";
        applyCssOverride(presetCss);
        sendResponse({ ok: true });
        return;

      } else if(msg.command === "restore"){
        removeOverrides();
        sendResponse({ ok: true });
        return;

      } else {
        sendResponse({ ok:false });
        return;
      }
    } catch(e){
      sendResponse({ ok:false, error: String(e) });
      return;
    }
  });

})();
