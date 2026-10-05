/**
 * MHENT STUDY - GLOBAL CONFIGURATION
 * Đồng bộ với hệ sinh thái MHEnt Universe (Firebase & Supabase)
 */
window.MHENT_CONFIG = window.MHENT_CONFIG || {
    FIREBASE: {
        apiKey: "AIzaSyDKDAAnmeqWFRqUZWTVa--m5-cORyHCoUk",
        authDomain: "mhentuniverse.firebaseapp.com",
        projectId: "mhentuniverse",
        storageBucket: "mhentuniverse.firebasestorage.app",
        messagingSenderId: "377044322952",
        appId: "1:377044322952:web:d657d1b0806d37d9246d3d"
    },
    SUPABASE: {
        URL: "https://ctzkgchjheirxwejctvl.supabase.co", // Kho dữ liệu học tập chính (Study Decks & Profiles)
        KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0emtnY2hqaGVpcnh3ZWpjdHZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjA0MTgsImV4cCI6MjA5MTgzNjQxOH0.Wl-sBpH1VvcR6-Y4D4UAVm1f5_brGK3cVIHRJBEhOJ0",
        DICT_URL: "https://hwklqefdwskmwwyofthb.supabase.co", // Kho Từ điển AI & Lời bài hát Music Lyrics Hub
        DICT_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3a2xxZWZkd3NrbXd3eW9mdGhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMTUzODYsImV4cCI6MjEwNjc5MTM4Nn0.VV2By40CkQLEq9OVU8e4HooYt-XHihGItFvOaAV78SU"
    },
    GEMINI_API_KEY: "", // Quản lý an toàn qua Backend Worker hoặc localStorage('mhent_ai_api_key')
    AISA_API_ENDPOINT: "https://api.mhentuniverse.com",
    AISA_MODEL: "aisa-scholar-v1" // Multiverse Academic & Language Sensei
};

window.firebaseConfig = window.MHENT_CONFIG.FIREBASE;
window.supabaseUrl = window.MHENT_CONFIG.SUPABASE.URL;
window.supabaseKey = window.MHENT_CONFIG.SUPABASE.KEY;
window.aisaEndpoint = window.MHENT_CONFIG.AISA_API_ENDPOINT;
window.aisaModel = window.MHENT_CONFIG.AISA_MODEL;
