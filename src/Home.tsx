import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, ChevronDown, RotateCw, Search } from 'lucide-react';
import { useSettings } from './contexts/SettingsContext';

interface HomeViewProps {
  onNavigate: (url: string) => void;
}

export default function HomeView({ onNavigate }: HomeViewProps) {
  const { settings, updateSetting } = useSettings();
  const [query, setQuery] = useState('');
  const [showEngineMenu, setShowEngineMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const searchEngines = [
    { name: 'Google', domain: 'google.com', color: 'text-blue-500', url: 'https://www.google.com/search?q=' },
    { name: 'Bing', domain: 'bing.com', color: 'text-blue-600', url: 'https://www.bing.com/search?q=' },
    { name: 'ChatGPT', domain: 'openai.com', color: 'text-emerald-500', url: 'https://chat.openai.com/?q=' },
    { name: 'ClaudeAI', domain: 'claude.ai', color: 'text-orange-400', url: 'https://claude.ai/new?q=' },
    { name: 'Yahoo', domain: 'yahoo.com', color: 'text-purple-600', url: 'https://search.yahoo.com/search?p=' },
    { name: 'Baidu', domain: 'baidu.com', color: 'text-blue-700', url: 'https://www.baidu.com/s?wd=' },
    { name: 'Yandex', domain: 'yandex.com', color: 'text-red-500', url: 'https://yandex.com/search/?text=' },
    { name: 'DuckDuckGo', domain: 'duckduckgo.com', color: 'text-orange-500', url: 'https://duckduckgo.com/?q=' },
    { name: 'Perplexity', domain: 'perplexity.ai', color: 'text-cyan-600', url: 'https://www.perplexity.ai/search?q=' },
  ];

  const backgrounds = [
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb', // Valley
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b', // Mountains
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05', // Forest fog
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e', // Forest sunshine
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470', // Lake
    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e', // Green fields
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef', // Sunset hills
    'https://images.unsplash.com/photo-1493246507139-91e8bef99c1e', // Beach mountain
  ];

  const currentEngine = searchEngines.find(e => e.name === settings.searchEngine) || searchEngines[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowEngineMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    
    // Check if it's a URL
    if (query.includes('.') && !query.includes(' ')) {
      let url = query;
      if (!url.startsWith('http')) url = 'https://' + url;
      onNavigate(url);
    } else {
      onNavigate(currentEngine.url + encodeURIComponent(query));
    }
  };

  const cycleBackground = () => {
    const next = (settings.homeBackground + 1) % backgrounds.length;
    updateSetting('homeBackground', next);
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newShortcut, setNewShortcut] = useState({ name: '', url: '' });

  const handleAddShortcut = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShortcut.name || !newShortcut.url) return;
    
    let url = newShortcut.url;
    if (!url.startsWith('http')) url = 'https://' + url;
    
    const newId = Date.now().toString();
    const updated = [...settings.shortcuts, { id: newId, name: newShortcut.name, url }];
    updateSetting('shortcuts', updated);
    setNewShortcut({ name: '', url: '' });
    setIsAddModalOpen(false);
  };

  const removeShortcut = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = settings.shortcuts.filter(s => s.id !== id);
    updateSetting('shortcuts', updated);
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col items-center justify-center relative text-zinc-100 overflow-hidden">
      {/* Dynamic Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center brightness-[0.8] transition-all duration-1000 z-0"
        style={{ backgroundImage: `url('${backgrounds[settings.homeBackground]}?auto=format&fit=crop&w=1200&q=80')` }}
      />
      
      {/* Aesthetic Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 z-[1]" />
      
      <div className="absolute top-0 left-0 right-0 h-8 z-50 pointer-events-none" style={{ WebkitAppRegion: 'drag' } as any} />
      
      <div className="w-full max-w-[700px] px-6 flex flex-col items-center gap-10 relative z-10 -translate-y-8" style={{ WebkitAppRegion: 'no-drag' } as any}>
        
        {/* Modern Responsive Search Bar */}
        <form onSubmit={handleSearch} className="w-full max-w-[550px] relative group">
          <div className="absolute inset-y-0 left-0 flex items-center z-20">
            <div 
              ref={menuRef}
              className="relative h-full flex items-center border-r border-zinc-200"
            >
              <button 
                type="button"
                onClick={() => setShowEngineMenu(!showEngineMenu)}
                className="flex items-center gap-2 pl-4 pr-3 hover:bg-black/5 transition-colors h-full rounded-l-full"
              >
                <div className="w-6 h-6 flex items-center justify-center overflow-hidden">
                  <img src={`https://www.google.com/s2/favicons?domain=${currentEngine.domain}&sz=64`} alt={currentEngine.name} className="w-4 h-4 object-contain" />
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${showEngineMenu ? 'rotate-180' : ''}`} />
              </button>

              {showEngineMenu && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-zinc-200 py-2 z-[100] animate-in slide-in-from-top-2 duration-200">
                  {searchEngines.map((engine) => (
                    <button
                      key={engine.name}
                      type="button"
                      onClick={() => {
                        updateSetting('searchEngine', engine.name);
                        setShowEngineMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-zinc-100 transition-colors text-zinc-800 text-sm font-medium"
                    >
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                         <img src={`https://www.google.com/s2/favicons?domain=${engine.domain}&sz=64`} alt={engine.name} className="w-4 h-4 object-contain" />
                      </div>
                      {engine.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <input
            type="text"
            className="w-full h-14 pl-[5.5rem] pr-12 bg-white/95 backdrop-blur-sm rounded-full text-zinc-800 placeholder-zinc-400 outline-none text-[15px] shadow-md border border-white/10 focus:ring-1 focus:ring-[var(--theme-accent)] transition-all"
            placeholder={`Search with ${currentEngine.name} or enter URL`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />

          <button 
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-[var(--theme-accent)] transition-colors"
          >
            <Search size={20} />
          </button>
        </form>

        {/* Quick Access Grid - Reverted to circular aesthetics */}
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-8 px-4 w-full">
          {settings.shortcuts.map((link) => {
            const domain = new URL(link.url).hostname.replace('www.', '');
            return (
              <button
                key={link.id}
                onClick={() => onNavigate(link.url)}
                onContextMenu={(e) => removeShortcut(link.id, e)}
                className="flex flex-col items-center gap-3 group w-16 relative"
                title="Right click to remove"
              >
                <div className="w-14 h-14 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1 active:scale-95 border border-white/20 overflow-hidden">
                  <img 
                    src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} 
                    alt={link.name} 
                    className="w-8 h-8 object-contain" 
                  />
                </div>
                <span className="text-[13px] font-medium text-white drop-shadow-md whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">
                  {link.name}
                </span>
              </button>
            );
          })}
          
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex flex-col items-center gap-3 group w-16"
          >
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-300 hover:bg-white/30 hover:scale-110 hover:-translate-y-1 active:scale-95 border border-white/10">
              <Plus size={24} strokeWidth={2} />
            </div>
            <span className="text-[13px] font-medium text-white/90 drop-shadow-md">Ekle</span>
          </button>
        </div>
      </div>

      {/* Add Shortcut Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-900 border border-white/10 w-full max-w-sm rounded-2xl p-6 relative z-10 shadow-2xl"
          >
            <h2 className="text-xl font-bold mb-4">Yeni Kısayol Ekle</h2>
            <form onSubmit={handleAddShortcut} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Ad</label>
                <input 
                  type="text" 
                  value={newShortcut.name}
                  onChange={e => setNewShortcut(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-zinc-800 border border-white/5 rounded-lg px-4 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="örn. YouTube"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">URL</label>
                <input 
                  type="text" 
                  value={newShortcut.url}
                  onChange={e => setNewShortcut(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full bg-zinc-800 border border-white/5 rounded-lg px-4 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="örn. youtube.com"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors font-medium text-sm"
                >
                  İptal
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium text-sm"
                >
                  Ekle
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Cycle Background Button (Bottom Right) */}
      <button 
        onClick={cycleBackground}
        className="absolute bottom-6 right-6 p-3 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white/50 hover:text-white transition-all duration-300 z-10 border border-white/10 group"
        title="Change Background"
      >
        <RotateCw size={20} className="group-active:rotate-180 transition-transform duration-500" />
      </button>
    </div>
  );
}
