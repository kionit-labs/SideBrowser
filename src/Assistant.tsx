import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Bot, User, Paperclip, Scissors, FolderOpen, Trash2, 
  PanelLeftClose, PanelLeftOpen, Plus, MessageSquare, Copy
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { useSettings } from './contexts/SettingsContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface Thread {
  id: string;
  title: string;
  updatedAt: number;
}

export default function Assistant() {
  const { settings } = useSettings();
  
  const [threads, setThreads] = useState<Thread[]>([
    { id: '1', title: 'Default Conversation', updatedAt: Date.now() }
  ]);
  const [activeThreadId, setActiveThreadId] = useState<string>('1');
  
  const [messages, setMessages] = useState<Message[]>([
    { id: 'msg1', role: 'assistant', content: 'Hello! I am your premium AI assistant. How can I help you today?', timestamp: Date.now() }
  ]);
  
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, newUserMsg]);
    setInput('');
    
    // Placeholder for actual LLM call
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `This is a simulated response using **${settings.aiProvider || 'Local LLM'}**. Once IPC is fully connected, I will fetch real data.\n\nHere is some code:\n\`\`\`javascript\nconsole.log("Hello from AI!");\n\`\`\``,
        timestamp: Date.now()
      }]);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const createNewThread = () => {
    const newThread: Thread = { id: Date.now().toString(), title: 'New Conversation', updatedAt: Date.now() };
    setThreads([newThread, ...threads]);
    setActiveThreadId(newThread.id);
    setMessages([{ id: Date.now().toString(), role: 'assistant', content: 'How can I help you?', timestamp: Date.now() }]);
  };

  return (
    <div className="flex h-full w-full bg-[var(--theme-content-bg)] overflow-hidden relative" style={{ WebkitAppRegion: 'no-drag' } as any}>
      {/* Sidebar for Threads */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-full border-r border-black/10 dark:border-white/10 flex flex-col bg-black/5 dark:bg-white/5 shrink-0"
          >
            <div className="p-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
              <span className="font-semibold text-sm text-[var(--theme-text)]">Chat History</span>
              <button 
                onClick={createNewThread}
                className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors"
              >
                <Plus size={16} className="text-[var(--theme-text)]" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 no-scrollbar">
              {threads.map(thread => (
                <button 
                  key={thread.id}
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-3 transition-colors ${
                    activeThreadId === thread.id 
                      ? 'bg-[var(--theme-active)] text-white' 
                      : 'text-[var(--theme-text)] hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100'
                  }`}
                >
                  <MessageSquare size={16} />
                  <span className="truncate flex-1">{thread.title}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <div className="h-14 border-b border-black/10 dark:border-white/10 flex items-center px-4 gap-3 shrink-0 backdrop-blur-md bg-white/30 dark:bg-black/30 z-10">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors text-[var(--theme-text)] opacity-70 hover:opacity-100"
          >
            {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </button>
          
          <div className="flex flex-col">
            <span className="font-semibold text-[var(--theme-text)] text-sm">AI Assistant</span>
            <span className="text-[var(--theme-text)] opacity-50 text-[10px] uppercase tracking-wider">{settings.aiProvider || 'Not Configured'} - {settings.aiModel || 'Local'}</span>
          </div>

          <div className="ml-auto flex items-center gap-1">
             <button 
                title="Clear Chat" 
                onClick={() => setMessages([])}
                className="p-1.5 hover:bg-red-500/10 hover:text-red-500 text-[var(--theme-text)] opacity-70 hover:opacity-100 rounded-md transition-colors"
             >
               <Trash2 size={18} />
             </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6 scroll-smooth pb-10">
          {messages.map((msg) => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-4 max-w-[90%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-[var(--theme-active)] text-white' : 'bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={18} />}
              </div>
              
              <div className={`flex flex-col gap-1 min-w-0 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className="text-[11px] opacity-40 text-[var(--theme-text)] px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                
                <div className={`p-3.5 rounded-2xl text-[14px] leading-relaxed break-words shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-[var(--theme-active)] text-white rounded-tr-sm' 
                    : 'bg-white dark:bg-[#1e1e2e] text-[var(--theme-text)] border border-black/5 dark:border-white/5 rounded-tl-sm'
                }`}>
                  {msg.role === 'user' ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <div className="markdown-body text-sm">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                        code({node, inline, className, children, ...props}: any) {
                          const match = /language-(\w+)/.exec(className || '')
                          return !inline && match ? (
                            <div className="rounded-lg overflow-hidden my-3 border border-black/10 dark:border-white/10 shadow-sm">
                              <div className="bg-[#2d2d2d] px-3 py-1.5 flex justify-between items-center text-xs text-zinc-400">
                                <span>{match[1]}</span>
                                <button className="hover:text-white transition-colors" onClick={() => navigator.clipboard.writeText(String(children))}><Copy size={14} /></button>
                              </div>
                              <SyntaxHighlighter
                                {...props}
                                style={vscDarkPlus as any}
                                language={match[1]}
                                PreTag="div"
                                customStyle={{ margin: 0, borderRadius: 0, fontSize: '13px' }}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            </div>
                          ) : (
                            <code {...props} className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-[0.9em] font-mono">
                              {children}
                            </code>
                          )
                        }
                      }}
                    >
                      {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-transparent border-t border-black/5 dark:border-white/5 backdrop-blur-md shrink-0">
          <div className="max-w-4xl mx-auto relative bg-white dark:bg-[#1e1e2e] border border-black/10 dark:border-white/10 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-[var(--theme-active)]/50 focus-within:border-[var(--theme-active)] transition-all flex flex-col">
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything... (Press Enter to send)"
              className="w-full bg-transparent text-[var(--theme-text)] p-4 max-h-48 min-h-[56px] resize-none outline-none text-sm placeholder:opacity-50 no-scrollbar rounded-t-2xl"
              rows={1}
              style={{ fieldSizing: 'content' } as any}
            />
            
            <div className="flex items-center justify-between px-3 pb-3">
              <div className="flex items-center gap-1">
                <button title="Attach File" className="p-2 text-[var(--theme-text)] opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors">
                  <Paperclip size={18} />
                </button>
                <button title="Capture Screen / Snip" className="p-2 text-[var(--theme-text)] opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors">
                  <Scissors size={18} />
                </button>
                <button title="Open Workspace File" className="p-2 text-[var(--theme-text)] opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors">
                  <FolderOpen size={18} />
                </button>
              </div>
              
              <button 
                onClick={handleSend}
                disabled={!input.trim()}
                className="w-8 h-8 rounded-full bg-[var(--theme-active)] text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shadow-sm"
              >
                <Send size={16} className="ml-0.5" />
              </button>
            </div>
          </div>
          <div className="text-center mt-2 text-[10px] text-[var(--theme-text)] opacity-40">
            AI Assistant can make mistakes. Consider verifying important information.
          </div>
        </div>
      </div>
    </div>
  );
}
