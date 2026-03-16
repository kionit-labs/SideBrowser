import { useState, useEffect } from 'react';


interface SettingsProps {
  transparency: number;
  setTransparency: (val: number) => void;
}

export default function Settings({ transparency, setTransparency }: SettingsProps) {
  const [activeTab, setActiveTab] = useState('General');
  const [adblockEnabled, setAdblockEnabled] = useState(true);

  useEffect(() => {
    if ((window as any).electronAPI) {
      (window as any).electronAPI.getStoreValue('adblockEnabled').then((val: boolean) => {
        if (val !== undefined) setAdblockEnabled(val);
      });
    }
  }, []);

  const handleTransparencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setTransparency(val);
    if ((window as any).electronAPI) {
      (window as any).electronAPI.setStoreValue('transparency', val);
    }
  };

  const handleAdblockToggle = () => {
    const newVal = !adblockEnabled;
    setAdblockEnabled(newVal);
    if ((window as any).electronAPI) {
      (window as any).electronAPI.setStoreValue('adblockEnabled', newVal);
    }
  };

  const tabs = ['General', 'Window', 'Updates', 'Shortcuts'];

  const SelectItem = ({ label, subtitle, options }: any) => (
    <div className="flex flex-col py-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors px-4 -mx-4 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-zinc-100">{label}</h3>
        <select className="bg-zinc-800/80 border border-zinc-700/50 text-zinc-200 text-sm rounded-md px-3 py-1.5 outline-none focus:ring-1 focus:ring-blue-500/50 min-w-[120px]">
          {options.map((opt: string) => <option key={opt}>{opt}</option>)}
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
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <button className="flex items-center gap-1 text-sm font-medium text-zinc-300 hover:text-white transition-colors">
            Give feedback <span className="text-lg leading-none">&rarr;</span>
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

          <div className="flex flex-col">
            {activeTab === 'General' && (
              <div className="flex flex-col animate-in fade-in duration-300">
                <SelectItem label="Language" options={['English', 'Turkish', 'French']} />
                <SelectItem label="Theme Color" options={['Default', 'Light', 'Dark']} />
                <SelectItem label="Dark Mode" options={['System', 'Always On', 'Always Off']} />
                <SelectItem 
                  label="Address Bar" 
                  options={['Hidden', 'Top', 'Bottom']} 
                  subtitle="When top or bottom is selected, the address bar is hidden by default. You need to move your mouse to the top or bottom edge to show it"
                />
                
                <ToggleItem 
                  label="Auto Launch" 
                  subtitle="Start SlideBrowser when you sign in to your computer" 
                  enabled={false} 
                />
                <ToggleItem 
                  label="Translate Web Pages" 
                  subtitle="Enable Immersive Translate to translate web pages" 
                  enabled={false} 
                />
                <ToggleItem 
                  label="Adblock" 
                  subtitle="Enable Adblock to block all ads" 
                  enabled={adblockEnabled} 
                  onToggle={handleAdblockToggle}
                />
                <ToggleItem 
                  label="Passwords Manager" 
                  subtitle="Automatically fill in login forms when password management is enabled" 
                  enabled={false} 
                />
              </div>
            )}

            {activeTab === 'Window' && (
              <div className="flex flex-col animate-in fade-in duration-300">
                <div className="flex flex-col py-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors px-4 -mx-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[15px] font-semibold text-zinc-100">Window Transparency</h3>
                      <p className="text-[13px] text-zinc-500 mt-1">Adjusts the desktop transparency effect behind the UI.</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <span className="text-xs font-mono text-zinc-400">{Math.round(transparency * 100)}%</span>
                       <input 
                        type="range" 
                        min="0.3" 
                        max="1.0" 
                        step="0.05" 
                        value={transparency} 
                        onChange={handleTransparencyChange}
                        className="w-32 accent-[#3b5270] bg-zinc-800 h-1.5 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#6185b3] [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <ToggleItem 
                  label="Always On Top" 
                  subtitle="Keep the browser window above all other applications" 
                  enabled={true} 
                />
                <ToggleItem 
                  label="Automatically Center Window" 
                  subtitle="When enabled, the window will always be positioned in the vertical center of the screen." 
                  enabled={true} 
                />
                <SelectItem 
                  label="Default Snap Side" 
                  options={['Right', 'Left']} 
                  subtitle="Which side of the screen the browser should stick to by default"
                />
              </div>
            )}

            {(activeTab === 'Updates' || activeTab === 'Shortcuts') && (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500 animate-in fade-in duration-300">
                <p className="text-sm">This section is currently under development.</p>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
