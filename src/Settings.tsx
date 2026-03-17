import { useState } from 'react';
import { useSettings, useTranslation } from './contexts/SettingsContext';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('General');
  const { settings, updateSetting } = useSettings();
  const { t } = useTranslation();

  const tabs = ['General', 'Window', 'Updates', 'Shortcuts'];

  const SelectItem = ({ label, subtitle, options, value, onChange }: any) => (
    <div className="flex flex-col py-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors px-4 -mx-4 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-zinc-100">{label}</h3>
        <select 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-zinc-800/80 border border-zinc-700/50 text-zinc-200 text-sm rounded-md px-3 py-1.5 outline-none focus:ring-1 focus:ring-blue-500/50 min-w-[120px]">
          {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
      {subtitle && <p className="text-[13px] text-zinc-500 mt-2">{subtitle}</p>}
    </div>
  );

  const ToggleItem = ({ label, subtitle, enabled, onToggle }: any) => (
    <div className="flex flex-col py-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors px-4 -mx-4 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-zinc-100">{label}</h3>
        <button 
          onClick={onToggle}
          className={`relative w-11 h-6 rounded-full transition-colors duration-300 border ${enabled ? 'bg-[#3b5270] border-[#3b5270]' : 'bg-zinc-800 border-zinc-700'}`}
        >
          <div className={`absolute top-[1px] left-[1px] w-5 h-5 rounded-full transition-transform duration-300 shadow-sm ${enabled ? 'translate-x-5 bg-white' : 'translate-x-0 bg-zinc-400'}`}></div>
        </button>
      </div>
      {subtitle && <p className="text-[13px] text-zinc-500 mt-1">{subtitle}</p>}
    </div>
  );

  return (
    <div className="w-full h-full bg-[#1b1f24] text-zinc-100 flex flex-col font-sans">
      <div className="absolute top-0 left-0 right-0 h-8 z-50 pointer-events-none" style={{ WebkitAppRegion: 'drag' } as any} />
      
      {/* Settings Header */}
      <div className="px-10 pt-10 pb-4" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight">{t('settings.title')}</h1>
          <button className="flex items-center gap-1 text-sm font-medium text-zinc-300 hover:text-white transition-colors">
            {t('settings.feedback')} <span className="text-lg leading-none">&rarr;</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-10 pb-10" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <div className="max-w-3xl flex flex-col">
          
          {/* Tabs Group */}
          <div className="flex w-full mt-2 mb-6 border-b border-zinc-800">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-sm font-semibold transition-all duration-200 rounded-t-lg mx-0.5 ${
                  activeTab === tab 
                    ? 'bg-[#3b5270] text-white' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                {tab}
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
                  value={settings.themeColor}
                  onChange={(val: string) => updateSetting('themeColor', val)}
                />
                <SelectItem 
                  label={t('general.darkmode')} 
                  options={['System', 'Light', 'Dark']} 
                  value={settings.darkMode}
                  onChange={(val: string) => updateSetting('darkMode', val)}
                />
                <SelectItem 
                  label={t('general.addressbar')} 
                  options={['Hidden', 'Top', 'Bottom']} 
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
                      <h3 className="text-[15px] font-semibold text-zinc-100">{t('window.transparency')}</h3>
                      <p className="text-[13px] text-zinc-500 mt-1">{t('window.transparency.sub')}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <span className="text-xs font-mono text-zinc-400">{Math.round(settings.transparency * 100)}%</span>
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
                    </div>
                  </div>
                </div>

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
                  options={['Right', 'Left']} 
                  subtitle={t('window.snapside.sub')}
                  value={settings.defaultSnapSide}
                  onChange={(val: string) => updateSetting('defaultSnapSide', val)}
                />
              </div>
            )}

            {activeTab === 'Updates' && (
              <div className="flex flex-col animate-in fade-in duration-300 space-y-6 pt-2">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-[#6185b3]">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span className="text-[15px] font-medium">You're up to date</span>
                  </div>
                  <p className="text-zinc-400 text-sm">Current version: 2.0.0</p>
                  
                  <div className="flex items-center gap-3">
                    <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-lg border border-white/10 transition-colors">
                      Check for updates
                    </button>
                    <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-lg border border-white/10 transition-colors flex items-center gap-1.5">
                      Release notes
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <h3 className="text-lg font-bold text-white mb-4">Preferences</h3>
                  <label className="flex items-center gap-3 cursor-pointer group w-max">
                    <div className="relative flex items-center justify-center w-5 h-5 rounded bg-[#3b5270] border border-[#3b5270]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span className="text-[15px] font-medium text-zinc-100 group-hover:text-white transition-colors">Automatically check for updates</span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'Shortcuts' && (
              <div className="flex flex-col animate-in fade-in duration-300">
                <div className="flex flex-col pt-2">
                  <h3 className="text-lg font-bold text-white mb-4">Global Shortcuts</h3>
                  
                  <div className="flex items-center justify-between py-3 border-b border-white/5 group">
                    <span className="text-[15px] font-medium text-zinc-200 group-hover:text-white transition-colors pr-6">Switch Window Show and Hide</span>
                    <input type="text" readOnly placeholder="Record Shortcut" className="bg-zinc-800/80 border border-zinc-700/50 text-zinc-400 text-sm rounded-md px-3 py-1.5 outline-none w-40 text-center placeholder-zinc-500 shrink-0 cursor-pointer" />
                  </div>
                  
                  <div className="flex items-center justify-between py-3 border-b border-white/5 group">
                    <span className="text-[15px] font-medium text-zinc-200 group-hover:text-white transition-colors pr-6">Enable/Disable Automatically Hide the Window When It Loses Focus</span>
                    <input type="text" readOnly placeholder="Record Shortcut" className="bg-zinc-800/80 border border-zinc-700/50 text-zinc-400 text-sm rounded-md px-3 py-1.5 outline-none w-40 text-center placeholder-zinc-500 shrink-0 cursor-pointer" />
                  </div>
                </div>

                <div className="flex flex-col pt-8">
                  <h3 className="text-lg font-bold text-white mb-4">In-window Shortcuts</h3>
                  
                  {[
                    ['New Window', 'Ctrl + N'],
                    ['Toggle Sidebar', 'Ctrl + B'],
                    ['Switch to the next tab', 'Ctrl + Tab'],
                    ['Switch to the previous tab', 'Ctrl + Shift + Tab'],
                    ['Switch to a specific tab', 'Ctrl + 1~9'],
                    ['Close current tab', 'Ctrl + W'],
                    ['Go to Home', 'Ctrl + T'],
                    ['Back', 'Ctrl + ←'],
                    ['Forward', 'Ctrl + →'],
                    ['Zoom in', 'Ctrl + +'],
                    ['Zoom out', 'Ctrl + -'],
                    ['Reset zoom', 'Ctrl + 0'],
                    ['Refresh', 'Ctrl + R'],
                    ['Refresh', 'F5'],
                    ['Open DevTools', 'Ctrl + Shift + I'],
                    ['Open DevTools', 'F12'],
                    ['Mute/unmute All Pages', 'Ctrl + M'],
                    ['Open Settings Page', 'Ctrl + ,'],
                    ['Add Favorite', 'Ctrl + D']
                  ].map(([label, shortcut], i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors px-2 -mx-2 rounded-lg">
                      <span className="text-[15px] font-medium text-zinc-200">{label}</span>
                      <span className="text-[14px] font-mono font-medium text-zinc-400 bg-zinc-800/50 px-2 py-1 rounded">{shortcut}</span>
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
