// Runs in <head>: apply the saved theme before first paint, so there is no flash of the wrong one.
try {
  const m = localStorage.getItem('theme') || 'system';
  document.documentElement.dataset.theme = m === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : m;
} catch {}
