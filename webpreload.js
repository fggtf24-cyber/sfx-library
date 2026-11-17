// Preload for the hidden site tabs (web search). Runs before the page's own scripts.
// 1. Every site: reports which audio file the page puts into a media element (its own player), so web search can
//    play / save that preview. (Done here rather than with a network listener in the main process: such a listener
//    would switch off the built-in uBlock Origin.)
// 2. YouTube: keeps a copy of the audio the player feeds into MediaSource, so web search can take a video's sound as
//    soon as it is buffered (a few seconds, silently) instead of playing it through in real time.
const { webFrame, ipcRenderer } = require('electron');

function mediaHook() {
  const post = u => { try { const s = String(u || ''); if (s && !/^(blob|data):/.test(s)) window.postMessage({ __sfxMedia: new URL(s, location.href).href }, '*'); } catch {} };
  const P = HTMLMediaElement.prototype, src = Object.getOwnPropertyDescriptor(P, 'src');
  Object.defineProperty(P, 'src', { configurable: true, get() { return src.get.call(this); }, set(v) { post(v); src.set.call(this, v); } });
  const play = P.play;
  P.play = function () { post(this.currentSrc || this.src); return play.apply(this, arguments); };
  const setAttr = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (n, v) { if (n === 'src' && (this instanceof HTMLMediaElement || this instanceof HTMLSourceElement)) post(v); return setAttr.apply(this, arguments); };
}

function youtubeHook() {
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

webFrame.executeJavaScript('(' + mediaHook + ')()');
if (/(^|\.)youtube\.com$/.test(location.hostname)) webFrame.executeJavaScript('(' + youtubeHook + ')()');
// main world -> app: the page can't reach ipc, this preload (isolated world) passes the URL on to the embedding page
window.addEventListener('message', e => { if (e.source === window && e.data && e.data.__sfxMedia) ipcRenderer.sendToHost('media', e.data.__sfxMedia); });
