export function getThemeVariables(themeName: string, isDark: boolean) {
  const isDarkBase = isDark;
  
  const base = {
    '--theme-sidebar': '#33445A',
    '--theme-settings': '#1b1f24',
    '--theme-content-bg': '#28303C',
    '--theme-accent': '#3b5270',
    '--theme-active': '#517096',
    '--theme-text': '#f4f4f5',
  };

  if (themeName === 'Default') {
    if (isDarkBase) return base;
    return {
      '--theme-sidebar': '#d1d5db',
      '--theme-settings': '#f3f4f6',
      '--theme-content-bg': '#ffffff',
      '--theme-accent': '#9ca3af',
      '--theme-active': '#6b7280',
      '--theme-text': '#111827',
    };
  }

  // Simplified maps for other color themes. We map a primary tailwind color.
  const themeMap: Record<string, { dark: any, light: any }> = {
    'Violet': { dark: { sidebar: '#4c1d95', settings: '#2e1065', accent: '#6d28d9', active: '#7c3aed' }, light: { sidebar: '#c4b5fd', settings: '#ddd6fe', accent: '#a78bfa', active: '#8b5cf6' } },
    'Orange': { dark: { sidebar: '#9a3412', settings: '#7c2d12', accent: '#c2410c', active: '#f97316' }, light: { sidebar: '#fdba74', settings: '#fed7aa', accent: '#fb923c', active: '#f97316' } },
    'Green': { dark: { sidebar: '#166534', settings: '#14532d', accent: '#15803d', active: '#22c55e' }, light: { sidebar: '#86efac', settings: '#bbf7d0', accent: '#4ade80', active: '#22c55e' } },
    'Yellow': { dark: { sidebar: '#854d0e', settings: '#713f12', accent: '#a16207', active: '#eab308' }, light: { sidebar: '#fde047', settings: '#fef08a', accent: '#facc15', active: '#eab308' } },
    'Slate': { dark: { sidebar: '#334155', settings: '#0f172a', accent: '#475569', active: '#64748b' }, light: { sidebar: '#cbd5e1', settings: '#e2e8f0', accent: '#94a3b8', active: '#64748b' } },
    'Stone': { dark: { sidebar: '#44403c', settings: '#1c1917', accent: '#57534e', active: '#78716c' }, light: { sidebar: '#d6d3d1', settings: '#e7e5e4', accent: '#a8a29e', active: '#78716c' } },
    'Gray': { dark: { sidebar: '#374151', settings: '#111827', accent: '#4b5563', active: '#6b7280' }, light: { sidebar: '#d1d5db', settings: '#e5e7eb', accent: '#9ca3af', active: '#6b7280' } },
    'Neutral': { dark: { sidebar: '#404040', settings: '#171717', accent: '#525252', active: '#737373' }, light: { sidebar: '#d4d4d4', settings: '#e5e5e5', accent: '#a3a3a3', active: '#737373' } },
    'Red': { dark: { sidebar: '#991b1b', settings: '#7f1d1d', accent: '#b91c1c', active: '#ef4444' }, light: { sidebar: '#fca5a5', settings: '#fecaca', accent: '#f87171', active: '#ef4444' } },
    'Rose': { dark: { sidebar: '#be123c', settings: '#881337', accent: '#e11d48', active: '#f43f5e' }, light: { sidebar: '#fda4af', settings: '#fecdd3', accent: '#fb7185', active: '#f43f5e' } },
    'Blue': { dark: { sidebar: '#1e3a8a', settings: '#172554', accent: '#1d4ed8', active: '#3b82f6' }, light: { sidebar: '#93c5fd', settings: '#bfdbfe', accent: '#60a5fa', active: '#3b82f6' } }
  };

  const selected = themeMap[themeName];
  if (!selected) return base;

  const mode = isDarkBase ? selected.dark : selected.light;
  return {
    '--theme-sidebar': mode.sidebar,
    '--theme-settings': mode.settings,
    '--theme-content-bg': isDarkBase ? mode.settings : '#ffffff',
    '--theme-accent': mode.accent,
    '--theme-active': mode.active,
    '--theme-text': isDarkBase ? '#f4f4f5' : '#111827',
  };
}
