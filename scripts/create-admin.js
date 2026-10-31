// Creates (or resets the password of) an admin account. No default credentials exist.
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { q } from "../lib/db.js";
import { hashPassword } from "../lib/auth.js";
import { email as vEmail, password as vPassword } from "../lib/validate.js";

const rl = createInterface({ input: stdin, output: stdout });
const mail = vEmail(await rl.question("Admin email: "));
// NOTE: the password is echoed while typing. Run this only on your own machine.
const pw = vPassword(await rl.question("Password (10+ chars, letter + number): "));
rl.close();
const hash = await hashPassword(pw);
await q(
  `INSERT INTO admin_users (email, password_hash) VALUES ($1,$2)
   ON CONFLICT (lower(email)) DO UPDATE SET password_hash=EXCLUDED.password_hash, active=true`, [mail, hash]);
console.log("Admin saved:", mail);
