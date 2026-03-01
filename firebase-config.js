// Firebase Configuration
// IMPORTANT: Replace these empty strings with your actual Firebase project config
// You can find this in your Firebase Console -> Project Settings -> General -> Web App

const firebaseConfig = {
    apiKey: "AIzaSyCkfrw_EoYjccGE8GoYRpZKT28aoPmARjU",
    authDomain: "ms-education-point-new.firebaseapp.com",
    projectId: "ms-education-point-new",
    storageBucket: "ms-education-point-new.firebasestorage.app",
    messagingSenderId: "832068555134",
    appId: "1:832068555134:web:624f3b07d953a346e5e32f"
};

// Initialize Firebase only if config is somewhat valid to prevent console errors immediately
window.db = null;
if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    window.db = firebase.firestore();
} else {
    console.warn("Firebase config is missing! Payment features will not work until you add your config to firebase-config.js");
}
