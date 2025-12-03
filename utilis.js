// utils.js - shared helpers if needed later

function rgbStringToHex(rgb){
  if(!rgb) return null;
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if(!m) return null;
  return "#" + [m[1],m[2],m[3]].map(x => ("0"+(parseInt(x)).toString(16)).slice(-2)).join("").toUpperCase();
}

// generic luminance helpers (not currently used by popup.js directly but kept for reuse)
function hexToRgb(hex) {
  if(!hex) return null;
  hex = hex.replace("#","");
  if(hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
  return [parseInt(hex.substr(0,2),16), parseInt(hex.substr(2,2),16), parseInt(hex.substr(4,2),16)];
}

function getLuminance([r,g,b]){
  r/=255; g/=255; b/=255;
  r = r<=0.03928 ? r/12.92 : Math.pow((r+0.055)/1.055,2.4);
  g = g<=0.03928 ? g/12.92 : Math.pow((g+0.055)/1.055,2.4);
  b = b<=0.03928 ? b/12.92 : Math.pow((b+0.055)/1.055,2.4);
  return 0.2126*r + 0.7152*g + 0.0722*b;
}

function contrastRatio(rgbA, rgbB){
  const L1 = getLuminance(rgbA);
  const L2 = getLuminance(rgbB);
  const bright = Math.max(L1,L2);
  const dark = Math.min(L1,L2);
  return (bright + 0.05) / (dark + 0.05);
}
