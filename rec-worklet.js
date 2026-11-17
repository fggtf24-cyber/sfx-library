// Recording tap that runs on the audio thread (AudioWorklet). The old ScriptProcessor ran on the UI thread,
// so any busy moment there dropped buffers and the take got "tick-tick" clicks.
// Collects stereo float frames and posts them to the page in ~4096-frame chunks (or on 'flush').
class SfxRec extends AudioWorkletProcessor {
  constructor() {
    super();
    this.L = []; this.R = []; this.n = 0;
    this.port.onmessage = e => { if (e.data === 'flush') { this.flush(); this.port.postMessage('flushed'); } };
  }
  flush() {
    if (!this.n) return;
    const L = new Float32Array(this.n), R = new Float32Array(this.n);
    let o = 0;
    for (let i = 0; i < this.L.length; i++) { L.set(this.L[i], o); R.set(this.R[i], o); o += this.L[i].length; }
    this.L = []; this.R = []; this.n = 0;
    this.port.postMessage({ L, R }, [L.buffer, R.buffer]);
  }
  process(inputs) {
    const inp = inputs[0];
    if (inp && inp.length) {
      const a = inp[0], b = inp[1] || inp[0];
      this.L.push(a.slice()); this.R.push(b.slice()); this.n += a.length;
      if (this.n >= 4096) this.flush();
    }
    return true;
  }
}
registerProcessor('sfx-rec', SfxRec);
