import { useState, useEffect, useCallback, useRef } from "react";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { api } from "./src/api.js";
import LoginScreen from "./src/components/LoginScreen.jsx";
import SignUpScreen from "./src/components/SignUpScreen.jsx";
import RecoverScreen from "./src/components/RecoverScreen.jsx";
import HomeScreen from "./src/components/HomeScreen.jsx";
import SendScreen from "./src/components/SendScreen.jsx";
import HistoryScreen from "./src/components/HistoryScreen.jsx";
import LoanScreen from "./src/components/LoanScreen.jsx";
import LearnScreen from "./src/components/LearnScreen.jsx";
import { ReceiveScreen, QRScannerScreen, NFCTransferScreen } from "./src/components/OfflineScreens.jsx";
import BluetoothTransferScreen from "./src/components/BluetoothTransferScreen.jsx";

/* ═══════════════════════════════════════════
   WALLETNG  ·  BLUETOOTH GATT SERVICE SPEC
   ─────────────────────────────────────────
   Service UUID   : 0000BEBA-0000-1000-8000-00805F9B34FB
   TX Char UUID   : 0000BEB1-0000-1000-8000-00805F9B34FB
   ACK Char UUID  : 0000BEB3-0000-1000-8000-00805F9B34FB

   Packet format (JSON → UTF-8, max 512B):
   { v, type, txId, sender, receiver, amount,
     currency, note, ts, sig }
═══════════════════════════════════════════ */

const BT_SERVICE = "0000beba-0000-1000-8000-00805f9b34fb";
const BT_TX_CHAR = "0000beb1-0000-1000-8000-00805f9b34fb";
const BT_ACK_CHAR = "0000beb3-0000-1000-8000-00805f9b34fb";

async function hashPayload(data) {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode("WALLETNG_SECRET_KEY"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
    return "sha256:" + Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
  } catch (e) { return "unsigned"; }
}

function encodePacket(obj) { return new TextEncoder().encode(JSON.stringify(obj)); }
function decodePacket(buf) { return JSON.parse(new TextDecoder().decode(buf)); }

const C = {
  // Teal primary
  g900: "#042F2E", g800: "#0F172A", g700: "#0D9488", g600: "#14B8A6", g500: "#2DD4BF", g400: "#5EEAD4", g100: "#F0FDFA",
  // Indigo accent
  o600: "#4F46E5", o500: "#6366F1", o400: "#818CF8", o300: "#A5B4FC", o100: "#EEF2FF",
  white: "#FFFFFF", bg: "#F8FAFC", card: "#FFFFFF", border: "#E2E8F0",
  text: "#0F172A", sub: "#64748B", muted: "#94A3B8", red: "#EF4444", yellow: "#F59E0B", blue: "#3B82F6", btBlue: "#6366F1",
};

const DEFAULT_PHONE = "08034521000", DEFAULT_PIN = "1234";
const USERS = [{ phone: DEFAULT_PHONE, pin: DEFAULT_PIN, name: "Bola Adesanya", balance: 500000, accountNo: "0034521000" }];
const SEED_TXNS = [
  { id: "TX001", type: "credit", party: "Amaka Obi", amount: 4500, note: "Fabric payment", date: "2026-03-10", time: "09:14", status: "confirmed", channel: "online" },
  { id: "TX002", type: "debit", party: "Emeka Store", amount: 1200, note: "Spare parts", date: "2026-03-10", time: "11:30", status: "confirmed", channel: "bluetooth" },
  { id: "TX003", type: "credit", party: "Chidi Motors", amount: 7000, note: "Transport fee", date: "2026-03-09", time: "16:45", status: "confirmed", channel: "qr" },
  { id: "TX004", type: "debit", party: "Ngozi Foods", amount: 850, note: "Lunch supply", date: "2026-03-09", time: "13:00", status: "confirmed", channel: "nfc" },
  { id: "TX005", type: "debit", party: "Kemi Tailors", amount: 3200, note: "Sewing materials", date: "2026-03-08", time: "10:20", status: "pending", channel: "bluetooth" },
  { id: "TX006", type: "credit", party: "Ayo Agro", amount: 11000, note: "Harvest proceeds", date: "2026-03-07", time: "08:05", status: "confirmed", channel: "online" },
];
const EDU = [
  { id: 1, emoji: "💰", title: "Save the Small Coins", body: "Setting aside just 10% of every payment builds a real safety net faster than you think.", tag: "Saving", color: C.g600 },
  { id: 2, emoji: "📊", title: "Budget Like a Trader", body: "Separate business money from personal funds. List your top 3 weekly costs and watch your cash.", tag: "Budgeting", color: C.o500 },
  { id: 3, emoji: "📈", title: "Build Business Credit", body: "Every recorded transaction strengthens your financial history and raises your loan eligibility.", tag: "Business", color: C.blue },
  { id: 4, emoji: "🔐", title: "Keep Your PIN Safe", body: "Never share your wallet PIN or recovery phrase. A real support agent will never ask for it.", tag: "Security", color: C.red },
];

