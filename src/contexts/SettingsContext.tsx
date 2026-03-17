import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

const translations = {
  English: {
    'settings.title': 'Settings',
    'settings.feedback': 'Give feedback',
    'tab.general': 'General',
    'tab.window': 'Window',
    'tab.updates': 'Updates',
    'tab.shortcuts': 'Shortcuts',
    'general.language': 'Language',
    'general.theme': 'Theme Color',
    'general.darkmode': 'Dark Mode',
    'general.addressbar': 'Address Bar',
    'general.addressbar.sub': 'When top or bottom is selected, the address bar is hidden by default. You need to move your mouse to the top or bottom edge to show it',
    'general.autolaunch': 'Auto Launch',
    'general.autolaunch.sub': 'Start SlideBrowser when you sign in to your computer',
    'general.translate': 'Translate Web Pages',
    'general.translate.sub': 'Enable Immersive Translate to translate web pages',
    'general.adblock': 'Adblock',
    'general.adblock.sub': 'Enable Adblock to block all ads',
    'general.password': 'Passwords Manager',
    'general.password.sub': 'Automatically fill in login forms when password management is enabled',
    'window.transparency': 'Window Transparency',
    'window.transparency.sub': 'Adjusts the desktop transparency effect behind the UI.',
    'window.alwaysontop': 'Always On Top',
    'window.alwaysontop.sub': 'Keep the browser window above all other applications',
    'window.autocenter': 'Automatically Center Window',
    'window.autocenter.sub': 'When enabled, the window will always be positioned in the vertical center of the screen.',
    'window.snapside': 'Default Snap Side',
    'window.snapside.sub': 'Which side of the screen the browser should stick to by default'
  },
  'Türkçe': {
    'settings.title': 'Ayarlar',
    'settings.feedback': 'Geri bildirim ver',
    'tab.general': 'Genel',
    'tab.window': 'Pencere',
    'tab.updates': 'Güncellemeler',
    'tab.shortcuts': 'Kısayollar',
    'general.language': 'Dil',
    'general.theme': 'Tema Rengi',
    'general.darkmode': 'Karanlık Mod',
    'general.addressbar': 'Adres Çubuğu',
    'general.addressbar.sub': 'Üst veya alt seçildiğinde adres çubuğu varsayılan olarak gizlenir. Göstermek için farenizi üst veya alt kenara hareket ettirmelisiniz',
    'general.autolaunch': 'Otomatik Başlat',
    'general.autolaunch.sub': 'Bilgisayarınızda oturum açtığınızda SlideBrowser\'ı başlatın',
    'general.translate': 'Web Sayfalarını Çevir',
    'general.translate.sub': 'Web sayfalarını çevirmek için Çeviriyi Etkinleştir',
    'general.adblock': 'Reklam Engelleyici',
    'general.adblock.sub': 'Tüm reklamları engellemek için Reklam Engelleyici\'yi etkinleştirin',
    'general.password': 'Parola Yöneticisi',
    'general.password.sub': 'Parola yönetimi etkinleştirildiğinde giriş formlarını otomatik olarak doldur',
    'window.transparency': 'Pencere Şeffaflığı',
    'window.transparency.sub': 'Arayüzün arkasındaki masaüstü şeffaflık efektini ayarlar.',
    'window.alwaysontop': 'Her Zaman Üstte',
    'window.alwaysontop.sub': 'Tarayıcı penceresini diğer tüm uygulamaların üzerinde tut',
    'window.autocenter': 'Pencereyi Otomatik Ortala',
    'window.autocenter.sub': 'Etkinleştirildiğinde, pencere her zaman ekranın dikey merkezinde konumlandırılır.',
    'window.snapside': 'Varsayılan Yaslama Yönü',
    'window.snapside.sub': 'Tarayıcının varsayılan olarak ekranın hangi tarafına yapışması gerektiği'
  },
  'Deutsch': {
    'settings.title': 'Einstellungen',
    'settings.feedback': 'Feedback geben',
    'tab.general': 'Allgemein',
    'tab.window': 'Fenster',
    'tab.updates': 'Updates',
    'tab.shortcuts': 'Tastenkürzel',
    'general.language': 'Sprache',
    'general.theme': 'Themenfarbe',
    'general.darkmode': 'Dunkler Modus',
    'general.addressbar': 'Adressleiste',
    'general.addressbar.sub': 'Wenn oben oder unten ausgewählt ist, wird die Adressleiste standardmäßig ausgeblendet. Bewegen Sie die Maus an den Rand, um sie anzuzeigen.',
    'general.autolaunch': 'Automatischer Start',
    'general.autolaunch.sub': 'SlideBrowser beim Anmelden am Computer starten',
    'general.translate': 'Webseiten übersetzen',
    'general.translate.sub': 'Immersive Translate aktivieren, um Webseiten zu übersetzen',
    'general.adblock': 'Werbeblocker',
    'general.adblock.sub': 'Werbeblocker aktivieren, um alle Anzeigen zu blockieren',
    'general.password': 'Passwort-Manager',
    'general.password.sub': 'Anmeldeformulare automatisch ausfüllen, wenn der Passwort-Manager aktiviert ist',
    'window.transparency': 'Fenstertransparenz',
    'window.transparency.sub': 'Passt den Desktop-Transparenzeffekt hinter der Benutzeroberfläche an.',
    'window.alwaysontop': 'Immer im Vordergrund',
    'window.alwaysontop.sub': 'Das Browserfenster über allen anderen Anwendungen halten',
    'window.autocenter': 'Fenster automatisch zentrieren',
    'window.autocenter.sub': 'Wenn aktiviert, wird das Fenster immer in der vertikalen Mitte des Bildschirms positioniert.',
    'window.snapside': 'Standard-Andockseite',
    'window.snapside.sub': 'An welcher Seite des Bildschirms der Browser standardmäßig andocken soll'
  }
} as const;

