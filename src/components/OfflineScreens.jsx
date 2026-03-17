import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { QrCode, Copy, Check, SmartphoneNfc, Zap, Camera, X } from 'lucide-react';
import { Card, Button, PageTransition } from './ui';

const fmtAmt = n => "₦" + n.toLocaleString("en-NG");

/* ── QR Code Canvas ── */
function QRCodeCanvas({ data, size = 180 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && data) {
      QRCode.toCanvas(ref.current, data, { width: size, margin: 2, color: { dark: '#0D1B12', light: "#FFFFFF" } }).catch(() => {});
    }
  }, [data, size]);
  return <canvas ref={ref} style={{ borderRadius: 8, maxWidth: "100%" }} />;
}

/* ── Receive Screen ── */
export const ReceiveScreen = ({ currentUser, onClose }) => {
  const qrData = JSON.stringify({ app: "WalletNG", v: 1, phone: currentUser?.phone, name: currentUser?.name, account: currentUser?.accountNo });
  const [copied, setCopied] = useState(false);
  
  const copy = () => { 
    try { navigator.clipboard.writeText(currentUser?.accountNo || ""); } catch(e){} 
    setCopied(true); 
    setTimeout(() => setCopied(false), 2000); 
  };

  return (
    <PageTransition style={{ display: "flex", flexDirection: "column", gap: 'var(--space-4)' }}>
      <div style={{ background: `linear-gradient(145deg, var(--color-secondary), var(--color-secondary-light))`, borderRadius: 'var(--radius-2xl)', padding: "var(--space-6) var(--space-4)", textAlign: "center", boxShadow: 'var(--shadow-md)' }}>
        <div style={{ color: '#fff', fontWeight: 900, fontSize: 'var(--text-lg)' }}>Receive Money</div>
        <div style={{ color: "rgba(255,255,255,.7)", fontSize: 'var(--text-xs)', marginTop: 4 }}>Share your QR or account details</div>
      </div>
      
      <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 'var(--space-3)', padding: 'var(--space-6)' }}>
        <div style={{ padding: 12, borderRadius: 'var(--radius-xl)', background: '#fff', boxShadow: "0 8px 30px rgba(0,0,0,.08)" }}>
          <QRCodeCanvas data={qrData} size={200} />
        </div>
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)' }}>{currentUser?.name}</div>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginTop: 2 }}>Scan to pay via WalletNG</div>
        </div>
      </Card>
      
      <Card style={{ padding: "var(--space-4)" }}>
        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--color-secondary)', textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Account Details</div>
        {[
          ["Account Name", currentUser?.name], 
          ["Account No.", currentUser?.accountNo], 
          ["Phone", currentUser?.phone], 
          ["Bank", "WalletNG"]
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid var(--color-border)` }}>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>{k}</span>
            <span style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', fontWeight: 700 }}>{v}</span>
          </div>
        ))}
      </Card>
      
      <div style={{ display: "flex", gap: 'var(--space-3)' }}>
        <Button 
          variant={copied ? "primary" : "secondary"} 
          onClick={copy} 
          style={{ flex: 1, background: copied ? 'var(--color-primary)' : 'var(--color-surface)', color: copied ? '#fff' : 'var(--color-text-primary)' }}
        >
          {copied ? <Check size={18} style={{marginRight:8}}/> : <Copy size={18} style={{marginRight:8}}/>} 
          {copied ? "Copied!" : "Copy Acc. No."}
        </Button>
        <Button onClick={onClose} style={{ flex: 1 }}>Done</Button>
      </div>
    </PageTransition>
  );
};

/* ── QR Scanner Screen ── */
export const QRScannerScreen = ({ onScan, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  
  useEffect(() => { startCamera(); return stopCamera; }, []);
  
  const stopCamera = () => { cancelAnimationFrame(rafRef.current); streamRef.current?.getTracks().forEach(t => t.stop()); };
  
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 640 } } });
      streamRef.current = stream;
      if (videoRef.current) { 
        videoRef.current.srcObject = stream; 
        await videoRef.current.play(); 
        setScanning(true); 
        rafRef.current = requestAnimationFrame(tick); 
      }
    } catch (e) { setError("Camera access denied. Allow camera permission and try again."); }
  };
  
  const tick = () => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c || v.readyState < 2) { rafRef.current = requestAnimationFrame(tick); return; }
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext("2d", { willReadFrequently: true }); ctx.drawImage(v, 0, 0);
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
    if (code) { stopCamera(); setScanning(false); onScan(code.data); return; }
    rafRef.current = requestAnimationFrame(tick);
  };

  return (
    <PageTransition style={{ display: "flex", flexDirection: "column", gap: 'var(--space-4)' }}>
      <div style={{ background: `linear-gradient(145deg, var(--color-secondary), var(--color-secondary-light))`, borderRadius: 'var(--radius-2xl)', padding: "var(--space-4)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", color: '#fff' }}>
          <QrCode size={24} />
        </div>
        <div>
          <div style={{ color: '#fff', fontWeight: 900, fontSize: 'var(--text-base)' }}>Scan QR Code</div>
          <div style={{ color: "rgba(255,255,255,.7)", fontSize: 'var(--text-xs)' }}>Point camera at recipient's QR</div>
        </div>
      </div>
      
      <div style={{ position: "relative", borderRadius: 'var(--radius-2xl)', overflow: "hidden", background: "#000", height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover", display: error ? "none" : "block" }} muted playsInline />
        
        {scanning && !error && (
          <>
            <div style={{ position: "absolute", left: "12%", right: "12%", top: "15%", bottom: "15%", border: `2px solid rgba(255,255,255,0.8)`, borderRadius: 'var(--radius-xl)', boxShadow: '0 0 0 4000px rgba(0,0,0,0.5)' }}>
              <motion.div 
                animate={{ top: ["0%", "98%", "0%"] }}
                transition={{ duration: 2.5, ease: "linear", repeat: Infinity }}
                style={{ position: "absolute", left: 0, right: 0, height: 2, background: 'var(--color-primary)', boxShadow: '0 0 8px 1px var(--color-primary)' }} 
              />
            </div>
            <div style={{ position: "absolute", bottom: 20, background: "rgba(0,0,0,.7)", color: '#fff', fontSize: 'var(--text-xs)', fontWeight: 700, padding: "6px 16px", borderRadius: 'var(--radius-full)' }}>Scanning Code...</div>
          </>
        )}
        
        {error && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 24, textAlign: 'center' }}>
            <Camera size={48} color="rgba(255,255,255,0.3)" />
            <div style={{ color: 'var(--color-danger)', fontWeight: 700, fontSize: 'var(--text-sm)' }}>{error}</div>
          </div>
        )}
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
      
      <Button variant="secondary" onClick={() => { stopCamera(); onClose(); }} style={{ marginTop: 'auto' }}>
        <X size={18} style={{marginRight: 6}} /> Cancel Scan
      </Button>
    </PageTransition>
  );
};

/* ── NFC Transfer Screen ── */
export const NFCTransferScreen = ({ amount, recipient, note, onSuccess, onCancel }) => {
  const [phase, setPhase] = useState("ready");
  
  const simulate = () => {
    setPhase("tapping");
    setTimeout(() => setPhase("processing"), 2400 + Math.random() * 600);
    setTimeout(() => {
      setPhase("done");
      const txn = { id: "TX" + Date.now(), type: "debit", party: recipient, amount, note: note || "NFC Tap Payment", date: new Date().toISOString().split("T")[0], time: new Date().toTimeString().slice(0, 5), status: "confirmed", channel: "nfc" };
      setTimeout(() => onSuccess(txn), 1000);
    }, 4200 + Math.random() * 400);
  };
  
  const startNFC = async () => {
    if ("NDEFReader" in window) {
      try {
        const r = new window.NDEFReader(); await r.scan();
        setPhase("tapping");
        r.onreading = () => { 
          setPhase("processing"); 
          setTimeout(() => { 
            setPhase("done"); 
            onSuccess({ id: "TX" + Date.now(), type: "debit", party: recipient, amount, note: note || "NFC Payment", date: new Date().toISOString().split("T")[0], time: new Date().toTimeString().slice(0, 5), status: "confirmed", channel: "nfc" }); 
          }, 1200); 
        };
        return;
      } catch (e) { /* fall through to simulation */ }
    }
    simulate();
  };
  
  const labels = { 
    ready: "Tap Start NFC to begin", 
    tapping: "Detecting nearby device...", 
    processing: "Processing payment...", 
    done: "Payment Sent!" 
  };
  
  return (
    <PageTransition style={{ display: "flex", flexDirection: "column", gap: 'var(--space-4)', alignItems: "center", minHeight: '65vh', justifyContent: 'center' }}>
      <div style={{ background: `linear-gradient(145deg, var(--color-secondary), var(--color-secondary-light))`, borderRadius: 'var(--radius-2xl)', padding: "var(--space-4) var(--space-6)", width: "100%", textAlign: "center" }}>
        <div style={{ color: '#fff', fontWeight: 900, fontSize: 'var(--text-lg)' }}>NFC Tap Payment</div>
        <div style={{ color: "rgba(255,255,255,.7)", fontSize: 'var(--text-xs)', marginTop: 2 }}>Hold phones back-to-back to pay</div>
      </div>
      
      <div style={{ position: "relative", width: 220, height: 220, display: "flex", alignItems: "center", justifyContent: "center", margin: "var(--space-6) 0" }}>
        {phase === "tapping" && [68, 88, 108].map((r, i) => (
          <motion.div 
            key={i} 
            initial={{ scale: 0.5, opacity: 0.8 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{ repeat: Infinity, duration: 2, delay: i * 0.4 }}
            style={{ position: "absolute", width: r * 2, height: r * 2, borderRadius: "50%", border: `2px solid var(--color-primary)` }} 
          />
        ))}
        <motion.div 
          animate={phase === "processing" ? { scale: [1, 1.1, 1] } : {}} 
          transition={{ repeat: Infinity, duration: 1 }}
          style={{ width: 120, height: 120, borderRadius: "50%", background: phase === "done" ? `var(--color-primary)` : `linear-gradient(135deg, var(--color-secondary), var(--color-secondary-light))`, display: "flex", alignItems: "center", justifyContent: "center", color: '#fff', boxShadow: 'var(--shadow-xl)', transition: "all .3s" }}
        >
          {phase === "done" ? <Check size={56} /> : phase === "processing" ? <Zap size={56} /> : <SmartphoneNfc size={56} />}
        </motion.div>
      </div>
      
      <div style={{ textAlign: "center", marginBottom: 'var(--space-6)' }}>
        <div style={{ fontWeight: 900, fontSize: 'var(--text-4xl)', color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>{fmtAmt(amount)}</div>
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginTop: 4 }}>to <strong style={{color: 'var(--color-text-primary)'}}>{recipient}</strong></div>
        <div style={{ marginTop: 16, fontSize: 'var(--text-sm)', fontWeight: 700, color: phase === "done" ? 'var(--color-primary)' : phase === "processing" ? '#3B82F6' : phase === "tapping" ? 'var(--color-warning)' : 'var(--color-text-secondary)' }}>
          {labels[phase]}
        </div>
      </div>
      
      <div style={{ marginTop: 'auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {phase === "ready" && (
          <>
            <Button onClick={startNFC} fullWidth>Start NFC Tap</Button>
            <Button variant="secondary" onClick={onCancel} fullWidth>Cancel</Button>
          </>
        )}
        {phase === "tapping" && (
          <Button variant="outline" onClick={onCancel} fullWidth style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>Cancel Scan</Button>
        )}
      </div>
    </PageTransition>
  );
};
