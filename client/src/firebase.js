import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
apiKey: "AIzaSyA9Q2w990iT_OShZ3Nc35Jvsujy48t_424",
  authDomain: "dpwh-directory.firebaseapp.com",
  projectId: "dpwh-directory",
  storageBucket: "dpwh-directory.firebasestorage.app",
  messagingSenderId: "87535828684",
  appId: "1:87535828684:web:af6433c53daf25ab8c8c69",

};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// second app instance: lets an admin create other people's logins without being signed out
export const secondaryAuth = getAuth(initializeApp(firebaseConfig, "secondary"));

// keeps a copy of the data in the browser so it works offline
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    cacheSizeBytes: 200 * 1024 * 1024,
    tabManager: persistentMultipleTabManager(),
  }),
});