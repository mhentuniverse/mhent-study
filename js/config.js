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
        URL: "https://ctzkgchjheirxwejctvl.supabase.co",
        KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0emtnY2hqaGVpcnh3ZWpjdHZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjA0MTgsImV4cCI6MjA5MTgzNjQxOH0.Wl-sBpH1VvcR6-Y4D4UAVm1f5_brGK3cVIHRJBEhOJ0"
    },
    GEMINI_API_KEY: "" // Hỗ trợ đưa key hoặc lấy từ Backend/Firebase Function khi thi AI
};

window.firebaseConfig = window.MHENT_CONFIG.FIREBASE;
window.supabaseUrl = window.MHENT_CONFIG.SUPABASE.URL;
window.supabaseKey = window.MHENT_CONFIG.SUPABASE.KEY;
