import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bluetooth, Check, AlertTriangle, Info, RotateCcw, Play, Search, X } from 'lucide-react';
import { Card, Button, PageTransition } from './ui';

const BT_SERVICE = "0000beba-0000-1000-8000-00805f9b34fb";
const BT_TX_CHAR = "0000beb1-0000-1000-8000-00805f9b34fb";
const BT_ACK_CHAR = "0000beb3-0000-1000-8000-00805f9b34fb";

const DEFAULT_PHONE = "08034521000";
const fmtAmt = n => "₦" + n.toLocaleString("en-NG");

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

const BluetoothTransferScreen = ({ sender, amount, recipient, note, onSuccess, onCancel }) => {
  const [phase, setPhase] = useState("idle");
  const [log, setLog] = useState([]);
  const [device, setDevice] = useState(null);
  const [errMsg, setErrMsg] = useState("");
  const [txnId, setTxnId] = useState("");
  const [demoMode, setDemoMode] = useState(typeof navigator !== "undefined" && !navigator.bluetooth);
  const deviceRef = useRef(null);

  useEffect(() => () => {
    if (deviceRef.current?.gatt?.connected) deviceRef.current.gatt.disconnect();
  }, []);

  const addLog = (msg, type = "info") => setLog(p => [...p, { msg, type, ts: new Date().toLocaleTimeString("en-NG") }]);

  const runDemoTransfer = async () => {
    const DEMO_STEPS = [
      { ph: "checking", msg: "✓ Web Bluetooth API ready", t: "ok", ms: 520 },
      { ph: "checking", msg: "✓ Bluetooth hardware available", t: "ok", ms: 380 },
      { ph: "scanning", msg: "Opening native device picker…", t: "info", ms: 180 },
      { ph: "scanning", msg: "📡 Scanning for WalletNG devices…", t: "info", ms: 1700 },
      { ph: "connecting", msg: `✓ Device found: "WalletNG_${(recipient || "Peer").replace(/\s+/g, "_").slice(0, 10)}"`, t: "ok", ms: 480 },
      { ph: "connecting", msg: "Connecting to GATT server…", t: "info", ms: 620 },
      { ph: "handshake", msg: "✓ GATT connection established", t: "ok", ms: 380 },
      { ph: "handshake", msg: "Discovering WalletNG service…", t: "info", ms: 520 },
      { ph: "handshake", msg: "✓ WalletNG GATT service found", t: "ok", ms: 340 },
      { ph: "sending", msg: "✓ TX char (BEB1…) ready", t: "ok", ms: 280 },
      { ph: "sending", msg: "✓ ACK char (BEB3…) ready", t: "ok", ms: 240 },
      { ph: "sending", msg: "✓ Subscribed to ACK notifications", t: "ok", ms: 380 },
      { ph: "sending", msg: "✓ Payload HMAC-SHA256: sha256:a3f8b2c91e7d4f0a…", t: "ok", ms: 580 },
      { ph: "sending", msg: `Writing ${Math.round(JSON.stringify({ amount, recipient }).length * 1.4)} B → TX characteristic…`, t: "info", ms: 360 },
      { ph: "acking", msg: "✓ Packet written successfully", t: "ok", ms: 280 },
      { ph: "acking", msg: "Awaiting ACK from recipient (15s timeout)…", t: "info", ms: 1480 },
      { ph: "acking", msg: "✓ ACK received — sig: sha256:d7e9f011a032b8c5…", t: "ok", ms: 680 },
      { ph: "done", msg: "✓ GATT disconnected cleanly", t: "ok", ms: 280 },
    ];
    setLog([]); setErrMsg(""); setPhase("checking");
    for (const s of DEMO_STEPS) { setPhase(s.ph); await new Promise(r => setTimeout(r, s.ms)); addLog(s.msg, s.t); }
    const id = "TX" + Date.now(); setTxnId(id);
    onSuccess({ id, type: "debit", party: recipient, amount, note: note || "Bluetooth Transfer", date: new Date().toISOString().split("T")[0], time: new Date().toTimeString().slice(0, 5), status: "confirmed", channel: "bluetooth" });
  };

  const startTransfer = async () => {
    if (demoMode) { runDemoTransfer(); return; }
    setPhase("checking"); setLog([]); setErrMsg("");

    if (!navigator.bluetooth) {
      setErrMsg("Web Bluetooth API unavailable (iOS / non-Chromium browser). Toggle Demo Mode to simulate the full GATT flow.");
      setPhase("error"); addLog("✗ navigator.bluetooth undefined — switch to Demo Mode", "error"); return;
    }
    const avail = await navigator.bluetooth.getAvailability().catch(() => false);
    if (!avail) {
      setErrMsg("Bluetooth hardware is off or blocked. Enable Bluetooth and reload.");
      setPhase("error"); addLog("✗ Bluetooth hardware unavailable", "error"); return;
    }
    addLog("✓ Web Bluetooth API ready", "ok");
    addLog("✓ Bluetooth hardware available", "ok");

    setPhase("scanning");
    addLog("Opening native device picker…", "info");
    addLog(`Filtering service: ${BT_SERVICE.toUpperCase().slice(0, 18)}…`, "info");

    let dev;
    try {
      dev = await navigator.bluetooth.requestDevice({
        filters: [{ services: [BT_SERVICE] }, { namePrefix: "WalletNG" }],
        optionalServices: [BT_SERVICE],
      });
    } catch (e) {
      const msg = e.name === "NotFoundError" ? "No device selected. Ensure recipient taps 'Receive via Bluetooth' first." :
        e.name === "SecurityError" ? "Bluetooth permission denied. Allow in browser settings." : `Scan failed: ${e.message}`;
      setErrMsg(msg); setPhase("error"); addLog(`✗ ${e.name}: ${e.message}`, "error"); return;
    }
    deviceRef.current = dev; setDevice(dev);
    addLog(`✓ Device selected: "${dev.name || dev.id}"`, "ok");
    dev.addEventListener("gattserverdisconnected", () => addLog("⚠ Device disconnected", "warn"));

    setPhase("connecting");
    addLog("Connecting to GATT server…", "info");
    let server;
    try { server = await dev.gatt.connect(); addLog("✓ GATT connection established", "ok"); } 
    catch (e) { setErrMsg(`GATT connect failed: ${e.message}`); setPhase("error"); addLog(`✗ ${e.message}`, "error"); return; }

    setPhase("handshake");
    addLog(`Discovering WalletNG service…`, "info");
    let txChar, ackChar;
    try {
      const svc = await server.getPrimaryService(BT_SERVICE);
      addLog("✓ WalletNG GATT service found", "ok");
      txChar = await svc.getCharacteristic(BT_TX_CHAR);
      addLog(`✓ TX char (${BT_TX_CHAR.slice(4, 8)}…) ready`, "ok");
      ackChar = await svc.getCharacteristic(BT_ACK_CHAR);
      addLog(`✓ ACK char (${BT_ACK_CHAR.slice(4, 8)}…) ready`, "ok");
    } catch (e) {
      setErrMsg(`Service discovery failed: ${e.message}. Is the recipient running WalletNG with Receive mode active?`);
      setPhase("error"); addLog(`✗ ${e.message}`, "error"); dev.gatt.disconnect(); return;
    }
    try { await ackChar.startNotifications(); addLog("✓ Subscribed to ACK notifications", "ok"); } 
    catch (e) { addLog(`⚠ ACK notify unavailable: ${e.message}`, "warn"); }

    setPhase("sending");
    const id = "TX" + Date.now(); setTxnId(id);
    const payload = { v: 1, type: "TXN_INIT", txId: id, sender: { id: DEFAULT_PHONE, name: sender }, receiver: { id: "PEER", name: recipient }, amount, currency: "NGN", note: note || "Bluetooth Transfer", ts: Date.now() };
    payload.sig = await hashPayload(JSON.stringify(payload));
    addLog(`✓ Payload HMAC-SHA256: ${payload.sig.slice(0, 22)}…`, "ok");
    const bytes = encodePacket(payload);
    addLog(`Writing ${bytes.length} B → TX characteristic…`, "info");
    try { await txChar.writeValueWithResponse(bytes); addLog("✓ Packet written successfully", "ok"); } 
    catch (e) { setErrMsg(`Write failed: ${e.message}`); setPhase("error"); addLog(`✗ Write: ${e.message}`, "error"); dev.gatt.disconnect(); return; }

    setPhase("acking");
    addLog("Awaiting ACK from recipient (15s timeout)…", "info");
    try {
      await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("ACK timeout — no response in 15 seconds.")), 15000);
        const handler = ev => {
          clearTimeout(t); ackChar.removeEventListener("characteristicvaluechanged", handler);
          try {
            const ack = decodePacket(ev.target.value.buffer);
            if (ack.type === "TXN_ACK" && ack.txId === payload.txId) { addLog(`✓ ACK received — sig: ${(ack.sig || "").slice(0, 18)}…`, "ok"); resolve(ack); }
            else if (ack.type === "TXN_REJECT") { reject(new Error(`Rejected: ${ack.reason || "unknown"}`)); }
            else { reject(new Error("Unexpected ACK packet")); }
          } catch (pe) { reject(new Error("ACK parse error")); }
        };
        ackChar.addEventListener("characteristicvaluechanged", handler);
      });
      dev.gatt.disconnect();
      addLog("✓ GATT disconnected cleanly", "ok");
      setPhase("done");
      onSuccess({ id, type: "debit", party: recipient, amount, note: note || "Bluetooth Transfer", date: new Date().toISOString().split("T")[0], time: new Date().toTimeString().slice(0, 5), status: "confirmed", channel: "bluetooth" });
    } catch (e) { setErrMsg(e.message); setPhase("error"); addLog(`✗ ACK: ${e.message}`, "error"); dev.gatt.disconnect(); }
  };

  const STEPS = [
    { key: "checking", label: "Check hardware", icon: Search },
    { key: "scanning", label: "Scan & select device", icon: Search },
    { key: "connecting", label: "GATT connect", icon: Bluetooth },
    { key: "handshake", label: "Discover service", icon: Bluetooth },
    { key: "sending", label: "Write transaction", icon: Play },
    { key: "acking", label: "Receive ACK", icon: Check },
    { key: "done", label: "Confirmed", icon: Check },
  ];
  const ORDER = STEPS.map(s => s.key);
  const cur = ORDER.indexOf(phase);
  const isActive = ["checking", "scanning", "connecting", "handshake", "sending", "acking"].includes(phase);

  return (
    <PageTransition style={{ display: "flex", flexDirection: "column", gap: 'var(--space-4)' }}>
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: `linear-gradient(145deg, #0082FC, #0057B0)`, borderRadius: 'var(--radius-2xl)', padding: 'var(--space-5)', position: "relative", overflow: "hidden", boxShadow: 'var(--shadow-lg)' }}
      >
        <div style={{ position: "absolute", right: -30, top: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,.08)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 'var(--space-4)' }}>
          <motion.div 
            animate={isActive ? { scale: [1, 1.15, 1] } : {}} 
            transition={{ repeat: Infinity, duration: 1.5 }}
            style={{ width: 52, height: 52, borderRadius: 'var(--radius-xl)', background: "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", color: '#fff' }}
          >
            <Bluetooth size={26} />
          </motion.div>
          <div>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 'var(--text-lg)' }}>Bluetooth GATT Transfer</div>
            <div style={{ color: "rgba(255,255,255,.6)", fontSize: 'var(--text-xs)', marginTop: 2 }}>Web Bluetooth API · Custom GATT Service</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 'var(--space-2)' }}>
          <div style={{ background: "rgba(255,255,255,.12)", borderRadius: 'var(--radius-lg)', padding: "10px 14px" }}>
            <div style={{ color: "rgba(255,255,255,.5)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, fontWeight: 700 }}>Sending</div>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 'var(--text-xl)' }}>{fmtAmt(amount)}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,.12)", borderRadius: 'var(--radius-lg)', padding: "10px 14px" }}>
            <div style={{ color: "rgba(255,255,255,.5)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, fontWeight: 700 }}>To</div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 'var(--text-sm)', overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{recipient}</div>
          </div>
        </div>
      </motion.div>

      {/* Progress steps */}
      <Card style={{ padding: 'var(--space-4)' }}>
        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: "uppercase", letterSpacing: 1, marginBottom: 'var(--space-3)' }}>Transfer Protocol</div>
        {STEPS.map((s, i) => {
          const done = cur > i; const active = cur === i;
          return (
            <motion.div 
              key={s.key} 
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: i < STEPS.length - 1 ? 12 : 0, position: "relative" }}
            >
              {i < STEPS.length - 1 && <div style={{ position: "absolute", left: 11, top: 26, width: 2, height: 12, background: done ? 'var(--color-primary)' : 'var(--color-border)', transition: "background .3s" }} />}
              <motion.div 
                animate={active ? { scale: [1, 1.2, 1] } : {}} transition={{ repeat: Infinity, duration: 1 }}
                style={{ width: 24, height: 24, borderRadius: 'var(--radius-full)', flexShrink: 0, background: done ? 'var(--color-primary)' : active ? '#0082FC' : 'transparent', border: `2px solid ${done ? 'var(--color-primary)' : active ? '#0082FC' : 'var(--color-border)'}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .3s" }}
              >
                {done && <Check size={12} color="#fff" />}
                {active && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
              </motion.div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: active || done ? 700 : 400, color: done ? 'var(--color-primary)' : active ? '#0082FC' : 'var(--color-text-muted)', display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
                {s.label}
                {active && <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.2 }} style={{ color: '#0082FC' }}>...</motion.span>}
              </div>
              {done && <Check size={14} color="var(--color-primary)" />}
            </motion.div>
          );
        })}
      </Card>

      {/* Live GATT log */}
      <AnimatePresence>
        {log.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ borderRadius: 'var(--radius-xl)', overflow: "hidden", border: '1px solid var(--color-secondary)' }}
          >
            <div style={{ background: 'var(--color-secondary)', padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "rgba(255,255,255,.7)", fontSize: 11, fontWeight: 700, letterSpacing: 1, fontFamily: "monospace" }}>GATT LOG</span>
              <span style={{ color: "rgba(255,255,255,.35)", fontSize: 10, fontFamily: "monospace" }}>{log.length} events</span>
            </div>
            <div style={{ background: "#0A1A0F", padding: "10px 12px", maxHeight: 160, overflowY: "auto" }}>
              {log.map((l, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                  <span style={{ color: "rgba(255,255,255,.2)", fontSize: 10, flexShrink: 0, fontFamily: "monospace", minWidth: 60 }}>{l.ts}</span>
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: l.type === "ok" ? "#2EAD63" : l.type === "error" ? "#EF4444" : l.type === "warn" ? "#F5A623" : "rgba(255,255,255,.65)" }}>{l.msg}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GATT service spec (idle only) */}
      <AnimatePresence>
        {phase === "idle" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: "uppercase", letterSpacing: 1, marginBottom: 'var(--space-3)' }}>GATT Service Specification</div>
              {[
                { k: "Service UUID", v: BT_SERVICE, c: "#7B3FA0" },
                { k: "TX Char", v: BT_TX_CHAR, c: "#0082FC" },
                { k: "ACK Char", v: BT_ACK_CHAR, c: "var(--color-primary)" },
                { k: "Payload", v: "JSON · UTF-8 · HMAC-SHA256 · max 512 B", c: "var(--color-text-secondary)" },
              ].map(r => (
                <div key={r.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', flexShrink: 0 }}>{r.k}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: r.c, fontFamily: "monospace", background: `${r.c}12`, borderRadius: 6, padding: "3px 8px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.v.length > 34 ? r.v.slice(0, 32) + "…" : r.v}
                  </span>
                </div>
              ))}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error box */}
      <AnimatePresence>
        {phase === "error" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ background: "rgba(239,68,68,.06)", border: '1.5px solid var(--color-danger)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)', display: 'flex', alignItems: 'flex-start', gap: 12 }}
          >
            <AlertTriangle size={20} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: 2 }}/>
            <div>
              <div style={{ color: 'var(--color-danger)', fontWeight: 800, fontSize: 'var(--text-sm)', marginBottom: 4 }}>Transfer Failed</div>
              <div style={{ color: "#7A2020", fontSize: 'var(--text-xs)', lineHeight: 1.6 }}>{errMsg}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Demo mode toggle */}
      <div style={{ background: demoMode ? 'rgba(249, 115, 22, 0.06)' : 'rgba(16, 185, 129, 0.06)', borderRadius: 'var(--radius-lg)', padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${demoMode ? 'rgba(249, 115, 22, 0.2)' : 'rgba(16, 185, 129, 0.2)'}` }}>
        <span style={{ fontSize: 'var(--text-xs)', color: demoMode ? '#EA580C' : 'var(--color-primary)', fontWeight: 700 }}>
          {demoMode ? "🎭 Demo Mode — Simulated GATT" : "🔵 Real Bluetooth Mode"}
        </span>
        <button onClick={() => { setDemoMode(!demoMode); setPhase("idle"); setLog([]); setErrMsg(""); }} style={{ fontSize: 11, fontWeight: 800, padding: "4px 14px", borderRadius: 'var(--radius-full)', border: `1.5px solid ${demoMode ? '#EA580C' : 'var(--color-primary)'}`, background: "transparent", color: demoMode ? '#EA580C' : 'var(--color-primary)', cursor: "pointer" }}>
          {demoMode ? "Use Real BT" : "Use Demo"}
        </button>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 'var(--space-3)' }}>
        {(phase === "idle" || phase === "error") && (
          <>
            <Button variant="secondary" onClick={onCancel} style={{ flex: 1 }}>Cancel</Button>
            <Button onClick={startTransfer} style={{ flex: 2, background: `linear-gradient(135deg, #0082FC, #0057B0)`, color: '#fff', border: 'none' }}>
              {phase === "error" ? <><RotateCcw size={16} style={{marginRight:6}}/> Retry</> : demoMode ? <><Play size={16} style={{marginRight:6}}/> Run Demo</> : <><Search size={16} style={{marginRight:6}}/> Scan Devices</>}
            </Button>
          </>
        )}
        {isActive && (
          <Button variant="outline" onClick={() => { deviceRef.current?.gatt?.disconnect(); setPhase("error"); setErrMsg("Cancelled by user."); }} fullWidth style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
            <X size={16} style={{marginRight:6}}/> Cancel Transfer
          </Button>
        )}
      </div>

      {/* Requirements note */}
      <div style={{ background: 'rgba(249, 115, 22, 0.06)', borderRadius: 'var(--radius-lg)', padding: "10px 14px", border: '1px solid rgba(249, 115, 22, 0.15)', display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Info size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 'var(--text-xs)', color: "#7A3F00", lineHeight: 1.6 }}>
          <strong>Requirements:</strong> Chrome 56+ / Edge 79+ on Android or Desktop. Recipient must have WalletNG open with Bluetooth Receive mode active before scanning begins.
        </div>
      </div>
    </PageTransition>
  );
};

export default BluetoothTransferScreen;
