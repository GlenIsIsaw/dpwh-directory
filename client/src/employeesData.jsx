import { createContext, useContext, useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";

const FIELDS = [
  "idNumber", "lastName", "firstName", "middleName", "suffix",
  "department", "position", "contact", "hireDate", "status",
  "address", "birthday", "emergencyName", "emergencyContact",
  "nickname", "employmentType",
];

// ---- one shared live list for the whole app ----
const EmployeesContext = createContext({ employees: [], loading: true, error: "" });

export function EmployeesProvider({ children }) {
  const [state, setState] = useState({ employees: [], loading: true, error: "" });

  useEffect(() => {
    return onSnapshot(
      collection(db, "employees"),
      { includeMetadataChanges: true },
      (snap) => {
        const employees = snap.docs
          .map((d) => ({ id: d.id, ...d.data(), pending: d.metadata.hasPendingWrites }))
          .sort(
            (a, b) =>
              (a.lastName || "").localeCompare(b.lastName || "") ||
              (a.firstName || "").localeCompare(b.firstName || "")
          );
        setState({ employees, loading: false, error: "" });
      },
      () => setState({ employees: [], loading: false, error: "Could not load employees" })
    );
  }, []);

  return <EmployeesContext.Provider value={state}>{children}</EmployeesContext.Provider>;
}

export const useEmployees = () => useContext(EmployeesContext);

// ---- saving ----
// Writes are not awaited on purpose: offline, a write only "finishes" once the
// server confirms, so the app lets them queue and syncs them later.
function reportError(err) {
  console.error(err);
  const message =
    err && err.code === "permission-denied"
      ? "You do not have permission to do that."
      : "The change could not be saved.";
  window.dispatchEvent(new CustomEvent("data-error", { detail: message }));
}

function clean(form) {
  const data = {};
  FIELDS.forEach((f) => {
    const value = String(form[f] ?? "").trim();
    data[f] = value === "" ? null : value;
  });
  data.status = data.status || "Active";
  return data;
}

// photo: undefined = keep the current photo, null = no photo, string = new photo
export function saveEmployee({ id, form, photo }) {
  const data = clean(form);
  if (!data.lastName || !data.firstName) {
    throw new Error("Last name and first name are required");
  }
  const uid = auth.currentUser ? auth.currentUser.uid : null;
  data.updatedAt = Date.now();
  data.updatedBy = uid;

  if (id) {
    if (photo !== undefined) data.photo = photo;
    updateDoc(doc(db, "employees", id), data).catch(reportError);
    return id;
  }

  data.photo = photo || null;
  data.createdAt = Date.now();
  data.createdBy = uid;
  const ref = doc(collection(db, "employees"));
  setDoc(ref, data).catch(reportError);
  return ref.id;
}

export function removeEmployee(id) {
  deleteDoc(doc(db, "employees", id)).catch(reportError);
}

// ---- photos: shrink in the browser, keep as a small JPEG text string ----
export function compressImage(file, maxSize = 640, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image"));
    };
    img.src = url;
  });
}