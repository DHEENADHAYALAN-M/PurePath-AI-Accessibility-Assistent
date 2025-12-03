// background.js - handles OpenAI calls + API key storage

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if(!msg || !msg.action) return;

  if(msg.action === "setApiKey"){
    chrome.storage.local.set({ OPENAI_API_KEY: msg.key }, () => sendResponse({ ok: true }));
    return true;
  }

  if(msg.action === "getApiKey"){
    chrome.storage.local.get(["OPENAI_API_KEY"], (res) => sendResponse({ key: res.OPENAI_API_KEY || null }));
    return true;
  }

  if(msg.action === "aiSuggest"){
    chrome.storage.local.get(["OPENAI_API_KEY"], async (res) => {
      const key = res.OPENAI_API_KEY;
      if(!key){
        sendResponse({ error: "NO_API_KEY" });
        return;
      }

      let prompt = "";
      if(msg.payload.type === "color"){
        const d = msg.payload.data;
        prompt = `You are an accessibility assistant. A webpage element has foreground ${d.fg} on background ${d.bg} and fails WCAG contrast. Suggest up to 2 accessible foreground hex colors that will pass WCAG AA for normal text (4.5+) and for large text (3.0+). Return a JSON array (no extra text). Each item: { "hex": "#xxxxxx", "new_contrast": 4.6, "css_snippet": "selector { color: #xxxxxx; }", "explain": "..." }.`;
      } else if(msg.payload.type === "alt"){
        const d = msg.payload.data;
        prompt = `You are an accessibility assistant. Provide one concise descriptive alt text for an image. Context: filename: "${d.filename}". Nearby caption/text: "${d.caption || ''}". Return plain alt text only.`;
      } else {
        sendResponse({ error: "UNKNOWN_TYPE" });
        return;
      }

      try {
        const resp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + key
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 300,
            temperature: 0.2
          })
        });
        const j = await resp.json();
        const content = j?.choices?.[0]?.message?.content || "";
        sendResponse({ ai: content });
      } catch(err){
        sendResponse({ error: String(err) });
      }
    });
    return true;
  }
});
