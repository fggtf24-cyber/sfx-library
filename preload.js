const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  libs: () => ipcRenderer.invoke('libs'),
  addLib: () => ipcRenderer.invoke('addLib'),
  removeLib: id => ipcRenderer.invoke('removeLib', id),
  rescan: () => ipcRenderer.invoke('rescan'),
  search: o => ipcRenderer.invoke('search', o),
  fav: (id, v) => ipcRenderer.invoke('fav', id, v),
  saveMeta: (ids, fields, toFile) => ipcRenderer.invoke('saveMeta', ids, fields, toFile),
  reveal: p => ipcRenderer.invoke('reveal', p),
  drag: o => ipcRenderer.send('drag', { ...o, minimize: document.getElementById('minDrag')?.checked }),
  onScan: cb => ipcRenderer.on('scan', (_, d) => cb(d)),
  version: () => ipcRenderer.invoke('version'),
  onUpdate: cb => ipcRenderer.on('update', (_, d) => cb(d)),
  installUpdate: () => ipcRenderer.send('installUpdate'),
});
