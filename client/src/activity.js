import { addDoc, collection } from "firebase/firestore";
import { db } from "./firebase";

let currentUser = null;

export function setLogUser(user) {
  currentUser = user;
}

// Not awaited on purpose: offline, the entry is saved on this computer and
// uploaded later, like any other change.
export function logActivity(action, details) {
  if (!currentUser) return;
  addDoc(collection(db, "activity"), {
    action,
    details: details || null,
    userId: currentUser.id,
    username: currentUser.username,
    fullName: currentUser.fullName || "",
    at: Date.now(),
  }).catch((err) => console.error("Log error:", err));
}