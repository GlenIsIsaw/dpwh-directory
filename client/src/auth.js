import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db, secondaryAuth } from "./firebase";
import { setLogUser, logActivity } from "./activity";

const EMAIL_DOMAIN = "dpwh-directory.local";
let pendingLoginLog = false;

export const usernameToEmail = (username) =>
  `${String(username).trim().toLowerCase()}@${EMAIL_DOMAIN}`;

export async function login(username, password) {
  try {
    pendingLoginLog = true;
    await signInWithEmailAndPassword(auth, usernameToEmail(username), password);
  } catch (err) {
    pendingLoginLog = false;
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
    logActivity("PASSWORD_CHANGED");
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
        setLogUser(null);
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
          const me = {
            id: fbUser.uid,
            username: data.username,
            fullName: data.fullName || "",
            role: data.role,
          };
          setLogUser(me);
          setUser(me);
          if (pendingLoginLog) {
            pendingLoginLog = false;
            logActivity("LOGIN");
          }
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

export async function createStaffUser({ username, fullName, password, role }) {
  const clean = String(username).trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(clean)) {
    throw new Error("Username: 3 to 30 letters, numbers, dots, dashes or underscores (no spaces)");
  }
  if (String(fullName).trim().length < 2) throw new Error("Full name is required");
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  let cred;
  try {
    cred = await createUserWithEmailAndPassword(secondaryAuth, usernameToEmail(clean), password);
  } catch (err) {
    if (err.code === "auth/email-already-in-use") throw new Error("That username already exists");
    if (err.code === "auth/weak-password") throw new Error("That password is too weak");
    if (err.code === "auth/network-request-failed") {
      throw new Error("Creating accounts needs an internet connection");
    }
    throw new Error("Could not create the account");
  }

  try {
    await setDoc(doc(db, "users", cred.user.uid), {
      username: clean,
      fullName: String(fullName).trim(),
      role,
      active: true,
      createdAt: Date.now(),
    });
    logActivity("USER_CREATED", `${String(fullName).trim()} (${clean}, ${role})`);
  } catch {
    throw new Error(
      `The login was created but its profile was not saved (UID: ${cred.user.uid}). Check the connection and the rules.`
    );
  } finally {
    await signOut(secondaryAuth);
  }
}