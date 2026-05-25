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
    'tab.passwords': 'Passwords',
    'general.language': 'Language',
    'general.theme': 'Theme Color',
    'general.darkmode': 'Dark Mode',
    'general.addressbar': 'Address Bar',
    'general.addressbar.sub': 'When top or bottom is selected, the address bar is hidden by default. You need to move your mouse to the top or bottom edge to show it',
    'general.autolaunch': 'Auto Launch',
    'general.autolaunch.sub': 'Start SideBrowser when you sign in to your computer',
    'general.translate': 'Translate Web Pages',
    'general.translate.sub': 'Enable Immersive Translate to translate web pages',
    'general.adblock': 'Adblock',
    'general.adblock.sub': 'Enable Adblock to block all ads',
    'general.password': 'Passwords Manager',
    'general.password.sub': 'Automatically fill in login forms when password management is enabled',
    'window.transparency': 'Window Transparency',
    'window.transparency.sub': 'Adjusts the desktop transparency effect behind the UI.',
    'window.dragHeight': 'Top Drag Region Height',
    'window.dragHeight.sub': 'Adjust the height of the top area used to drag the window. (Default: 40px)',
    'window.dynamicsidebar': 'Dynamic Sidebar',
    'window.dynamicsidebar.sub': 'Automatically move the sidebar to the inner edge based on snap position',
    'window.alwaysontop': 'Always On Top',
    'window.alwaysontop.sub': 'Keep the browser window above all other applications',
    'window.autocenter': 'Automatically Center Window',
    'window.autocenter.sub': 'When enabled, the window will always be positioned in the vertical center of the screen.',
    'window.snapside': 'Default Snap Side',
    'window.snapside.sub': 'Which side of the screen the browser should stick to by default',
    'home.search.placeholder': 'Search with ${engine} or enter URL',
    'home.shortcuts.removeTooltip': 'Right click to remove',
    'home.shortcuts.add': 'Add',
    'home.shortcuts.modal.title': 'Add New Shortcut',
    'home.shortcuts.modal.name': 'Name',
    'home.shortcuts.modal.namePlaceholder': 'e.g. YouTube',
    'home.shortcuts.modal.url': 'URL',
    'home.shortcuts.modal.urlPlaceholder': 'e.g. youtube.com',
    'home.shortcuts.modal.cancel': 'Cancel',
    'home.shortcuts.modal.add': 'Add',
    'home.background.change': 'Change Background',
    'updates.uptodate': "You're up to date",
    'updates.version': 'Current version',
    'updates.check': 'Check for updates',
    'updates.releaseNotes': 'Release notes',
    'updates.preferences': 'Preferences',
    'updates.autoCheck': 'Automatically check for updates',
    'passwords.searchPlaceholder': 'Search passwords',
    'passwords.import': 'Import',
    'passwords.count': 'sites and apps',
    'passwords.notFound': 'No passwords found matching',
    'passwords.importSub': 'Import passwords from',
    'passwords.importClick': 'Click to select a CSV file',
    'shortcuts.global.title': 'Global Shortcuts',
    'shortcuts.global.toggleShow': 'Switch Window Show and Hide',
    'shortcuts.global.toggleAutohide': 'Enable/Disable Automatically Hide the Window When It Loses Focus',
    'shortcuts.global.record': 'Record Shortcut',
    'shortcuts.window.title': 'In-window Shortcuts',
    'shortcuts.key.newWindow': 'New Window',
    'shortcuts.key.toggleSidebar': 'Toggle Sidebar',
    'shortcuts.key.nextTab': 'Switch to the next tab',
    'shortcuts.key.prevTab': 'Switch to the previous tab',
    'shortcuts.key.specificTab': 'Switch to a specific tab',
    'shortcuts.key.closeTab': 'Close current tab',
    'shortcuts.key.home': 'Go to Home',
    'shortcuts.key.back': 'Back',
    'shortcuts.key.forward': 'Forward',
    'shortcuts.key.zoomIn': 'Zoom in',
    'shortcuts.key.zoomOut': 'Zoom out',
    'shortcuts.key.zoomReset': 'Reset zoom',
    'shortcuts.key.refresh': 'Refresh',
    'shortcuts.key.devtools': 'Open DevTools',
    'shortcuts.key.mute': 'Mute/unmute All Pages',
    'shortcuts.key.settings': 'Open Settings Page',
    'shortcuts.key.favorite': 'Add Favorite',
    'app.sidebar.back': 'Back',
    'app.sidebar.forward': 'Forward',
    'app.sidebar.refresh': 'Refresh',
    'app.sidebar.openExternal': 'Open in default browser',
    'app.sidebar.copyUrl': 'Copy URL',
    'app.sidebar.independentWindow': 'Independent window',
    'app.sidebar.unmute': 'Unmute',
    'app.sidebar.mute': 'Mute',
    'app.sidebar.deviceEmulation': 'Device Emulation',
    'app.sidebar.clearData': 'Remove website data',
    'app.sidebar.deleteTab': 'Delete tab',
    'app.sidebar.closeWindow': 'Close Window',
    'app.sidebar.hideWindow': 'Hide Window',
    'app.sidebar.autoHideFocus': 'Auto hide window focus',
    'app.sidebar.muteAll': 'Mute all pages',
    'app.sidebar.hideSidebar': 'Hide Sidebar',
    'app.sidebar.autoSnap': 'Auto edge snapping',
    'app.sidebar.settings': 'Settings',
    'theme.default': 'Default',
    'theme.violet': 'Violet',
    'theme.orange': 'Orange',
    'theme.green': 'Green',
    'theme.yellow': 'Yellow',
    'theme.slate': 'Slate',
    'theme.stone': 'Stone',
    'theme.gray': 'Gray',
    'theme.neutral': 'Neutral',
    'theme.red': 'Red',
    'theme.rose': 'Rose',
    'theme.blue': 'Blue',
    'mode.system': 'System',
    'mode.light': 'Light',
    'mode.dark': 'Dark',
    'addressbar.hidden': 'Hidden',
    'addressbar.top': 'Top',
    'addressbar.bottom': 'Bottom',
    'snap.right': 'Right',
    'snap.left': 'Left',
    'browser.search.placeholder': 'Search or enter URL',
    'tab.ai': 'AI Assistant',
    'ai.provider': 'AI Provider',
    'ai.model': 'Model Name',
    'ai.endpoint': 'API Endpoint',
    'ai.apikey': 'API Key',
    'ai.workspace': 'Workspace Directory',
    'ai.safety': 'Automation Safety',
    'ai.safety.sub': 'Control how the AI controls your mouse and keyboard using robotjs.',
    'ai.safety.level0': 'Disabled',
    'ai.safety.level1': 'Confirm Every Action',
    'ai.safety.level2': 'Full Auto-Pilot (Dangerous)',
    'ai.persist': 'Save Chat History',
    'ai.persist.sub': 'Keep your chat history saved persistently on this machine.',
    'ai.enable': 'Enable AI Assistant',
    'ai.enable.sub': 'Show the AI Assistant button in the main sidebar.',
    'ai.tts': 'Text-to-Speech (TTS)',
    'ai.tts.sub': 'Read AI responses aloud and show the speaker button.'
  },
  'Türkçe': {
    'settings.title': 'Ayarlar',
    'settings.feedback': 'Geri bildirim ver',
    'tab.general': 'Genel',
    'tab.window': 'Pencere',
    'tab.updates': 'Güncellemeler',
    'tab.shortcuts': 'Kısayollar',
    'tab.passwords': 'Parolalar',
    'general.language': 'Dil',
    'general.theme': 'Tema Rengi',
    'general.darkmode': 'Karanlık Mod',
    'general.addressbar': 'Adres Çubuğu',
    'general.addressbar.sub': 'Üst veya alt seçildiğinde adres çubuğu varsayılan olarak gizlenir. Göstermek için farenizi üst veya alt kenara hareket ettirmelisiniz',
    'general.autolaunch': 'Otomatik Başlat',
    'general.autolaunch.sub': 'Bilgisayarınızda oturum açtığınızda SideBrowser\'ı başlatın',
    'general.translate': 'Web Sayfalarını Çevir',
    'general.translate.sub': 'Web sayfalarını çevirmek için Çeviriyi Etkinleştir',
    'general.adblock': 'Reklam Engelleyici',
    'general.adblock.sub': 'Tüm reklamları engellemek için Reklam Engelleyici\'yi etkinleştirin',
    'general.password': 'Parola Yöneticisi',
    'general.password.sub': 'Parola yönetimi etkinleştirildiğinde giriş formlarını otomatik olarak doldur',
    'window.transparency': 'Pencere Şeffaflığı',
    'window.transparency.sub': 'Kullanıcı arayüzünün arkasındaki masaüstü şeffaflık efektini ayarlar.',
    'window.dragHeight': 'Üst Sürükleme Boşluğu',
    'window.dragHeight.sub': 'Uygulamayı sürüklemek için üst kısımda bırakılan boşluğun pikselini ayarlayın (Varsayılan: 40px)',
    'window.dynamicsidebar': 'Dinamik Kenar Çubuğu',
    'window.dynamicsidebar.sub': 'Kenar çubuğunu yaslama konumuna göre otomatik olarak iç kenara taşı',
    'window.alwaysontop': 'Her Zaman Üstte',
    'window.alwaysontop.sub': 'Tarayıcı penceresini diğer tüm uygulamaların üzerinde tut',
    'window.autocenter': 'Pencereyi Otomatik Ortala',
    'window.autocenter.sub': 'Etkinleştirildiğinde, pencere her zaman ekranın dikey merkezinde konumlandırılır.',
    'window.snapside': 'Varsayılan Yaslama Yönü',
    'window.snapside.sub': 'Tarayıcının varsayılan olarak ekranın hangi tarafına yapışması gerektiği',
    'home.search.placeholder': '${engine} ile ara veya URL gir',
    'home.shortcuts.removeTooltip': 'Silmek için sağ tıklayın',
    'home.shortcuts.add': 'Ekle',
    'home.shortcuts.modal.title': 'Yeni Kısayol Ekle',
    'home.shortcuts.modal.name': 'Ad',
    'home.shortcuts.modal.namePlaceholder': 'örn. YouTube',
    'home.shortcuts.modal.url': 'URL',
    'home.shortcuts.modal.urlPlaceholder': 'örn. youtube.com',
    'home.shortcuts.modal.cancel': 'İptal',
    'home.shortcuts.modal.add': 'Ekle',
    'home.background.change': 'Arkaplanı Değiştir',
    'updates.uptodate': 'Güncelsiniz',
    'updates.version': 'Mevcut sürüm',
    'updates.check': 'Güncellemeleri kontrol et',
    'updates.releaseNotes': 'Sürüm notları',
    'updates.preferences': 'Tercihler',
    'updates.autoCheck': 'Güncellemeleri otomatik kontrol et',
    'passwords.searchPlaceholder': 'Parolalarda ara',
    'passwords.import': 'İçe Aktar',
    'passwords.count': 'site ve uygulama',
    'passwords.notFound': 'Eşleşen parola bulunamadı',
    'passwords.importSub': 'Parolaları şuradan içe aktar:',
    'passwords.importClick': 'Bir CSV dosyası seçmek için tıklayın',
    'shortcuts.global.title': 'Global Kısayollar',
    'shortcuts.global.toggleShow': 'Pencere Göster/Gizle',
    'shortcuts.global.toggleAutohide': 'Odak Kaybolduğunda Otomatik Gizlemeyi Etkinleştir/Devre Dışı Bırak',
    'shortcuts.global.record': 'Kısayol Kaydet',
    'shortcuts.window.title': 'Pencere İçi Kısayollar',
    'shortcuts.key.newWindow': 'Yeni Pencere',
    'shortcuts.key.toggleSidebar': 'Kenar Çubuğunu Aç/Kapat',
    'shortcuts.key.nextTab': 'Sonraki sekmeye geç',
    'shortcuts.key.prevTab': 'Önceki sekmeye geç',
    'shortcuts.key.specificTab': 'Belirli bir sekmeye geç',
    'shortcuts.key.closeTab': 'Mevcut sekmeyi kapat',
    'shortcuts.key.home': 'Ana Sayfaya Git',
    'shortcuts.key.back': 'Geri',
    'shortcuts.key.forward': 'İleri',
    'shortcuts.key.zoomIn': 'Yakınlaştır',
    'shortcuts.key.zoomOut': 'Uzaklaştır',
    'shortcuts.key.zoomReset': 'Yakınlaştırmayı sıfırla',
    'shortcuts.key.refresh': 'Yenile',
    'shortcuts.key.devtools': 'Geliştirici Araçlarını Aç',
    'shortcuts.key.mute': 'Tüm Sayfaları Sustur/Sesini Aç',
    'shortcuts.key.settings': 'Ayarlar Sayfasını Aç',
    'shortcuts.key.favorite': 'Favorilere Ekle',
    'app.sidebar.back': 'Geri',
    'app.sidebar.forward': 'İleri',
    'app.sidebar.refresh': 'Yenile',
    'app.sidebar.openExternal': 'Varsayılan tarayıcıda aç',
    'app.sidebar.copyUrl': 'URL\'yi kopyala',
    'app.sidebar.independentWindow': 'Bağımsız pencere',
    'app.sidebar.unmute': 'Sesi aç',
    'app.sidebar.mute': 'Sustur',
    'app.sidebar.deviceEmulation': 'Cihaz Emülasyonu',
    'app.sidebar.clearData': 'Web sitesi verilerini temizle',
    'app.sidebar.deleteTab': 'Sekmeyi sil',
    'app.sidebar.closeWindow': 'Pencereyi Kapat',
    'app.sidebar.hideWindow': 'Pencereyi Gizle',
    'app.sidebar.autoHideFocus': 'Odak kaybında otomatik gizle',
    'app.sidebar.muteAll': 'Tüm sayfaları sustur',
    'app.sidebar.hideSidebar': 'Kenar çubuğunu gizle',
    'app.sidebar.autoSnap': 'Otomatik kenara yasla',
    'app.sidebar.settings': 'Ayarlar',
    'theme.default': 'Varsayılan',
    'theme.violet': 'Menekşe',
    'theme.orange': 'Turuncu',
    'theme.green': 'Yeşil',
    'theme.yellow': 'Sarı',
    'theme.slate': 'Arduvaz',
    'theme.stone': 'Taş',
    'theme.gray': 'Gri',
    'theme.neutral': 'Nötr',
    'theme.red': 'Kırmızı',
    'theme.rose': 'Gül',
    'theme.blue': 'Mavi',
    'mode.system': 'Sistem',
    'mode.light': 'Açık',
    'mode.dark': 'Karanlık',
    'addressbar.hidden': 'Gizli',
    'addressbar.top': 'Üst',
    'addressbar.bottom': 'Alt',
    'snap.right': 'Sağ',
    'snap.left': 'Sol',
    'browser.search.placeholder': 'Ara veya URL gir',
    'tab.ai': 'Yapay Zeka',
    'ai.provider': 'YZ Sağlayıcı',
    'ai.model': 'Model Adı',
    'ai.endpoint': 'API Uç Noktası',
    'ai.apikey': 'API Anahtarı',
    'ai.workspace': 'Çalışma Alanı Dizini',
    'ai.safety': 'Otomasyon Güvenliği',
    'ai.safety.sub': 'Yapay zekanın robotjs kullanarak fare ve klavyenizi nasıl kontrol edeceğini belirleyin.',
    'ai.safety.level0': 'Devre Dışı',
    'ai.safety.level1': 'Her Eylemi Onayla',
    'ai.safety.level2': 'Tam Otomatik Pilot (Tehlikeli)',
    'ai.persist': 'Sohbet Geçmişini Kaydet',
    'ai.persist.sub': 'Sohbet geçmişinizi bu cihazda kalıcı olarak saklayın.',
    'ai.enable': 'Yapay Zeka Asistanını Etkinleştir',
    'ai.enable.sub': 'Yapay zeka asistanı butonunu ana yan menüde göster.',
    'ai.tts': 'Metin Okuma (TTS)',
    'ai.tts.sub': 'Yapay zeka yanıtlarını sesli oku ve hoparlör butonunu göster.'
  },
  'Deutsch': {
    'settings.title': 'Einstellungen',
    'settings.feedback': 'Feedback geben',
    'tab.general': 'Allgemein',
    'tab.window': 'Fenster',
    'tab.updates': 'Updates',
    'tab.shortcuts': 'Tastenkürzel',
    'tab.passwords': 'Passwörter',
    'general.language': 'Sprache',
    'general.theme': 'Themenfarbe',
    'general.darkmode': 'Dunkler Modus',
    'general.addressbar': 'Adressleiste',
    'general.addressbar.sub': 'Wenn oben oder unten ausgewählt ist, wird die Adressleiste standardmäßig ausgeblendet. Bewegen Sie die Maus an den Rand, um sie anzuzeigen.',
    'general.autolaunch': 'Automatischer Start',
    'general.autolaunch.sub': 'SideBrowser beim Anmelden am Computer starten',
    'general.translate': 'Webseiten übersetzen',
    'general.translate.sub': 'Immersive Translate aktivieren, um Webseiten zu übersetzen',
    'general.adblock': 'Werbeblocker',
    'general.adblock.sub': 'Werbeblocker aktivieren, um alle Anzeigen zu blockieren',
    'general.password': 'Passwort-Manager',
    'general.password.sub': 'Anmeldeformulare automatisch ausfüllen, wenn der Passwort-Manager aktiviert ist',
    'window.transparency': 'Fenstertransparenz',
    'window.transparency.sub': 'Passt den Desktop-Transparenzeffekt hinter der Benutzeroberfläche an.',
    'window.dynamicsidebar': 'Dynamische Seitenleiste',
    'window.dynamicsidebar.sub': 'Seitenleiste basierend auf der Andockposition automatisch an den inneren Rand verschieben',
    'window.alwaysontop': 'Immer im Vordergrund',
    'window.alwaysontop.sub': 'Das Browserfenster über allen anderen Anwendungen halten',
    'window.autocenter': 'Fenster automatisch zentrieren',
    'window.autocenter.sub': 'Wenn aktiviert, wird das Fenster immer in der vertikalen Mitte des Bildschirms positioniert.',
    'window.snapside': 'Standard-Andockseite',
    'window.snapside.sub': 'An welcher Seite des Bildschirms der Browser standardmäßig andocken soll',
    'home.search.placeholder': 'Mit ${engine} suchen oder URL eingeben',
    'home.shortcuts.removeTooltip': 'Rechtsklick zum Entfernen',
    'home.shortcuts.add': 'Hinzufügen',
    'home.shortcuts.modal.title': 'Neues Shortcut hinzufügen',
    'home.shortcuts.modal.name': 'Name',
    'home.shortcuts.modal.namePlaceholder': 'z.B. YouTube',
    'home.shortcuts.modal.url': 'URL',
    'home.shortcuts.modal.urlPlaceholder': 'z.B. youtube.com',
    'home.shortcuts.modal.cancel': 'Abbrechen',
    'home.shortcuts.modal.add': 'Hinzufügen',
    'home.background.change': 'Hintergrund ändern',
    'updates.uptodate': 'Sie sind auf dem neuesten Stand',
    'updates.version': 'Aktuelle Version',
    'updates.check': 'Nach Updates suchen',
    'updates.releaseNotes': 'Versionshinweise',
    'updates.preferences': 'Einstellungen',
    'updates.autoCheck': 'Automatisch nach Updates suchen',
    'passwords.searchPlaceholder': 'Passwörter suchen',
    'passwords.import': 'Importieren',
    'passwords.count': 'Websites und Apps',
    'passwords.notFound': 'Keine passenden Passwörter gefunden',
    'passwords.importSub': 'Passwörter importieren von',
    'passwords.importClick': 'Klicken Sie, um eine CSV-Datei auszuwählen',
    'shortcuts.global.title': 'Globale Tastenkürzel',
    'shortcuts.global.toggleShow': 'Fenster anzeigen/ausblenden',
    'shortcuts.global.toggleAutohide': 'Automatisches Ausblenden bei Fokusverlust aktivieren/deaktivieren',
    'shortcuts.global.record': 'Tastenkürzel aufnehmen',
    'shortcuts.window.title': 'In-Fenster Tastenkürzel',
    'shortcuts.key.newWindow': 'Neues Fenster',
    'shortcuts.key.toggleSidebar': 'Seitenleiste umschalten',
    'shortcuts.key.nextTab': 'Zum nächsten Tab wechseln',
    'shortcuts.key.prevTab': 'Zum vorherigen Tab wechseln',
    'shortcuts.key.specificTab': 'Zu einem bestimmten Tab wechseln',
    'shortcuts.key.closeTab': 'Aktuellen Tab schließen',
    'shortcuts.key.home': 'Zur Startseite',
    'shortcuts.key.back': 'Zurück',
    'shortcuts.key.forward': 'Vorwärts',
    'shortcuts.key.zoomIn': 'Vergrößern',
    'shortcuts.key.zoomOut': 'Verkleinern',
    'shortcuts.key.zoomReset': 'Zoom zurücksetzen',
    'shortcuts.key.refresh': 'Aktualisieren',
    'shortcuts.key.devtools': 'DevTools öffnen',
    'shortcuts.key.mute': 'Alle Seiten stummschalten/aktivieren',
    'shortcuts.key.settings': 'Einstellungsseite öffnen',
    'shortcuts.key.favorite': 'Favorit hinzufügen',
    'app.sidebar.back': 'Zurück',
    'app.sidebar.forward': 'Vorwärts',
    'app.sidebar.refresh': 'Aktualisieren',
    'app.sidebar.openExternal': 'Im Standardbrowser öffnen',
    'app.sidebar.copyUrl': 'URL kopieren',
    'app.sidebar.independentWindow': 'Unabhängiges Fenster',
    'app.sidebar.unmute': 'Ton einschalten',
    'app.sidebar.mute': 'Stummschalten',
    'app.sidebar.deviceEmulation': 'Geräteemulation',
    'app.sidebar.clearData': 'Webseitendaten entfernen',
    'app.sidebar.deleteTab': 'Tab löschen',
    'app.sidebar.closeWindow': 'Fenster schließen',
    'app.sidebar.hideWindow': 'Fenster ausblenden',
    'app.sidebar.autoHideFocus': 'Automatisches Ausblenden bei Fokusverlust',
    'app.sidebar.muteAll': 'Alle Seiten stummschalten',
    'app.sidebar.hideSidebar': 'Seitenleiste ausblenden',
    'app.sidebar.autoSnap': 'Automatisches Andocken',
    'app.sidebar.settings': 'Einstellungen',
    'theme.default': 'Standard',
    'theme.violet': 'Violett',
    'theme.orange': 'Orange',
    'theme.green': 'Grün',
    'theme.yellow': 'Gelb',
    'theme.slate': 'Schiefer',
    'theme.stone': 'Stein',
    'theme.gray': 'Grau',
    'theme.neutral': 'Neutral',
    'theme.red': 'Rot',
    'theme.rose': 'Rosa',
    'theme.blue': 'Blau',
    'mode.system': 'System',
    'mode.light': 'Hell',
    'mode.dark': 'Dunkel',
    'addressbar.hidden': 'Ausgeblendet',
    'addressbar.top': 'Oben',
    'addressbar.bottom': 'Unten',
    'snap.right': 'Rechts',
    'snap.left': 'Links',
    'browser.search.placeholder': 'Suchen oder URL eingeben',
    'tab.ai': 'KI-Assistent',
    'ai.provider': 'KI-Anbieter',
    'ai.model': 'Modellname',
    'ai.endpoint': 'API-Endpunkt',
    'ai.apikey': 'API-Schlüssel',
    'ai.workspace': 'Arbeitsbereichsverzeichnis',
    'ai.safety': 'Automationssicherheit',
    'ai.safety.sub': 'Steuern Sie, wie die KI Ihre Maus und Tastatur über robotjs steuert.',
    'ai.safety.level0': 'Deaktiviert',
    'ai.safety.level1': 'Jede Aktion bestätigen',
    'ai.safety.level2': 'Vollständiger Auto-Pilot (Gefährlich)',
    'ai.persist': 'Chatverlauf speichern',
    'ai.persist.sub': 'Speichern Sie Ihren Chatverlauf dauerhaft auf diesem Gerät.',
    'ai.enable': 'KI-Assistent aktivieren',
    'ai.enable.sub': 'KI-Assistent-Taste in der Hauptseitenleiste anzeigen.',
    'ai.tts': 'Text-to-Speech (TTS)',
    'ai.tts.sub': 'KI-Antworten vorlesen und Lautsprechertaste anzeigen.'
  }
} as const;

