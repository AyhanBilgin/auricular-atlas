import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js';
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCUA0ZD8KhmWh-jRInG-VAObzgil8vUKyw",
  authDomain: "auricular-ai-atlas.firebaseapp.com",
  projectId: "auricular-ai-atlas",
  storageBucket: "auricular-ai-atlas.firebasestorage.app",
  messagingSenderId: "856577091013",
  appId: "1:856577091013:web:1c2e480b8dd65f95d9d7ac"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
