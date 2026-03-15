import React, { useState } from 'react';
import { Plus, ChevronDown } from 'lucide-react';

interface HomeViewProps {
  onNavigate: (url: string) => void;
}

export default function HomeView({ onNavigate }: HomeViewProps) {
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    let newUrl = query;
    if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
      newUrl = 'https://' + newUrl;
    }
    onNavigate(newUrl);
  };

  const quickLinks = [
    { name: 'Google', url: 'https://google.com', color: 'bg-white', text: 'text-zinc-900', initial: 'G', ring: 'ring-0' },
    { name: 'ChatGPT', url: 'https://chat.openai.com', color: 'bg-white', text: 'text-zinc-900', initial: 'C', ring: 'ring-0' },
    { name: 'Notion', url: 'https://notion.so', color: 'bg-white', text: 'text-zinc-900', initial: 'N', ring: 'ring-0' },
    { name: 'Google Transl...', url: 'https://translate.google.com', color: 'bg-white', text: 'text-zinc-900', initial: 'A', ring: 'ring-0' },
    { name: 'X', url: 'https://x.com', color: 'bg-black', text: 'text-white', initial: 'X', ring: 'ring-1 ring-white/20' },
  ];

  return (
    <div className="flex-1 w-full h-full flex flex-col items-center justify-center relative text-zinc-100 overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506744626753-143d4eb37e40')] bg-cover bg-center brightness-75 pointer-events-none z-0"></div>
      
      <div className="absolute top-0 left-0 right-0 h-8 z-50 pointer-events-none" style={{ WebkitAppRegion: 'drag' } as any} />
      
      <div className="w-full max-w-[560px] flex flex-col items-center gap-12 relative z-10 -translate-y-12" style={{ WebkitAppRegion: 'no-drag' } as any}>
        
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="w-full relative shadow-lg">
          <div className="absolute inset-y-0 left-4 flex items-center gap-2 pointer-events-none">
            {/* Fake Google Logo colors for G */}
            <div className="flex font-bold text-lg">
              <span className="text-blue-500">G</span>
            </div>
            <ChevronDown className="w-4 h-4 text-zinc-400" />
            <div className="h-5 w-[1px] bg-zinc-300 ml-1"></div>
          </div>
          <input
            type="text"
            className="w-full h-12 pl-[5.5rem] pr-4 bg-white rounded-sm text-zinc-800 placeholder-zinc-400 outline-none text-[15px] shadow-sm"
            placeholder="Search or enter a URL"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </form>

        {/* Quick Access Grid */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-8 px-4 w-full max-w-[480px]">
          {quickLinks.map((link) => {
            const domain = new URL(link.url).hostname.replace('www.', '');
            return (
              <button
                key={link.name}
                onClick={() => onNavigate(link.url)}
                className="flex flex-col items-center gap-3 group w-20"
              >
                <div className={`w-16 h-16 bg-white/95 rounded-full flex items-center justify-center shadow-md transition-transform duration-200 group-hover:scale-105 active:scale-95 ${link.ring} overflow-hidden`}>
                  <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} alt={link.name} className="w-full h-full object-cover scale-100" />
                </div>
                <span className="text-[13px] font-medium text-white/90 drop-shadow-md whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">
                  {link.name}
                </span>
              </button>
            );
          })}
          
          <button className="flex flex-col items-center gap-3 group w-20">
            <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center text-zinc-800 shadow-md transition-transform duration-200 hover:scale-105 active:scale-95">
              <Plus size={28} strokeWidth={1.5} />
            </div>
          </button>
        </div>

      </div>
    </div>
  );
}
