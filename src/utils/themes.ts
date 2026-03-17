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
  'Violet': { dark: { sidebar: '#2d2438', settings: '#1a1621', accent: '#7c3aed', active: '#8b5cf6' }, light: { sidebar: '#f5f3ff', settings: '#faf9ff', accent: '#a78bfa', active: '#8b5cf6' } },
    'Orange': { dark: { sidebar: '#382a24', settings: '#211916', accent: '#ea580c', active: '#f97316' }, light: { sidebar: '#fff7ed', settings: '#fffaf5', accent: '#fb923c', active: '#f97316' } },
    'Green': { dark: { sidebar: '#243829', settings: '#162119', accent: '#16a34a', active: '#22c55e' }, light: { sidebar: '#f0fdf4', settings: '#f8faf9', accent: '#4ade80', active: '#22c55e' } },
    'Yellow': { dark: { sidebar: '#383424', settings: '#211f16', accent: '#ca8a04', active: '#eab308' }, light: { sidebar: '#fefce8', settings: '#fffef0', accent: '#facc15', active: '#eab308' } },
    'Slate': { dark: { sidebar: '#242a38', settings: '#161921', accent: '#475569', active: '#64748b' }, light: { sidebar: '#f8fafc', settings: '#fbfcfd', accent: '#94a3b8', active: '#64748b' } },
    'Stone': { dark: { sidebar: '#2e2c2a', settings: '#1c1b1a', accent: '#57534e', active: '#78716c' }, light: { sidebar: '#fafaf9', settings: '#fdfdfc', accent: '#a8a29e', active: '#78716c' } },
    'Gray': { dark: { sidebar: '#27272a', settings: '#18181b', accent: '#4b5563', active: '#6b7280' }, light: { sidebar: '#f4f4f5', settings: '#fafafa', accent: '#9ca3af', active: '#6b7280' } },
    'Neutral': { dark: { sidebar: '#262626', settings: '#171717', accent: '#525252', active: '#737373' }, light: { sidebar: '#f5f5f5', settings: '#fafafa', accent: '#a3a3a3', active: '#737373' } },
    'Red': { dark: { sidebar: '#382424', settings: '#211616', accent: '#dc2626', active: '#ef4444' }, light: { sidebar: '#fef2f2', settings: '#fff8f8', accent: '#f87171', active: '#ef4444' } },
    'Rose': { dark: { sidebar: '#38242d', settings: '#21161a', accent: '#e11d48', active: '#f43f5e' }, light: { sidebar: '#fff1f2', settings: '#fff8f9', accent: '#fb7185', active: '#f43f5e' } },
    'Blue': { dark: { sidebar: '#242c38', settings: '#161a21', accent: '#2563eb', active: '#3b82f6' }, light: { sidebar: '#eff6ff', settings: '#f8fbff', accent: '#60a5fa', active: '#3b82f6' } }
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
