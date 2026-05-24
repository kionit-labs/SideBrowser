import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, User, Paperclip, Scissors, Trash2, 
  PanelLeftClose, PanelLeftOpen, Plus, MessageSquare, Copy, ArrowUp, Mic, Volume2, RotateCcw
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
  
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if ((window as any).electronAPI) {
      const unsubChunk = (window as any).electronAPI.onAiStreamChunk(({ threadId, chunk }: any) => {
        setMessages(prev => prev.map(msg => 
          msg.id === threadId ? { ...msg, content: msg.content + chunk } : msg
        ));
      });
      const unsubError = (window as any).electronAPI.onAiStreamError(({ threadId, error }: any) => {
        setMessages(prev => prev.map(msg => 
          msg.id === threadId ? { ...msg, content: msg.content + `\n\n**Error:** ${error}` } : msg
        ));
      });
      return () => {
        if (unsubChunk) unsubChunk();
        if (unsubError) unsubError();
      };
    }
  }, []);

  const handleReadAloud = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    // Remove markdown symbols for better speech
    const cleanText = text.replace(/[*_#`]/g, '');
    utterance.text = cleanText;
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser environment.');
      return;
    }
    
    if (isListening) {
      setIsListening(false);
      return; // The onend handler will catch it when it stops
    }

    const recognition = new SpeechRecognition();
    recognition.lang = navigator.language || 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const speechResult = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + speechResult);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  const handleSend = () => {
    if (!input.trim() && !attachedImage) return;
    
    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input || (attachedImage ? '[Image Attached]' : ''),
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, newUserMsg]);
    setInput('');
    const imageToSend = attachedImage;
    setAttachedImage(null);
    
    const aiMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    }]);

    if ((window as any).electronAPI) {
      (window as any).electronAPI.aiQueryLLMStream(
         newUserMsg.content, 
         aiMessageId, 
         settings.aiProvider, 
         settings.aiModel, 
         settings.aiEndpoint, 
         settings.aiApiKey,
         imageToSend
      );
    }
  };

  const handleCaptureScreen = async () => {
    setIsAttachmentMenuOpen(false);
    if ((window as any).electronAPI) {
      // Minimize or hide window briefly if needed? (optional)
      const base64Image = await (window as any).electronAPI.aiCaptureScreenRegion();
      if (base64Image) {
        setAttachedImage(base64Image);
      }
    }
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
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 dark:bg-black/40 z-40"
              onClick={() => setIsSidebarOpen(false)}
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute top-0 left-0 bottom-0 w-[260px] bg-[var(--theme-content-bg)] border-r border-black/10 dark:border-white/10 z-50 flex flex-col shadow-2xl"
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
                    onClick={() => {
                      setActiveThreadId(thread.id);
                      setIsSidebarOpen(false);
                    }}
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
          </>
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
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center opacity-40 text-[var(--theme-text)] gap-4">
              <Bot size={48} strokeWidth={1.5} />
              <div className="text-center">
                <h3 className="font-medium text-lg mb-1">How can I help you today?</h3>
                <p className="text-sm">Type a message to start a conversation.</p>
              </div>
            </div>
          )}
          
          {messages.map((msg) => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-4 max-w-[90%] group ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
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
                    : 'bg-black/5 dark:bg-white/5 text-[var(--theme-text)] border border-black/5 dark:border-white/5 rounded-tl-sm'
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
                
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button className="p-1.5 text-[var(--theme-text)] opacity-40 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-all" title="Copy">
                        <Copy size={13} />
                     </button>
                     {settings.aiTtsEnabled && (
                       <button 
                         onClick={() => handleReadAloud(msg.content)}
                         className="p-1.5 text-[var(--theme-text)] opacity-40 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-all" 
                         title="Read Aloud"
                       >
                          <Volume2 size={14} />
                       </button>
                     )}
                     <button className="p-1.5 text-[var(--theme-text)] opacity-40 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-all" title="Regenerate">
                        <RotateCcw size={13} />
                     </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-transparent border-t border-black/5 dark:border-white/5 backdrop-blur-md shrink-0">
          
          {attachedImage && (
            <div className="max-w-4xl mx-auto mb-3 relative group w-max">
              <img src={attachedImage} alt="Attached" className="h-20 w-auto rounded-lg border border-black/10 dark:border-white/10 shadow-sm" />
              <button 
                onClick={() => setAttachedImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}

          <div className="max-w-4xl mx-auto relative bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-[var(--theme-active)]/50 focus-within:border-[var(--theme-active)] transition-all flex flex-col">
            
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
              
              <div className="relative">
                <button 
                  onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                  className={`p-1.5 text-[var(--theme-text)] rounded-full transition-colors flex items-center justify-center ${isAttachmentMenuOpen ? 'bg-black/10 dark:bg-white/10 opacity-100' : 'opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'}`}
                >
                  <Plus size={22} className={`transition-transform duration-200 ${isAttachmentMenuOpen ? 'rotate-45' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isAttachmentMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full left-0 mb-3 w-56 bg-[var(--theme-content-bg)] border border-black/10 dark:border-white/10 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.15)] overflow-hidden z-50 flex flex-col text-sm p-1.5"
                    >
                      <button className="flex items-center gap-3 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors text-[var(--theme-text)] text-left group" onClick={() => setIsAttachmentMenuOpen(false)}>
                        <Paperclip size={16} className="opacity-60 group-hover:opacity-100" />
                        <span className="font-medium">Attach Files</span>
                      </button>
                      
                      <div className="h-px bg-black/10 dark:bg-white/10 my-1 mx-2" />
                      <div className="px-3 py-1.5 text-[10px] font-bold text-[var(--theme-text)] opacity-40 tracking-wider">APPLICATIONS</div>
                      
                      <button className="flex items-center gap-3 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors text-[var(--theme-text)] text-left group" onClick={() => setIsAttachmentMenuOpen(false)}>
                        <div className="w-5 h-5 rounded-md bg-[var(--theme-active)] flex items-center justify-center shrink-0">
                          <Bot size={12} className="text-white" />
                        </div>
                        <span className="truncate font-medium">Side Browser</span>
                      </button>
                      
                      <div className="h-px bg-black/10 dark:bg-white/10 my-1 mx-2" />
                      <div className="px-3 py-1.5 text-[10px] font-bold text-[var(--theme-text)] opacity-40 tracking-wider">DISPLAYS</div>
                      
                      <button 
                        onClick={handleCaptureScreen}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors text-[var(--theme-text)] text-left group"
                      >
                        <Scissors size={16} className="opacity-60 group-hover:opacity-100" />
                        <span className="font-medium">Capture Area</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={toggleListening}
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-[var(--theme-text)] opacity-40 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'}`}
                  title={isListening ? "Listening..." : "Voice Input"}
                >
                  <Mic size={17} />
                </button>
                <button  
                  onClick={handleSend}
                  disabled={!input.trim() && !attachedImage}
                  className="w-[30px] h-[30px] rounded-full bg-[var(--theme-text)] text-[var(--theme-content-bg)] flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shadow-sm"
                >
                  <ArrowUp size={18} strokeWidth={2.5} />
                </button>
              </div>
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
