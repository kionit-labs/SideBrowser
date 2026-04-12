import { useState, useMemo, useRef, useEffect } from 'react';
import { Minus, Plus, ChevronRight, Search, Upload, Trash2, Key, ExternalLink, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { useSettings, useTranslation } from './contexts/SettingsContext';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('General');
  const { settings, updateSetting } = useSettings();
  const { t } = useTranslation();
  
  const [appVersion, setAppVersion] = useState<string>('...');
  const [updateStatus, setUpdateStatus] = useState<{msg: string, isError: boolean} | null>(null);

  const tabs = [
    { id: 'General', label: t('tab.general') },
    { id: 'Window', label: t('tab.window') },
    ...(settings.passwordManagerEnabled ? [{ id: 'Passwords', label: t('tab.passwords') }] : []),
    { id: 'Updates', label: t('tab.updates') },
    { id: 'Shortcuts', label: t('tab.shortcuts') }
  ];
  
  const [searchQuery, setSearchQuery] = useState('');
  const [passwords, setPasswords] = useState<any[]>([]);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const togglePasswordVisibility = (id: number) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    if (activeTab === 'Passwords') {
      (window as any).electronAPI.getPasswords().then(setPasswords);
    }
    
    if (activeTab === 'Updates') {
      if ((window as any).electronAPI) {
        (window as any).electronAPI.getAppVersion().then(setAppVersion);
        (window as any).electronAPI.onUpdateMessage((msg: string, isError: boolean) => {
          setUpdateStatus({ msg, isError });
        });
      }
    }
    
    return () => {
      if (activeTab === 'Updates' && (window as any).electronAPI) {
        (window as any).electronAPI.removeAllListeners('update-message');
      }
    };
  }, [activeTab]);

  const filteredPasswords = useMemo(() => {
    return passwords.filter(p => 
      p.url?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [passwords, searchQuery]);

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newPasswords = [...passwords];
      
      // Basic CSV parsing (name, url, username, password)
      // Standard Chrome format: name,url,username,password
      lines.forEach((line, index) => {
        if (index === 0 && (line.toLowerCase().includes('name') || line.toLowerCase().includes('url'))) return; // Skip header
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 4) {
          newPasswords.push({
            id: Date.now() + Math.random(),
            name: parts[0],
            url: parts[1],
            username: parts[2],
            password: parts[3]
          });
        }
      });
      
      setPasswords(newPasswords);
      (window as any).electronAPI.savePasswords(newPasswords);
    };
    reader.readAsText(file);
  };

  const deletePassword = (id: number) => {
    const fresh = passwords.filter(p => p.id !== id);
    setPasswords(fresh);
    (window as any).electronAPI.savePasswords(fresh);
  };

  const SelectItem = ({ label, subtitle, options, value, onChange, optionLabels }: any) => (
    <div className="flex flex-col py-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors px-4 -mx-4 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-[var(--theme-text)] opacity-90">{label}</h3>
        <select 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-zinc-800/40 border border-zinc-700/30 text-[var(--theme-text)] text-sm rounded-md px-3 py-1.5 outline-none focus:ring-1 focus:ring-blue-500/50 min-w-[120px]">
          {options.map((opt: string, i: number) => <option key={opt} value={opt} className="bg-zinc-900 text-white">{optionLabels ? optionLabels[i] : opt}</option>)}
        </select>
      </div>
      {subtitle && <p className="text-[13px] text-zinc-500 mt-2">{subtitle}</p>}
    </div>
  );

  const ToggleItem = ({ label, subtitle, enabled, onToggle }: any) => (
    <div className="flex flex-col py-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors px-4 -mx-4 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-[var(--theme-text)] opacity-90">{label}</h3>
        <button 
          onClick={onToggle}
          className={`relative w-11 h-6 rounded-full transition-colors duration-300 border ${enabled ? 'bg-[var(--theme-accent)] border-[var(--theme-accent)]' : 'bg-zinc-800 border-zinc-700'}`}
        >
          <div className={`absolute top-[1px] left-[1px] w-5 h-5 rounded-full transition-transform duration-300 shadow-sm ${enabled ? 'translate-x-5 bg-white' : 'translate-x-0 bg-zinc-400'}`}></div>
        </button>
      </div>
      {subtitle && <p className="text-[13px] text-zinc-500 mt-1">{subtitle}</p>}
    </div>
  );

  const ShortcutRecorder = ({ label, value, onChange }: any) => {
    const [isRecording, setIsRecording] = useState(false);
    const { t } = useTranslation();

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isRecording) return;
      e.preventDefault();
      e.stopPropagation();

      const modifiers = [];
      if (e.ctrlKey) modifiers.push('Ctrl');
      if (e.altKey) modifiers.push('Alt');
      if (e.shiftKey) modifiers.push('Shift');
      if (e.metaKey) modifiers.push('Command');

      // Key mapping for common keys
      let key = e.key;
      if (key === ' ') key = 'Space';
      if (key === 'ArrowLeft') key = 'Left';
      if (key === 'ArrowRight') key = 'Right';
      if (key === 'ArrowUp') key = 'Up';
      if (key === 'ArrowDown') key = 'Down';

      if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') return;
      
      // Upper case for letters, but keep F11 etc.
      const displayKey = key.length === 1 ? key.toUpperCase() : key.charAt(0).toUpperCase() + key.slice(1);

      const shortcut = [...modifiers, displayKey].join('+');

      // Check for blocked shortcuts (In-window defaults)
      const BLOCKED = [
        'Ctrl+N', 'Ctrl+B', 'Ctrl+Tab', 'Ctrl+Shift+Tab', 
        'Ctrl+W', 'Ctrl+T', 'Ctrl+Left', 'Ctrl+Right', 
        'Ctrl++', 'Ctrl+-', 'Ctrl+0', 'Ctrl+R', 'F5', 
        'Ctrl+Shift+I', 'F12', 'Ctrl+M', 'Ctrl+,', 'Ctrl+D'
      ];
      
      const isDigit = modifiers.length === 1 && modifiers[0] === 'Ctrl' && /^[1-9]$/.test(displayKey);

      if (BLOCKED.includes(shortcut) || isDigit) {
        // You could show an alert here, but for now just stay in recording mode
        return;
      }

      onChange(shortcut);
      setIsRecording(false);
    };

    return (
      <div className="flex items-center justify-between py-3 border-b border-white/5 group transition-all">
        <span className="text-[15px] font-medium text-[var(--theme-text)] opacity-80 transition-colors pr-6">{label}</span>
        <div className="flex items-center gap-2">
          <div
            tabIndex={0}
            onClick={() => setIsRecording(true)}
            onKeyDown={handleKeyDown}
            onBlur={() => setIsRecording(false)}
            className={`bg-zinc-800/40 border border-zinc-700/30 text-[var(--theme-text)] text-sm rounded-md px-3 py-1.5 outline-none w-44 text-center shrink-0 cursor-pointer transition-all ${isRecording ? 'border-[var(--theme-accent)] ring-1 ring-[var(--theme-accent)]/30 bg-[var(--theme-accent)]/10 font-bold animate-pulse' : 'hover:bg-zinc-700/40 opacity-80'}`}
          >
            {isRecording ? t('shortcuts.global.record' as any) || 'Recording...' : (value || t('shortcuts.global.record' as any))}
          </div>
          {value && (
            <button 
              onClick={() => onChange('')}
              className="p-1.5 hover:bg-rose-500/10 text-rose-500/60 hover:text-rose-500 rounded-md transition-all"
              title="Clear"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div 
      className="w-full h-full text-[var(--theme-text)] flex flex-col font-sans"
      style={{ 
        backgroundColor: 'color-mix(in srgb, var(--theme-settings) calc(var(--transparency) * 100%), transparent)' 
      }}
    >
      {/* Settings Header */}
      {/* Settings Header - Removed no-drag to allow global drag handle on top to work */}
      <div className="px-10 pt-12 pb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--theme-text)]">{t('settings.title')}</h1>
          <button className="flex items-center gap-1 text-sm font-medium text-[var(--theme-text)] opacity-60 hover:opacity-100 transition-opacity">
            {t('settings.feedback')} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-10 pb-10" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <div className="max-w-3xl flex flex-col">
          
          {/* Tabs Group */}
          <div className="flex w-full mt-2 mb-6 border-b border-white/10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2.5 text-sm font-semibold transition-all duration-200 rounded-t-lg mx-0.5 ${
                  activeTab === tab.id 
                    ? 'bg-[var(--theme-accent)] text-white shadow-sm' 
                    : 'text-[var(--theme-text)] opacity-50 hover:opacity-100 hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

            {activeTab === 'General' && (
              <div className="flex flex-col animate-in fade-in duration-300">
                <SelectItem 
                  label={t('general.language')} 
                  options={['English', 'Türkçe', 'Deutsch']} 
                  value={settings.language}
                  onChange={(val: string) => updateSetting('language', val)}
                />
                <SelectItem 
                  label={t('general.theme')} 
                  options={['Default', 'Violet', 'Orange', 'Green', 'Yellow', 'Slate', 'Stone', 'Gray', 'Neutral', 'Red', 'Rose', 'Blue']} 
                  optionLabels={['Default', 'Violet', 'Orange', 'Green', 'Yellow', 'Slate', 'Stone', 'Gray', 'Neutral', 'Red', 'Rose', 'Blue'].map(o => t(`theme.${o.toLowerCase()}` as any))}
                  value={settings.themeColor}
                  onChange={(val: string) => updateSetting('themeColor', val)}
                />
                <SelectItem 
                  label={t('general.darkmode')} 
                  options={['System', 'Light', 'Dark']} 
                  optionLabels={['System', 'Light', 'Dark'].map(o => t(`mode.${o.toLowerCase()}` as any))}
                  value={settings.darkMode}
                  onChange={(val: string) => updateSetting('darkMode', val)}
                />
                <SelectItem 
                  label={t('general.addressbar')} 
                  options={['Hidden', 'Top', 'Bottom']} 
                  optionLabels={['Hidden', 'Top', 'Bottom'].map(o => t(`addressbar.${o.toLowerCase()}` as any))}
                  subtitle={t('general.addressbar.sub')}
                  value={settings.addressBar}
                  onChange={(val: string) => updateSetting('addressBar', val)}
                />
                
                <ToggleItem 
                  label={t('general.autolaunch')} 
                  subtitle={t('general.autolaunch.sub')} 
                  enabled={settings.autoLaunch} 
                  onToggle={() => updateSetting('autoLaunch', !settings.autoLaunch)}
                />
                <ToggleItem 
                  label={t('general.translate')} 
                  subtitle={t('general.translate.sub')} 
                  enabled={settings.translateEnabled} 
                  onToggle={() => updateSetting('translateEnabled', !settings.translateEnabled)}
                />
                <ToggleItem 
                  label={t('general.adblock')} 
                  subtitle={t('general.adblock.sub')} 
                  enabled={settings.adblockEnabled} 
                  onToggle={() => updateSetting('adblockEnabled', !settings.adblockEnabled)}
                />
                <ToggleItem 
                  label={t('general.password')} 
                  subtitle={t('general.password.sub')} 
                  enabled={settings.passwordManagerEnabled} 
                  onToggle={() => updateSetting('passwordManagerEnabled', !settings.passwordManagerEnabled)}
                />
              </div>
            )}

            {activeTab === 'Window' && (
              <div className="flex flex-col animate-in fade-in duration-300">
                <div className="flex flex-col py-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors px-4 -mx-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[15px] font-semibold text-[var(--theme-text)] opacity-90">{t('window.transparency')}</h3>
                      <p className="text-[13px] text-zinc-500 mt-1">{t('window.transparency.sub')}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <span className="text-xs font-mono text-[var(--theme-text)] opacity-60">{Math.round(settings.transparency * 100)}%</span>
                       <div className="flex items-center gap-3">
                         <button 
                            onClick={() => updateSetting('transparency', Math.max(0.3, parseFloat((settings.transparency - 0.01).toFixed(2))))}
                            className="p-1 hover:bg-white/10 rounded transition-colors text-[var(--theme-text)]"
                          >
                            <Minus size={14} />
                          </button>
                          <input 
                            type="range" 
                            min="0.3" 
                            max="1.0" 
                            step="0.05" 
                            value={settings.transparency} 
                            onChange={(e) => updateSetting('transparency', parseFloat(e.target.value))}
                            className="w-32 accent-[#3b5270] bg-zinc-800 h-1.5 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[var(--theme-color)] [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
                            style={{ accentColor: 'var(--theme-color)' }}
                          />
                          <button 
                            onClick={() => updateSetting('transparency', Math.min(1.0, parseFloat((settings.transparency + 0.01).toFixed(2))))}
                            className="p-1 hover:bg-white/10 rounded transition-colors text-[var(--theme-text)]"
                          >
                            <Plus size={14} />
                          </button>
                       </div>
                    </div>
                  </div>
                </div>

                <ToggleItem 
                  label={t('window.dynamicsidebar' as any)} 
                  subtitle={t('window.dynamicsidebar.sub' as any)} 
                  enabled={settings.dynamicSidebar} 
                  onToggle={() => updateSetting('dynamicSidebar', !settings.dynamicSidebar)}
                />
                <ToggleItem 
                  label={t('window.alwaysontop')} 
                  subtitle={t('window.alwaysontop.sub')} 
                  enabled={settings.alwaysOnTop} 
                  onToggle={() => updateSetting('alwaysOnTop', !settings.alwaysOnTop)}
                />
                <ToggleItem 
                  label={t('window.autocenter')} 
                  subtitle={t('window.autocenter.sub')} 
                  enabled={settings.autoCenter} 
                  onToggle={() => updateSetting('autoCenter', !settings.autoCenter)}
                />
                <SelectItem 
                  label={t('window.snapside')} 
                  options={['right', 'left']} 
                  optionLabels={['right', 'left'].map(o => t(`snap.${o}` as any))}
                  subtitle={t('window.snapside.sub')}
                  value={settings.defaultSnapSide}
                  onChange={(val: string) => updateSetting('defaultSnapSide', val)}
                />
              </div>
            )}            {activeTab === 'Updates' && (
              <div className="flex flex-col animate-in fade-in duration-300 space-y-6 pt-2">
                <div className="flex flex-col gap-4">
                  <div className={`flex items-center gap-2 ${updateStatus?.isError ? 'text-rose-400' : 'text-[#6185b3]'}`}>
                    {!updateStatus?.isError && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                    <span className="text-[15px] font-medium">{updateStatus ? updateStatus.msg : t('updates.uptodate')}</span>
                  </div>
                  <p className="text-zinc-400 text-sm">{t('updates.version')}: {appVersion}</p>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => (window as any).electronAPI?.checkForUpdates()}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-lg border border-white/10 transition-colors"
                    >
                      {t('updates.check')}
                    </button>
                    <button 
                      onClick={() => (window as any).electronAPI?.openExternal('https://github.com/kionit-labs/SideBrowser/releases')}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-lg border border-white/10 transition-colors flex items-center gap-1.5"
                    >
                      {t('updates.releaseNotes')}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <h3 className="text-lg font-bold text-[var(--theme-text)] mb-4">{t('updates.preferences')}</h3>
                  <label 
                     onClick={(e) => { e.preventDefault(); updateSetting('autoUpdate', !settings.autoUpdate); }}
                     className="flex items-center gap-3 cursor-pointer group w-max"
                  >
                    <div className={`relative flex items-center justify-center w-5 h-5 rounded border transition-colors ${settings.autoUpdate ? 'bg-[var(--theme-accent)] border-[var(--theme-accent)]' : 'bg-transparent border-zinc-600 group-hover:border-zinc-500'}`}>
                      {settings.autoUpdate && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                    </div>
                    <span className="text-[15px] font-medium text-[var(--theme-text)] opacity-90 transition-colors">{t('updates.autoCheck')}</span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'Passwords' && (
              <div className="flex flex-col animate-in fade-in duration-300 space-y-6 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1 max-w-xl relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input 
                      type="text"
                      placeholder={t('passwords.searchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-zinc-800/40 border border-zinc-700/30 text-[var(--theme-text)] text-sm rounded-lg pl-10 pr-4 py-2.5 outline-none focus:ring-1 focus:ring-[var(--theme-accent)]/50 transition-all font-medium"
                    />
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[var(--theme-text)] opacity-80 hover:opacity-100 hover:bg-white/5 rounded-lg transition-all"
                  >
                    <ExternalLink className="w-4 h-4" /> {t('passwords.import')}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleCsvImport} 
                    accept=".csv" 
                    className="hidden" 
                  />
                </div>

                <div className="text-[15px] font-medium text-[var(--theme-text)] opacity-60">
                  {passwords.length} {t('passwords.count')}
                </div>

                {/* Password List */}
                <div className="flex flex-col gap-1 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredPasswords.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors px-4 -mx-4 rounded-lg group">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                          <Key className="w-4 h-4 text-zinc-400" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-semibold truncate text-[var(--theme-text)] opacity-90">{p.url}</span>
                          <div className="flex items-center gap-2">
                             <span className="text-xs text-zinc-500 truncate">{p.username}</span>
                             <span className="text-zinc-700">•</span>
                             <div className="flex items-center gap-1.5 min-w-[80px]">
                                <span className="text-xs font-mono text-zinc-500">
                                  {visiblePasswords[p.id] ? p.password : '••••••••'}
                                </span>
                                <button 
                                  onClick={() => togglePasswordVisibility(p.id)}
                                  className="p-1 hover:bg-white/10 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                                >
                                  {visiblePasswords[p.id] ? <EyeOff size={11} /> : <Eye size={11} />}
                                </button>
                                <button 
                                  onClick={() => copyToClipboard(p.password, p.id)}
                                  className="p-1 hover:bg-white/10 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                                >
                                  {copiedId === p.id ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
                                </button>
                             </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={() => deletePassword(p.id)}
                           className="p-2 text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                    </div>
                  ))}
                  
                  {filteredPasswords.length === 0 && searchQuery && (
                    <div className="py-12 text-center text-zinc-500 text-sm">
                      {t('passwords.notFound')} "{searchQuery}"
                    </div>
                  )}
                </div>

                {/* Import section from screenshot */}
                {passwords.length === 0 && !searchQuery && (
                   <div className="flex flex-col pt-4">
                      <p className="text-[15px] text-zinc-400 mb-6">
                        {t('passwords.importSub')} <span className="text-blue-400 cursor-pointer hover:underline">Chrome Browser</span>, <span className="text-blue-400 cursor-pointer hover:underline">Microsoft Edge Browser</span> or <span className="text-blue-400 cursor-pointer hover:underline">Firefox Browser</span>
                      </p>
                      
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-zinc-700/50 rounded-xl py-16 flex flex-col items-center justify-center gap-4 hover:border-[var(--theme-accent)]/50 hover:bg-white/5 transition-all cursor-pointer group"
                      >
                        <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Upload className="w-8 h-8 text-zinc-500" />
                        </div>
                        <span className="text-sm text-zinc-400 font-medium">{t('passwords.importClick')}</span>
                      </div>
                   </div>
                )}
              </div>
            )}

            {activeTab === 'Shortcuts' && (
              <div className="flex flex-col animate-in fade-in duration-300">
                <div className="flex flex-col pt-2">
                  <h3 className="text-lg font-bold text-[var(--theme-text)] mb-4">{t('shortcuts.global.title')}</h3>
                  
                  <ShortcutRecorder 
                    label={t('shortcuts.global.toggleShow')} 
                    value={settings.shortcutShowHide} 
                    onChange={(val: string) => updateSetting('shortcutShowHide', val)} 
                  />
                  
                  <ShortcutRecorder 
                    label={t('shortcuts.global.toggleAutohide')} 
                    value={settings.shortcutAutoHide} 
                    onChange={(val: string) => updateSetting('shortcutAutoHide', val)} 
                  />
                </div>

                <div className="flex flex-col pt-8">
                  <h3 className="text-lg font-bold text-[var(--theme-text)] mb-4">{t('shortcuts.window.title')}</h3>
                  
                  {[
                    [t('shortcuts.key.newWindow'), 'Ctrl + N'],
                    [t('shortcuts.key.toggleSidebar'), 'Ctrl + B'],
                    [t('shortcuts.key.nextTab'), 'Ctrl + Tab'],
                    [t('shortcuts.key.prevTab'), 'Ctrl + Shift + Tab'],
                    [t('shortcuts.key.specificTab'), 'Ctrl + 1~9'],
                    [t('shortcuts.key.closeTab'), 'Ctrl + W'],
                    [t('shortcuts.key.home'), 'Ctrl + T'],
                    [t('shortcuts.key.back'), 'Ctrl + ←'],
                    [t('shortcuts.key.forward'), 'Ctrl + →'],
                    [t('shortcuts.key.zoomIn'), 'Ctrl + +'],
                    [t('shortcuts.key.zoomOut'), 'Ctrl + -'],
                    [t('shortcuts.key.zoomReset'), 'Ctrl + 0'],
                    [t('shortcuts.key.refresh'), 'Ctrl + R'],
                    [t('shortcuts.key.refresh'), 'F5'],
                    [t('shortcuts.key.devtools'), 'Ctrl + Shift + I'],
                    [t('shortcuts.key.devtools'), 'F12'],
                    [t('shortcuts.key.mute'), 'Ctrl + M'],
                    [t('shortcuts.key.settings'), 'Ctrl + ,'],
                    [t('shortcuts.key.favorite'), 'Ctrl + D']
                  ].map(([label, shortcut], i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors px-2 -mx-2 rounded-lg">
                      <span className="text-[15px] font-medium text-[var(--theme-text)] opacity-90">{label}</span>
                      <span className="text-[14px] font-mono font-medium text-[var(--theme-text)] opacity-60 bg-zinc-800/30 px-2 py-1 rounded">{shortcut}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
        </div>
      </div>
    </div>
  );
}
