import { randomInt } from "node:crypto";
import { HttpError } from "./http.js";

export const YEARS = ["FY", "SY", "TY"];

export const text = (v, max = 200) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export function req(v, label, max = 200, min = 1) {
  const s = text(v, max + 1);
  if (s.length < min) throw new HttpError(400, `${label} is required.`);
  if (s.length > max) throw new HttpError(400, `${label} is too long.`);
  return s;
}

export function email(v, label = "Email") {
  const s = text(v, 255).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(s)) throw new HttpError(400, `Enter a valid ${label.toLowerCase()}.`);
  return s;
}

export function mobile(v, label = "Mobile number") {
  let s = String(v ?? "").replace(/[\s-]/g, "");
  s = s.replace(/^(\+91|91|0)(?=\d{10}$)/, "");
  if (!/^[6-9]\d{9}$/.test(s)) throw new HttpError(400, `Enter a valid 10-digit ${label.toLowerCase()}.`);
  return s;
}

export function year(v) {
  const s = text(v, 10).toUpperCase();
  if (!YEARS.includes(s)) throw new HttpError(400, "Select a valid course year.");
  return s;
}

export function roll(v, label = "Roll number") {
  const s = text(v, 30);
  if (!s) throw new HttpError(400, `${label} is required.`);
  if (!/^[A-Za-z0-9][A-Za-z0-9 ./_-]*$/.test(s)) throw new HttpError(400, `${label} has invalid characters.`);
  return s;
}

export function password(v) {
  const s = String(v ?? "");
  if (s.length < 10 || s.length > 128 || !/[A-Za-z]/.test(s) || !/\d/.test(s))
    throw new HttpError(400, "Password must be 10-128 characters and include a letter and a number.");
  return s;
}

// "Sathaye College" and "sathaye  college." map to the same key.
export const collegeKey = (name) =>
  text(name, 200).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
export function genCode(len) {
  let s = "";
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return s;
}
export const normCode = (v) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);

export const isUniqueViolation = (e) => e && (e.code === "23505" || /duplicate key/i.test(e.message || ""));
export const violated = (e) => String(e?.constraint || e?.detail || e?.message || "");

export const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