type Language = keyof typeof translations;
type TranslationKey = keyof typeof translations['English'];

export function useTranslation() {
  const { settings } = useSettings();
  
  const t = (key: TranslationKey): string => {
    const lang = (settings.language as Language) || 'English';
    const dict = translations[lang] || translations['English'];
    return dict[key] || translations['English'][key] || key;
  };

  return { t };
}

export interface Shortcut {
  id: string;
  name: string;
  url: string;
}

export interface SettingsState {
  language: string;
  themeColor: string;
  darkMode: string;
  addressBar: string;
  autoLaunch: boolean;
  translateEnabled: boolean;
  adblockEnabled: boolean;
  passwordManagerEnabled: boolean;
  alwaysOnTop: boolean;
  autoCenter: boolean;
  transparency: number;
  defaultSnapSide: string;
  autoUpdate: boolean;
  homeBackground: number;
  searchEngine: string;
  shortcuts: Shortcut[];
}

const defaultSettings: SettingsState = {
  language: 'English',
  themeColor: 'Default',
  darkMode: 'System',
  addressBar: 'Hidden',
  autoLaunch: false,
  translateEnabled: false,
  adblockEnabled: true,
  passwordManagerEnabled: false,
  alwaysOnTop: true,
  autoCenter: true,
  transparency: 0.8,
  defaultSnapSide: 'right',
  autoUpdate: true,
  homeBackground: 0,
  searchEngine: 'Google',
  shortcuts: [
    { id: '1', name: 'Google', url: 'https://google.com' },
    { id: '2', name: 'ChatGPT', url: 'https://chat.openai.com' },
    { id: '3', name: 'Notion', url: 'https://notion.so' },
    { id: '4', name: 'X', url: 'https://x.com' },
    { id: '5', name: 'Youtube', url: 'https://youtube.com' },
  ],
};

interface SettingsContextType {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      if ((window as any).electronAPI) {
        const loadedSettings = { ...defaultSettings };
        for (const key of Object.keys(defaultSettings) as Array<keyof SettingsState>) {
          try {
            const val = await (window as any).electronAPI.getStoreValue(key);
            if (val !== undefined) {
              (loadedSettings as any)[key] = val;
            }
          } catch (e) {
            console.warn(`Failed to load setting: ${key}`, e);
          }
        }
        setSettings(loadedSettings);
        
        // Apply initial visual settings based on loaded values
        applyTheme(loadedSettings.themeColor, loadedSettings.darkMode);
      }
      setIsLoading(false);
    };
    loadSettings();
  }, []);

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    if ((window as any).electronAPI) {
      (window as any).electronAPI.setStoreValue(key, value);
      
      // Handle special cases where IPC needs explicit triggers
      if (key === 'autoLaunch') {
        (window as any).electronAPI.setAutoLaunch(value);
      }
      if (key === 'alwaysOnTop') {
        (window as any).electronAPI.setAlwaysOnTop(value);
      }
      if (key === 'themeColor' || key === 'darkMode') {
        setSettings(prev => {
          applyTheme(key === 'themeColor' ? (value as string) : prev.themeColor, 
                     key === 'darkMode' ? (value as string) : prev.darkMode);
          return prev;
        });
      }
    }
  };

  const applyTheme = (themeColor: string, darkMode: string) => {
    const root = document.documentElement;
    // Apply Dark Mode
    if (darkMode === 'Dark') {
      root.classList.add('dark');
    } else if (darkMode === 'Light') {
      root.classList.remove('dark');
    } else {
      // System
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }

    // Apply Theme Color (Accent) mapped to Tailwind Hex colors roughly
    const themeMap: Record<string, string> = {
      'Violet': '#8b5cf6', 'Orange': '#f97316', 'Green': '#22c55e', 
      'Yellow': '#eab308', 'Slate': '#64748b', 'Stone': '#78716c', 
      'Gray': '#6b7280', 'Neutral': '#737373', 'Red': '#ef4444', 
      'Rose': '#f43f5e', 'Blue': '#3b82f6', 'Default': '#3b5270'
    };
    
    const color = themeMap[themeColor] || themeMap['Default'];
    root.style.setProperty('--theme-color', color);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
