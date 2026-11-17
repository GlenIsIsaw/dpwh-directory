import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";

const EMAIL_DOMAIN = "dpwh-directory.local";

export const usernameToEmail = (username) =>
  `${String(username).trim().toLowerCase()}@${EMAIL_DOMAIN}`;

export async function login(username, password) {
  try {
    await signInWithEmailAndPassword(auth, usernameToEmail(username), password);
  } catch (err) {
    const messages = {
      "auth/invalid-credential": "Wrong username or password",
      "auth/user-not-found": "Wrong username or password",
      "auth/wrong-password": "Wrong username or password",
      "auth/invalid-email": "Wrong username or password",
      "auth/too-many-requests": "Too many attempts. Try again later.",
      "auth/network-request-failed": "No internet connection. The first login needs internet.",
      "auth/user-disabled": "This account is disabled",
    };
    throw new Error(messages[err.code] || "Could not sign in");
  }
}

export const logout = () => signOut(auth);

export async function changeMyPassword(currentPassword, newPassword) {
  const fbUser = auth.currentUser;
  if (!fbUser) throw new Error("Not logged in");
  try {
    const credential = EmailAuthProvider.credential(fbUser.email, currentPassword);
    await reauthenticateWithCredential(fbUser, credential);
    await updatePassword(fbUser, newPassword);
  } catch (err) {
    if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
      throw new Error("Current password is wrong");
    }
    if (err.code === "auth/network-request-failed") {
      throw new Error("Changing a password needs an internet connection");
    }
    throw new Error("Could not change password");
  }
}

// returns [user, message]
// user: undefined = checking, null = logged out, or { id, username, fullName, role }
export function useAuth() {
  const [user, setUser] = useState(undefined);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let unsubProfile = null;

    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (!fbUser) {
        setUser(null);
        return;
      }

      // the profile document decides the role and whether the account is active
      unsubProfile = onSnapshot(
        doc(db, "users", fbUser.uid),
        (snap) => {
          // wait for the server's answer instead of trusting an empty cache
          if (!snap.exists() && snap.metadata.fromCache) return;

          const data = snap.data();
          if (!snap.exists() || data.active !== true) {
            setMessage("This account has no access. Ask an administrator.");
            signOut(auth);
            return;
          }
          setMessage("");
          setUser({
            id: fbUser.uid,
            username: data.username,
            fullName: data.fullName || "",
            role: data.role,
          });
        },
        () => {
          setMessage("Could not load your account. Check your internet connection.");
          signOut(auth);
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  return [user, message];
}