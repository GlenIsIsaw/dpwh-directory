// letters incl. accents (ñ, é, ...) — the same set the database rules use
const L = "A-Za-zÀ-ÖØ-öø-ÿ";

export const cleanName = (v) => v.replace(new RegExp(`[^${L} .'’-]`, "g"), "");
export const cleanNickname = (v) => v.replace(new RegExp(`[^${L}0-9 .'’-]`, "g"), "");
export const cleanId = (v) => v.replace(/[^A-Za-z0-9-]/g, "");
export const cleanAddress = (v) => v.replace(new RegExp(`[^${L}0-9 .,#'’/-]`, "g"), "");
export const cleanPhone = (v) => v.replace(/\D/g, "").slice(0, 11);
export const cleanSearch = (v) =>
  v.replace(new RegExp(`[^${L}0-9 .'’/-]`, "g"), "").slice(0, 60);

export const PHONE_RE = /^09\d{9}$/;