function loanScore(txns) {
  const ok = txns.filter(t => t.status === "confirmed");
  const inflow = ok.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const outflow = ok.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0);
  return Math.round(Math.min(ok.length / 10, 1) * 40 + (inflow > 0 ? Math.min(inflow / (outflow + 1), 2) / 2 * 60 : 0));
}
const fmtAmt = n => "₦" + n.toLocaleString("en-NG");
const fmtDate = d => new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
const getInit = n => n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

const Ic = {
  Home: () => <svg viewBox="0 0 24 24" fill="currentColor" width="21" height="21"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>,
  Send: () => <svg viewBox="0 0 24 24" fill="currentColor" width="21" height="21"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>,
  History: () => <svg viewBox="0 0 24 24" fill="currentColor" width="21" height="21"><path d="M13 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7V3zm-1 5v5l4.25 2.52.77-1.32-3.52-2.1V8H12z" /></svg>,
  Loan: () => <svg viewBox="0 0 24 24" fill="currentColor" width="21" height="21"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" /></svg>,
  Learn: () => <svg viewBox="0 0 24 24" fill="currentColor" width="21" height="21"><path d="M12 3L1 9l4 2.18V15c0 3.31 5.83 5 9 5s9-1.69 9-5v-3.82L23 9 12 3zm6 10.33v1.67c0 1.38-3.12 3-6 3s-6-1.62-6-3v-1.67l6 3.27 6-3.27z" /></svg>,
  Wifi: () => <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M1 9l2 2c5.52-5.52 14.48-5.52 20 0l2-2C18.93 2.93 5.07 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 0 0-6 0zm-4-4 2 2a7.074 7.074 0 0 1 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" /></svg>,
  NoWifi: () => <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M22.99 9C19.15 5.16 13.8 3.76 8.84 4.78L11 6.94c3.05-.47 6.28.48 8.61 2.81l2.38-2.38zM1.41 1.4 0 2.81l4.39 4.39C3.14 8.2 2.28 9.1 1 10.39l2.38 2.38C4.74 11.4 6.2 10.55 7.81 10L10 12.19c-1.74.84-3.3 2.03-4.62 3.56L7.76 18a14.62 14.62 0 0 1 4.7-3.25L15.38 17.7C13.45 18.58 11.73 19.97 10.6 21.86L12 23.27l1.4-1.41c-.53-.88-1.24-1.63-2.03-2.22l2.78 2.78 1.41-1.41L1.41 1.4z" /></svg>,
  Bell: () => <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" /></svg>,
  Eye: () => <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>,
  EyeOff: () => <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27z" /></svg>,
  ArrowUp: () => <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z" /></svg>,
  ArrowDn: () => <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z" /></svg>,
  QR: () => <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm8-12v8h8V3h-8zm6 6h-4V5h4v4zm-5.99 4h2v2h-2zm2 2h2v2h-2zm-2 2h2v2h-2zm4-4h2v2h-2zm-2 2h2v2h-2zm2 2h2v2h-2zM20 17h2v2h-2z" /></svg>,
  BT: () => <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M17.71 7.71 12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z" /></svg>,
  NFC: () => <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5 14.5h-2V13h-2v-2h4v5.5zm-3-9c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5S12 8.33 12 7.5z" /></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>,
  Clock: () => <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" /></svg>,
  Chevron: () => <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>,
  Shield: () => <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" /></svg>,
  Finger: () => <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M17.5 12c0 .55-.04 1.08-.12 1.6l1.55 1.55C19.3 14.12 19.5 13.08 19.5 12c0-4.14-2.83-7.61-6.66-8.62-.55-.14-1.11.19-1.25.74-.14.55.19 1.11.74 1.25C15.22 6.08 17.5 8.82 17.5 12zM12 5.5c-.28 0-.55.02-.82.05L9.56 4c.78-.19 1.6-.29 2.44-.29 2.1 0 4.03.67 5.6 1.8l-1.46 1.46C15.1 6.09 13.62 5.5 12 5.5zM3.27 4.27L2 5.54l2.08 2.08C3.39 8.74 3 10.32 3 12c0 2.5.96 4.77 2.53 6.47l-1.06 1.06C2.95 17.45 2 14.82 2 12c0-2.07.52-4.02 1.45-5.73L1.27 4.09 2.7 2.66l.57.57zM12 19.5c-1.77 0-3.4-.59-4.72-1.58l-1.43 1.43C7.47 20.54 9.64 21.5 12 21.5c2.12 0 4.08-.71 5.65-1.9l-1.44-1.44c-1.2.86-2.67 1.34-4.21 1.34zm6.73-2.23C19.52 15.9 20 14.01 20 12c0-.28-.02-.55-.04-.82l-1.55-1.55c.07.45.09.91.09 1.37 0 1.68-.44 3.26-1.21 4.63l1.44 1.44z" /></svg>,
  Back: () => <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>,
  Logout: () => <svg viewBox="0 0 24 24" fill="currentColor" width="19" height="19"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" /></svg>,
  Phone: () => <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg>,
  Sun: () => <svg viewBox="0 0 24 24" fill="currentColor" width="19" height="19"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 000 1.41l1.41 1.41c.39.39 1.03.39 1.42 0s.39-1.03 0-1.42L7.41 4.58a.996.996 0 00-1.42 0zM15.17 13.75a.996.996 0 000 1.41l1.41 1.41c.39.39 1.03.39 1.42 0s.39-1.03 0-1.42l-1.41-1.41a.996.996 0 00-1.42 0zM4.58 15.17a.996.996 0 000 1.41l1.41 1.41c.39.39 1.03.39 1.42 0s.39-1.03 0-1.42l-1.41-1.41a.996.996 0 00-1.42 0zM13.75 5.99a.996.996 0 000 1.41l1.41 1.41c.39.39 1.03.39 1.42 0s.39-1.03 0-1.42l-1.41-1.41a.996.996 0 00-1.42 0z" /></svg>,
  Moon: () => <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12.12 2.05a9.943 9.943 0 0 0-5.16 7.33c-.03.4.25.74.65.77.31.02.59-.15.71-.43 1.06-2.52 3.61-4.22 6.55-4.22.56 0 1.11.07 1.62.2.41.1.84-.13.96-.53.12-.39-.12-.82-.53-.96-.65-.22-1.34-.33-2.04-.33-.26 0-.52.01-.77.03.11-.27.24-.53.37-.8.19-.4.04-.88-.36-1.07a.89.89 0 0 0-.88.01zM19.38 13.1c-.22-.04-.45-.06-.67-.06-3.8 0-7 2.92-7.31 6.64a.97.97 0 0 0 .97 1.05c.02 0 .04 0 .06-.01.52-.05 1.01-.1 1.51-.23.41-.11.66-.53.55-.94-.1-.41-.53-.66-.94-.55-.38.1-.75.14-1.12.18.57-2.31 2.65-4.04 5.15-4.04.14 0 .28.01.42.02.42.03.79-.27.81-.69.02-.42-.27-.79-.69-.81-.25-.03-.5-.06-.74-.06z" /></svg>,
};

