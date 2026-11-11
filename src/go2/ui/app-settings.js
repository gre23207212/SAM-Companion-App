const settings = { shouldEmit: (_c) => localStorage.getItem('sam-debug-logs') === '1' };
export function appSettings() { return settings; }