type Language = keyof typeof translations;
type TranslationKey = keyof typeof translations['English'];

export function useTranslation() {
  const { settings } = useSettings();
  
  const t = (key: TranslationKey, data?: Record<string, string>): string => {
    const lang = (settings.language as Language) || 'English';
    const dict = translations[lang] || translations['English'];
    let text = (dict as any)[key] || (translations['English'] as any)[key] || key;
    if (data) {
      Object.entries(data).forEach(([k, v]) => {
        text = text.replace(`\${${k}}`, v);
      });
    }
    return text;
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
  shortcutShowHide: string;
  shortcutAutoHide: string;
  homeBackground: number;
  searchEngine: string;
  dynamicSidebar: boolean;
  shortcuts: Shortcut[];
  aiProvider: 'Ollama' | 'LM Studio' | 'OpenAI' | 'Anthropic' | 'Gemini' | 'Custom';
  aiModel: string;
  aiApiKey: string;
  aiEndpoint: string;
  aiWorkspacePath: string;
  aiRobotSafetyLevel: number;
  aiPersistHistory: boolean;
  aiEnabled: boolean;
  aiTtsEnabled: boolean;
  dragRegionHeight: number;
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
  autoCenter: false,
  transparency: 0.95,
  defaultSnapSide: 'right',
  autoUpdate: true,
  shortcutShowHide: '',
  shortcutAutoHide: '',
  homeBackground: 0,
  searchEngine: 'Google',
  dynamicSidebar: true,
  shortcuts: [
    { id: '1', name: 'Google', url: 'https://google.com' },
    { id: '2', name: 'Gemini', url: 'https://gemini.google.com' },
    { id: '3', name: 'Notion', url: 'https://notion.so' },
    { id: '4', name: 'X', url: 'https://x.com' },
    { id: '5', name: 'Youtube', url: 'https://youtube.com' },
  ],
  aiProvider: 'Ollama',
  aiModel: 'llama3',
  aiApiKey: '',
  aiEndpoint: 'http://localhost:11434',
  aiWorkspacePath: '',
  aiRobotSafetyLevel: 1,
  aiPersistHistory: true,
  aiEnabled: true,
  aiTtsEnabled: false,
  dragRegionHeight: 40,
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
      if (key === 'autoCenter') {
        (window as any).electronAPI.setAutoCenter(value);
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
