// Preload for the hidden site tabs (web search). Runs before the page's own scripts.
// On YouTube it keeps a copy of the audio the player feeds into MediaSource, so web search can take a video's
// sound as soon as it is buffered (a few seconds, silently) instead of playing it through in real time.
const { webFrame } = require('electron');

function hook() {
  const sources = window.__sfxMS = new Map(); // blob URL -> { ms, audio: { mime, sb, chunks } }
  const createURL = URL.createObjectURL;
  URL.createObjectURL = function (o) {
    const u = createURL.apply(this, arguments);
    if (typeof MediaSource !== 'undefined' && o instanceof MediaSource) sources.set(u, { ms: o, audio: null });
    return u;
  };
  const addSB = MediaSource.prototype.addSourceBuffer;
  MediaSource.prototype.addSourceBuffer = function (mime) {
    const sb = addSB.apply(this, arguments);
    if (/^audio\//i.test(mime)) {
      sb.__sfxAudio = { mime, sb, chunks: [] };
      for (const v of sources.values()) if (v.ms === this) v.audio = sb.__sfxAudio;
    }
    return sb;
  };
  const append = SourceBuffer.prototype.appendBuffer;
  SourceBuffer.prototype.appendBuffer = function (data) {
    try {
      const a = this.__sfxAudio;
      if (a) a.chunks.push(data instanceof ArrayBuffer ? new Uint8Array(data.slice(0)) : new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)));
    } catch {}
    return append.apply(this, arguments);
  };
}

if (/(^|\.)youtube\.com$/.test(location.hostname)) webFrame.executeJavaScript('(' + hook + ')()');
