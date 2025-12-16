// === Global State ===

// Environment Detection
const isTizen = typeof webapis !== 'undefined' && webapis.avplay;
var _MacAddr =  typeof webapis !== 'undefined' ? webapis.network.getEthernetMac() : "web";
_MacAddr = _MacAddr.toLowerCase();
const MacAddr = "v3_"+_MacAddr;

let isTestMode = false;
// 1. ADD: Configuration Constants
const subtitleConfig = {
    sizes: {
        small: "1.5rem",
        medium: "2rem",   // Default
        large: "2.7rem",
        'x-large': "3.5rem",
        "xx-large": "4.5rem",
        "xxx-large": "4.5rem",
    },
    colors: {
        white: "#FFFFFF",
        yellow: "#FFFF00",
        red: "#FF0000",
        blue: "#00FFFF",
        green: "#00FF00",
        black: "#000000"
    },
    backgrounds: {
        transparent: "rgba(0,0,0,0)",
        black: "rgba(0,0,0,1)",
        black_half: "rgba(0,0,0,0.5)",
        black_quarter: "rgba(0,0,0,0.75)" 
    },
    fonts: [
        "Arial", "Verdana", "Tahoma", "Trebuchet MS", 
        "Times New Roman", "Georgia", "Courier New", 
        "Impact", "Comic Sans MS", "Helvetica"
    ]
};
const playerSkins = [
    { id: 'skin-lite', name: 'bleu lite' },
    { id: 'skin-netflix', name: 'Netflex style' },
    { id: 'skin-neon-bolt', name: 'Neon Bolt' },
    { id: 'skin-simple', name: 'Simple' },

];
// Default Settings
const defaultUserSettings = {
    username: 'default',
    language: 'en', // <--- NEW: Default Language
    favorites: [], 
    watching: {}, 
    theme: 'theme-sonic',
    player_skin: playerSkins[0].id,
    hiddenCategories: [],
    pinnedCategories: [],
    pl: 0, 
    gridCols: 5,
    useCache: true,
    autoPlayNextEpisode: true,
    rememberLastPosition: true,
    showAdultContent: false,
    cacheAllCategorieItems: true,
    privacyAccepted: false, 
    xtreamConfig: [],
    subtitle: {
        size: 'medium',
        color: 'white',
        background: 'transparent',
        font: 'Arial'
    }
};

// Firebase Config (Placeholder)
const firebaseConfig = {
    apiKey: "AIzaSyClgzoMBEKizx-r7abMvAmLgGpk_p748IU",
    authDomain: "iptv-8b60c.firebaseapp.com",
    projectId: "iptv-8b60c",
    storageBucket: "iptv-8b60c.firebasestorage.app",
    messagingSenderId: "259048691910",
    appId: "1:259048691910:web:b57f9eeda5546ce4d8dfc7"
  };

// Global Runtime State
let currentUsername = '';
let userSettings = { ...defaultUserSettings };
let xtreamConfig = null; // Will be set after login
let apiBaseUrl = '';
let firebaseDb = null; // Firestore reference


// Navigation State
let navigationStack = [];
let focus_history = {};
let initialHash = ''; 

// Search State
let searchState = {
    active: false,
    query: '',
    originalItems: [] 
};

// Virtualization State
let virtualList = null; 
let virtualListItems = []; 
let virtualListType = ''; 
let virtualListContext = {}; 
let focusedVirtualIndex = 0;
let virtualListMap = new Map();

// Player State
let isTizenPlaying = false;
let tizenOverlayActive = false;
let tizenModalActive = false;
let saveProgressInterval;
let clockInterval;

// Tizen Player Info
let tizenPlayerInfo = {
    audioTracks: [],
    subtitleTracks: [],
    width: 0,
    height: 0,
    duration: 0,
    currentAudioIndex: -1,
    currentSubtitleIndex: -1
};

const placeholderImg = new Image();
placeholderImg.src = "assets/placeholder.jpg";
const PLACEHOLDER_IMG = placeholderImg.src;

const erroredImg = new Image();
erroredImg.src = "assets/errored.jpg";
const ERRORED_IMG = erroredImg.src;


const capabilityKeys = [
            "http://tizen.org/system/model_name",
            "http://tizen.org/system/tizenid",
        ];