function Card({ children, style = {} }) { return <div style={{ background: C.card, borderRadius: 16, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,.07),0 0 0 1px rgba(0,0,0,.04)", ...style }}>{children}</div>; }
function Chip({ label, active, onClick, color = C.g600 }) { return <button onClick={onClick} style={{ padding: "7px 15px", borderRadius: 20, border: `1.5px solid ${active ? color : C.border}`, background: active ? color : C.white, color: active ? C.white : C.sub, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{label}</button>; }

/* QR CODE CANVAS, QR SCANNER, RECEIVE, NFC, BLUETOOTH, TxnItem — REFACTORED TO:
   - src/components/OfflineScreens.jsx (ReceiveScreen, QRScannerScreen, NFCTransferScreen)
   - src/components/BluetoothTransferScreen.jsx
   - src/components/HomeScreen.jsx (TxnItem)
*/

/* BLUETOOTH GATT TRANSFER SCREEN REFACTORED TO src/components/BluetoothTransferScreen.jsx */

/* ═══════════════════════════════════════════
   LOGIN SCREEN
═══════════════════════════════════════════ */
/* LOGIN SCREEN REFACTORED TO src/components/LoginScreen.jsx */

/* ── Home ── */
/* HOME SCREEN REFACTORED TO src/components/HomeScreen.jsx */

/* ── Send ── */
/* SEND SCREEN REFACTORED TO src/components/SendScreen.jsx */

/* ── History ── */
/* HISTORY SCREEN REFACTORED TO src/components/HistoryScreen.jsx */

/* ── Loans ── */
/* LOAN SCREEN REFACTORED TO src/components/LoanScreen.jsx */

/* ── Learn ── */
/* LEARN SCREEN REFACTORED TO src/components/LearnScreen.jsx */

/* ═══════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════ */
export default function App() {
  const [authState, setAuthState] = useState("login"); // 'login' | 'signup' | 'recover' | 'app'
  const [currentUser, setCurrentUser] = useState(null);
  const [screen, setScreen] = useState("home");
  const [online, setOnline] = useState(true);
  const [txns, setTxns] = useState(SEED_TXNS);
  const [balance, setBalance] = useState(28450);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null); // 'receive' | 'qrscan' | null
  const [theme, setTheme] = useState(() => localStorage.getItem("wn_theme") || "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("wn_theme", theme);
  }, [theme]);
  const toggleTheme = () => setTheme(t => t === "light" ? "dark" : "light");

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200); };

  useEffect(() => {
    if (authState === "app") {
      api.getTransactions().then(setTxns).catch(console.error);
      api.getMe().then(res => {
        setCurrentUser(res.user);
        setBalance(res.user.balance);
      }).catch(err => {
        if (err.message.includes("Session expired")) handleLogout();
      });
    }
  }, [authState]);

  const handleLogin = async (phone, pin) => {
    const user = await api.login(phone, pin);
    setCurrentUser(user);
    setBalance(user.balance);
    setTimeout(() => setAuthState("app"), 200);
    return user;
  };
  const handleLogout = async () => {
    await api.logout();
    setAuthState("login"); setCurrentUser(null); setScreen("home"); setTxns([]); setBalance(0); setModal(null);
  };
  const handleSend = useCallback(async txn => {
    try {
      if (online) {
        const res = await api.sendTransaction(txn);
        setTxns(p => [res.transaction, ...p]);
        setBalance(res.balance);
      } else {
        txn.status = "pending";
        setTxns(p => [txn, ...p]);
        setBalance(b => b - txn.amount);
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  }, [online]);
  const handleSync = useCallback(async () => {
    const pendingIds = txns.filter(t => t.status === "pending").map(t => t.id);
    if (pendingIds.length === 0) return showToast("No pending transactions");
    try {
      const res = await api.syncTransactions(pendingIds);
      setTxns(p => p.map(t => pendingIds.includes(t.id) ? { ...t, status: "confirmed" } : t));
      setBalance(res.balance);
      showToast("Transactions synced!");
    } catch (err) {
      showToast(err.message, "error");
    }
  }, [txns]);

  const tabs = [{ id: "home", Icon: Ic.Home, label: "Home" }, { id: "send", Icon: Ic.Send, label: "Send" }, { id: "history", Icon: Ic.History, label: "History" }, { id: "loan", Icon: Ic.Loan, label: "Loans" }, { id: "learn", Icon: Ic.Learn, label: "Learn" }];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap');
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        ::-webkit-scrollbar{display:none;}
        input{font-family:inherit;}
        @keyframes toastIn{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}
        @keyframes shakeDot{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.7;transform:scale(.93)}}
        @keyframes btPulse{0%,100%{box-shadow:0 0 0 0 rgba(0,130,252,.5)}60%{box-shadow:0 0 0 16px rgba(0,130,252,0)}}
        @keyframes stepPulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes dot1{0%,20%{opacity:0}33%,100%{opacity:1}}
        @keyframes dot2{0%,40%{opacity:0}55%,100%{opacity:1}}
        @keyframes dot3{0%,60%{opacity:0}75%,100%{opacity:1}}
        @keyframes scanLine{0%{top:0;opacity:1}45%{opacity:1}50%{top:calc(100% - 3px);opacity:.6}55%{opacity:1}100%{top:0;opacity:1}}
        @keyframes nfcRing{0%{transform:scale(.5);opacity:.8}100%{transform:scale(1.6);opacity:0}}
        @keyframes modalIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div style={{ fontFamily: "var(--font-family)", background: "#CDD6CF", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "20px 0 40px" }}>
        <div style={{ width: 393, maxWidth: "100vw", background: authState === "login" ? 'var(--color-bg)' : 'var(--color-bg)', borderRadius: 44, boxShadow: "0 40px 80px rgba(0,0,0,.22),0 8px 20px rgba(0,0,0,.14),inset 0 0 0 1px rgba(255,255,255,.25)", overflow: "hidden", display: "flex", flexDirection: "column", minHeight: "calc(100vh - 60px)" }}>
          {authState === "login" ? (
            <div style={{ flex: 1, overflowY: "auto", position: 'relative' }}>
              <button
                onClick={toggleTheme}
                style={{ position: 'absolute', top: 16, right: 16, zIndex: 100, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 12, padding: 8, color: '#fff', cursor: 'pointer', display: 'flex' }}
              >
                {theme === "light" ? <Ic.Moon /> : <Ic.Sun />}
              </button>
              <LoginScreen onLogin={handleLogin} users={USERS} onSignUp={() => setAuthState("signup")} onRecover={() => setAuthState("recover")} />
            </div>
          ) : authState === "signup" ? (
            <div style={{ flex: 1, overflowY: "auto", position: 'relative' }}>
              <SignUpScreen onBack={() => setAuthState("login")} onSignUp={(user) => { setCurrentUser(user); setBalance(user.balance); setAuthState("app"); }} />
            </div>
          ) : authState === "recover" ? (
            <div style={{ flex: 1, overflowY: "auto", position: 'relative' }}>
              <RecoverScreen onBack={() => setAuthState("login")} />
            </div>
          ) : (
            <>
              <div style={{ background: C.g800, padding: "14px 18px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: `linear-gradient(135deg,${C.o400},${C.o600})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, color: C.white }}>{getInit(currentUser?.name || "U")}</div>
                  <div><div style={{ color: C.white, fontWeight: 800, fontSize: 14 }}>{currentUser?.name}</div><div style={{ color: "rgba(255,255,255,.4)", fontSize: 10 }}>Acc: {currentUser?.accountNo}</div></div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={toggleTheme} style={{ background: "rgba(255,255,255,.08)", border: "none", borderRadius: 10, padding: 6, color: "rgba(255,255,255,.65)", cursor: "pointer", display: "flex" }}>
                    {theme === "light" ? <Ic.Moon /> : <Ic.Sun />}
                  </button>
                  <button onClick={() => setOnline(o => !o)} style={{ display: "flex", alignItems: "center", gap: 4, background: online ? "rgba(46,173,99,.18)" : "rgba(214,59,47,.18)", border: `1px solid ${online ? C.g400 : C.red}`, color: online ? C.g400 : C.red, borderRadius: 20, padding: "4px 10px", fontSize: 10, fontWeight: 800, cursor: "pointer", textTransform: "uppercase" }}>
                    {online ? <Ic.Wifi /> : <Ic.NoWifi />} {online ? "Online" : "Offline"}
                  </button>
                  <button onClick={handleLogout} style={{ background: "rgba(255,255,255,.08)", border: "none", borderRadius: 10, padding: 6, color: "rgba(255,255,255,.65)", cursor: "pointer", display: "flex" }} title="Sign out"><Ic.Logout /></button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "18px 16px 16px", animation: "fadeSlide .3s ease", position: "relative" }}>
                {screen === "home" && <HomeScreen txns={txns} balance={balance} online={online} onSync={handleSync} onReceive={() => setModal("receive")} onQRScan={() => { setScreen("send"); setModal("qrscan"); }} onSend={() => setScreen("send")} />}
                {screen === "send" && <SendScreen balance={balance} online={online} onSend={handleSend} currentUser={currentUser} initialQRScan={modal === "qrscan"} QRScannerScreen={QRScannerScreen} NFCTransferScreen={NFCTransferScreen} BluetoothTransferScreen={BluetoothTransferScreen} key={modal === "qrscan" ? "qrscan" : "send"} />}
                {screen === "history" && <HistoryScreen txns={txns} />}
                {screen === "loan" && <LoanScreen txns={txns} />}
                {screen === "learn" && <LearnScreen />}
                {/* Receive modal overlay */}
                {modal === "receive" && (
                  <div style={{ position: "absolute", inset: 0, background: C.bg, zIndex: 50, overflowY: "auto", padding: "0 0 16px", animation: "modalIn .25s ease" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 10px" }}>
                      <button onClick={() => setModal(null)} style={{ background: "none", border: "none", color: C.g600, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: 0 }}><Ic.Back /> Back</button>
                    </div>
                    <div style={{ padding: "0 16px" }}><ReceiveScreen currentUser={currentUser} onClose={() => setModal(null)} /></div>
                  </div>
                )}
              </div>
              <div style={{ background: C.white, borderTop: `1px solid ${C.border}`, display: "flex", paddingBottom: 8, boxShadow: "0 -3px 12px rgba(0,0,0,.06)" }}>
                {tabs.map(t => { const active = screen === t.id; return (<button key={t.id} onClick={() => setScreen(t.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 4px 4px", background: "none", border: "none", cursor: "pointer", color: active ? C.g700 : C.muted, position: "relative" }}>{active && <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 28, height: 3, borderRadius: "0 0 4px 4px", background: `linear-gradient(90deg,${C.g600},${C.o400})` }} />}<t.Icon /><span style={{ fontSize: 10, fontWeight: active ? 800 : 500 }}>{t.label}</span></button>); })}
              </div>
            </>
          )}
        </div>
        {toast && <div style={{ position: "fixed", bottom: 48, left: "50%", transform: "translateX(-50%)", background: toast.type === "success" ? C.g700 : C.red, color: C.white, borderRadius: 30, padding: "12px 22px", fontWeight: 700, fontSize: 13, boxShadow: "0 6px 24px rgba(0,0,0,.22)", zIndex: 9999, animation: "toastIn .3s ease", whiteSpace: "nowrap" }}>{toast.type === "success" ? "✅" : "❌"} {toast.msg}</div>}
      </div>
    </>
  );
}
