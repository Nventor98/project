import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, CheckCircle2, QrCode, Wifi, 
  SmartphoneNfc, Bluetooth, SendToBack, ChevronRight
} from 'lucide-react';
import { Card, Button, Input, PageTransition } from './ui';

const fmtAmt = n => "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2 });

const SendScreen = ({ 
  balance, online, onSend, currentUser, 
  initialMethod = null, initialQRScan = false,
  QRScannerScreen, NFCTransferScreen, BluetoothTransferScreen
}) => {
  const [step, setStep] = useState(0); // 0: Method, 1: Details, 2: PIN, 3: Success
  const [method, setMethod] = useState(initialMethod);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [pin, setPin] = useState("");
  const [result, setResult] = useState(null);
  const [showBT, setShowBT] = useState(false);
  const [showNFC, setShowNFC] = useState(false);
  const [showQRScan, setShowQRScan] = useState(initialQRScan);

  useEffect(() => { if (initialMethod) { setMethod(initialMethod); setStep(1); } }, [initialMethod]);
  useEffect(() => { if (initialQRScan) setShowQRScan(true); }, [initialQRScan]);

  const doSend = () => {
    const txn = { 
      id: "TX" + Date.now(), 
      type: "debit", 
      party: recipient, 
      amount: parseFloat(amount), 
      note: note || "Transfer", 
      date: new Date().toISOString().split("T")[0], 
      time: new Date().toTimeString().slice(0, 5), 
      status: online ? "confirmed" : "pending", 
      channel: method || "online" 
    };
    onSend(txn); 
    setResult(txn); 
    setStep(3);
  };

  if (showQRScan && QRScannerScreen) return (
    <PageTransition>
      <button onClick={() => setShowQRScan(false)} style={{ background: "none", border: "none", color: 'var(--color-secondary)', fontWeight: 700, fontSize: 'var(--text-sm)', cursor: "pointer", marginBottom: 16, padding: 0, display: "flex", alignItems: "center", gap: 4 }}><ArrowLeft size={18} /> Back</button>
      <QRScannerScreen 
        onScan={data => {
          try {
            const p = JSON.parse(data);
            if (p.app === "WalletNG") { setRecipient(p.name || p.phone || ""); }
            else { setRecipient(data.slice(0, 40)); }
          } catch { setRecipient(data.slice(0, 40)); }
          setShowQRScan(false); setMethod("qr"); setStep(1);
        }} 
        onClose={() => setShowQRScan(false)} 
      />
    </PageTransition>
  );

  if (showNFC && NFCTransferScreen) return (
    <PageTransition>
      <button onClick={() => setShowNFC(false)} style={{ background: "none", border: "none", color: 'var(--color-secondary)', fontWeight: 700, fontSize: 'var(--text-sm)', cursor: "pointer", marginBottom: 16, padding: 0, display: "flex", alignItems: "center", gap: 4 }}><ArrowLeft size={18} /> Back</button>
      <NFCTransferScreen 
        amount={parseFloat(amount) || 0} 
        recipient={recipient} 
        note={note} 
        onSuccess={txn => { onSend(txn); setResult(txn); setStep(3); setShowNFC(false); }} 
        onCancel={() => setShowNFC(false)} 
      />
    </PageTransition>
  );

  if (showBT && BluetoothTransferScreen) return (
    <PageTransition>
      <button onClick={() => setShowBT(false)} style={{ background: "none", border: "none", color: 'var(--color-secondary)', fontWeight: 700, fontSize: 'var(--text-sm)', cursor: "pointer", marginBottom: 16, padding: 0, display: "flex", alignItems: "center", gap: 4 }}><ArrowLeft size={18} /> Back</button>
      <BluetoothTransferScreen 
        sender={currentUser?.name || "User"} 
        amount={parseFloat(amount) || 0} 
        recipient={recipient} 
        note={note} 
        onSuccess={txn => { onSend(txn); setResult(txn); setStep(3); setShowBT(false); }} 
        onCancel={() => setShowBT(false)} 
      />
    </PageTransition>
  );

  // SUCCESS STEP
  if (step === 3 && result) return (
    <PageTransition style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: "center", padding: 'var(--space-4)' }}>
      <motion.div 
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        style={{ color: result.status === "confirmed" ? 'var(--color-primary)' : 'var(--color-warning)', marginBottom: 'var(--space-4)' }}
      >
        <CheckCircle2 size={100} strokeWidth={1.5} />
      </motion.div>
      <h2 style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
        {result.status === "confirmed" ? "Transfer Successful!" : "Queued for Sync"}
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-base)', marginBottom: 'var(--space-6)' }}>
        {fmtAmt(result.amount)} sent to <strong style={{ color: 'var(--color-text-primary)' }}>{result.party}</strong>
      </p>
      
      <Card style={{ textAlign: "left", marginBottom: 'var(--space-8)', width: '100%' }}>
        {[
          ["Transaction ID", result.id], 
          ["Channel", result.channel.toUpperCase()], 
          ["Status", result.status.toUpperCase()], 
          ["Time", result.time]
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid var(--color-border)` }}>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>{k}</span>
            <span style={{ 
              color: k === "Status" ? (result.status === "confirmed" ? 'var(--color-primary)' : 'var(--color-warning)') : 'var(--color-text-primary)', 
              fontSize: 'var(--text-sm)', fontWeight: 700 
            }}>
              {v}
            </span>
          </div>
        ))}
      </Card>
      <Button 
        fullWidth 
        onClick={() => { setStep(0); setMethod(null); setRecipient(""); setAmount(""); setNote(""); setPin(""); setResult(null); }}
      >
        Done
      </Button>
    </PageTransition>
  );

  // PIN CONFIRMATION STEP
  if (step === 2) return (
    <PageTransition style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0 var(--space-4)' }}>
      <button onClick={() => setStep(1)} style={{ background: "none", border: "none", color: 'var(--color-secondary)', fontWeight: 700, fontSize: 'var(--text-sm)', cursor: "pointer", marginBottom: 'var(--space-6)', padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}><ArrowLeft size={18} /> Back</button>
      
      <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--color-text-primary)', textAlign: 'center', marginBottom: 4 }}>Confirm PIN</h2>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', textAlign: 'center', marginBottom: 'var(--space-8)' }}>Authorise transfer with your 4-digit PIN</p>
      
      <Card style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 'var(--space-8)' }}>
        <div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Sending to</div>
          <div style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--color-text-primary)' }}>{recipient}</div>
        </div>
        <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 900, color: 'var(--color-primary-dark)' }}>{fmtAmt(parseFloat(amount) || 0)}</div>
      </Card>

      <div style={{ display: "flex", justifyContent: "center", gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        {[0, 1, 2, 3].map(i => (
          <div 
            key={i} 
            style={{ 
              width: 56, height: 56, 
              borderRadius: 'var(--radius-xl)', 
              border: `2px solid ${i < pin.length ? 'var(--color-primary)' : 'var(--color-border)'}`, 
              background: i < pin.length ? 'var(--color-primary)' : 'var(--color-surface)', 
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: 'all 0.2s'
            }}
          >
            {i < pin.length && <motion.div initial={{scale:0}} animate={{scale:1}} style={{ width: 12, height: 12, borderRadius: "50%", background: '#fff' }} />}
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: 'auto', display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, maxWidth: 320, margin: "0 auto var(--space-6)" }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((k, i) => (
          <motion.button 
            key={i} 
            disabled={k === ""} 
            onClick={() => { 
              if (k === "⌫") setPin(p => p.slice(0, -1)); 
              else if (pin.length < 4) { 
                const np = pin + k; setPin(np); 
                if (np.length === 4) setTimeout(doSend, 400); 
              } 
            }} 
            whileTap={k !== "" ? { scale: 0.9 } : {}}
            style={{ 
              background: k === "" ? "transparent" : 'var(--color-surface)', 
              border: `1px solid ${k === "" ? "transparent" : 'var(--color-border)'}`, 
              borderRadius: 'var(--radius-xl)', 
              padding: 20, 
              fontSize: k === "⌫" ? 22 : 26, 
              fontWeight: 600, 
              color: 'var(--color-text-primary)', 
              cursor: k === "" ? "default" : "pointer", 
              boxShadow: k === "" ? "none" : 'var(--shadow-sm)' 
            }}
          >
            {k}
          </motion.button>
        ))}
      </div>
    </PageTransition>
  );

  // DETAILS INPUT STEP
  if (step === 1) return (
    <PageTransition style={{ padding: '0 var(--space-4)' }}>
      <button onClick={() => setStep(0)} style={{ background: "none", border: "none", color: 'var(--color-secondary)', fontWeight: 700, fontSize: 'var(--text-sm)', cursor: "pointer", marginBottom: 'var(--space-6)', padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}><ArrowLeft size={18} /> Back</button>
      
      <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4 }}>Send Money</h2>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center' }}>
        Via <span style={{ color: method === "bluetooth" ? '#3B82F6' : 'var(--color-primary-dark)', fontWeight: 700, textTransform: "capitalize", marginLeft: 4, marginRight: 8 }}>{method}</span> 
        {!online && <span style={{ background: 'var(--color-warning)', color: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>OFFLINE MODE</span>}
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        <Input 
          label="Recipient Name / ID" 
          value={recipient} 
          onChange={e => setRecipient(e.target.value)} 
          placeholder="e.g. Amaka Obi" 
        />
        
        <div>
          <Input 
            label="Amount (₦)" 
            value={amount} 
            onChange={e => setAmount(e.target.value)} 
            type="number" 
            placeholder="0.00" 
            style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, padding: 'var(--space-4)' }}
          />
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 8, fontWeight: 500 }}>
            Available Balance: <span style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>{fmtAmt(balance)}</span>
          </p>
        </div>
        
        <Input 
          label="Note (optional)" 
          value={note} 
          onChange={e => setNote(e.target.value)} 
          placeholder="What's this for?" 
        />
      </div>

      {(() => {
        const ok = recipient && amount && parseFloat(amount) > 0;
        const okBal = ok && parseFloat(amount) <= balance;
        
        if (method === "bluetooth") return (
          <Button fullWidth onClick={() => { if (ok) setShowBT(true); }} disabled={!ok} style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}>
            Open Bluetooth Transfer <ChevronRight size={18} style={{marginLeft: 8}} />
          </Button>
        );
        if (method === "nfc") return (
          <Button fullWidth onClick={() => { if (okBal) setShowNFC(true); }} disabled={!okBal} variant="secondary">
            Open NFC Transfer <ChevronRight size={18} style={{marginLeft: 8}} />
          </Button>
        );
        if (method === "qr") return (
          <div style={{ display: "flex", flexDirection: "column", gap: 'var(--space-3)' }}>
            <Button fullWidth onClick={() => setShowQRScan(true)} variant="outline">
              <QrCode size={18} style={{marginRight: 8}} /> Scan Recipient QR Code
            </Button>
            <Button fullWidth onClick={() => { if (okBal) setStep(2); }} disabled={!okBal}>
              Continue <ChevronRight size={18} style={{marginLeft: 8}} />
            </Button>
          </div>
        );
        
        return (
          <Button fullWidth onClick={() => { if (okBal) setStep(2); }} disabled={!okBal}>
            Continue <ChevronRight size={18} style={{marginLeft: 8}} />
          </Button>
        );
      })()}
    </PageTransition>
  );

  // METHOD SELECTION STEP (0)
  const methods = [
    { id: "bluetooth", label: "Bluetooth", desc: "Real GATT transfer · no internet needed", offline: true, Icon: Bluetooth, accent: "#3B82F6", badge: "LIVE GATT" },
    { id: "nfc", label: "NFC Tap", desc: "Animated tap-to-pay · demo simulation", offline: true, Icon: SmartphoneNfc, accent: "var(--color-secondary)", badge: "OFFLINE" },
    { id: "qr", label: "QR Code", desc: "Scan recipient QR to auto-fill", offline: true, Icon: QrCode, accent: "#8B5CF6", badge: "CAMERA" },
    { id: "online", label: "Bank Transfer", desc: "Send to any bank account", offline: false, Icon: SendToBack, accent: "var(--color-primary-dark)", badge: null },
  ];

  return (
    <PageTransition style={{ padding: '0 var(--space-4)' }}>
      <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4 }}>Send Money</h2>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>Choose your secure transfer method</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {methods.map(m => {
          const disabled = !m.offline && !online;
          return (
            <motion.div 
              key={m.id} 
              whileHover={!disabled ? { scale: 1.02 } : {}}
              whileTap={!disabled ? { scale: 0.98 } : {}}
              onClick={() => { 
                if (!disabled) { 
                  setMethod(m.id); 
                  if (m.id === "qr") setShowQRScan(true); 
                  else setStep(1); 
                } 
              }}
              style={{ 
                display: "flex", alignItems: "center", gap: 'var(--space-4)', 
                padding: "var(--space-4)", borderRadius: 'var(--radius-xl)', 
                border: `1px solid ${disabled ? 'transparent' : 'var(--color-border)'}`, 
                background: m.id === "bluetooth" ? "rgba(59, 130, 246, 0.05)" : disabled ? "var(--color-surface-hover)" : "var(--color-surface)", 
                cursor: disabled ? "not-allowed" : "pointer", 
                opacity: disabled ? 0.5 : 1, 
                boxShadow: m.id === "bluetooth" ? `0 4px 12px rgba(59, 130, 246, 0.1)` : 'var(--shadow-sm)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: `${m.accent}15`, color: m.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <m.Icon size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 'var(--text-base)', color: 'var(--color-text-primary)', display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  {m.label}
                  {m.badge && (
                    <span style={{ fontSize: 9, background: m.id === "bluetooth" ? m.accent : 'var(--color-secondary)', color: '#fff', borderRadius: 6, padding: "2px 6px", fontWeight: 800, letterSpacing: 0.5 }}>
                      {m.badge}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{m.desc}</div>
              </div>
              <ChevronRight color="var(--color-text-muted)" size={20} />
            </motion.div>
          );
        })}
      </div>
    </PageTransition>
  );
};

export default SendScreen;
