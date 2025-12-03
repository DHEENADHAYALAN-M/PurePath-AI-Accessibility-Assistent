**PurePath – AI Accessibility Assistant (Chrome Extension)**

AI-powered Chrome extension that detects accessibility issues, fixes color contrast, generates alt text, and provides one-click accessible views for color-blind and low-vision users.

**⭐ Overview**

PurePath is an AI-driven accessibility tool designed for developers and end-users.
It scans any webpage, detects WCAG accessibility issues, and provides AI-powered fixes like contrast correction, safe color suggestions, and automatic alt-text generation.

For users, PurePath offers one-click accessibility modes such as high contrast, large text, and color-blind safe filters — making any website readable instantly.

Built for the real world. Designed for impact.

**🎯 Key Features**
  **🔍 Developer Mode**

  Full-page accessibility scan

  Contrast ratio analysis (WCAG AA/AAA)

  Detects missing or incorrect alt text

  Smart severity scoring

  AI-powered color suggestions

  AI-generated alt text

  Preview fixes directly on the webpage

  No backend — everything runs client-side

  **👁‍🗨 User Mode (One-Click Assistive View)**

  High Contrast Mode

  Large Text Mode

  Color-blind safe filters

  Protanopia

  Deuteranopia

  Tritanopia

  Text Highlight Mode

“Fix It For Me” → instantly applies a safe & readable combination of presets

Improves readability without modifying the website’s source

**🧠 AI Capabilities**

  Suggests WCAG-compliant color fixes
  
  Generates descriptive, context-aware alt text
  
  Automatically enhances accessibility for images
  
  Uses OpenAI API (key stored locally only)

**🧩 How It Works**

  1.Install extension → Load any webpage
  
  2.Choose Developer Mode or User Mode
  
  3.Scan the page (Developer Mode)
  
  4.View issues → Apply AI suggestions
  
  5.Or switch to User Mode → Apply one-click readability presets
  
  6.Use Restore anytime to return to original page

**📦 Installation (Developer Setup)**
1️⃣ Clone or download this repository
  git clone https://github.com/DHEENADHAYALAN-M/PurePath-AI-Accessibility-Assistent.git

2️⃣ Open Chrome → visit:
  chrome://extensions

3️⃣ Enable Developer Mode (top right)
4️⃣ Click Load Unpacked
5️⃣ Select the project folder

You should now see PurePath in your extensions list.

**🔑 OpenAI API Key (Optional for AI features)**

PurePath works without AI, but AI features require a key.

1.Get API key from: https://platform.openai.com

2.Paste it inside the extension popup

3.Click Save

The key is stored locally only — never uploaded.

**📁 Project Structure**
  PurePath/
  │── background.js
  │── content.js
  │── popup.html
  │── popup.js
  │── popup.css
  │── utils.js
  │── manifest.json
  │── icon.png
  │── README.md
  │── LICENSE

**🔮 Future Enhancements**

  AI-driven color-blind variant detection per user
  
  PDF & mobile accessibility scanning
  
  Real-time voice guidance for visually impaired users
  
  WCAG severity-based scoring system
  
  Team accessibility dashboard for developers
  
  Auto-generate WCAG-safe color palettes

**👨‍💻 Tech Stack**

  JavaScript
  
  Manifest V3 (Chrome Extensions)
  
  OpenAI API
  
  WCAG 2.2 Guidelines
  
  Client-side DOM Analysis

**🏆 Why PurePath?**

Most websites fail color contrast or alt text guidelines, creating barriers for 300M+ color-blind and visually impaired users.
PurePath bridges that gap with instant AI-powered accessibility, making the web clearer, readable, and inclusive.

**👥 Team Damnex**

Built with passion for accessibility & inclusivity.
Made by students who believe the web should be for everyone.

**📄 License**

This project is licensed under the MIT License – free to use, modify, and contribute.
