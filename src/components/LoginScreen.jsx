import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Lock, Fingerprint, ArrowRight, ShieldCheck } from 'lucide-react';
import { Card, Button, Input, Avatar, PageTransition } from './ui';

const DEFAULT_PHONE = "08034521000";

const LoginScreen = ({ onLogin, users, onSignUp, onRecover }) => {
  const [step, setStep] = useState("phone"); // 'phone' | 'pin' | 'bio'
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

  useEffect(() => {
    if (!locked) return;
    const t = setInterval(() => setLockTimer(s => { 
      if (s <= 1) { clearInterval(t); setLocked(false); setAttempts(0); setError(""); return 0; } 
      return s - 1; 
    }), 1000);
    return () => clearInterval(t);
  }, [locked]);

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };
  
  const fmtPhone = raw => { 
    const d = raw.replace(/\D/g, "").slice(0, 11); 
    if (d.length <= 4) return d; 
    if (d.length <= 7) return d.slice(0, 4) + " " + d.slice(4); 
    return d.slice(0, 4) + " " + d.slice(4, 7) + " " + d.slice(7); 
  };

  const findUser = p => { 
    const c = p.replace(/\D/g, ""); 
    return users?.find(u => u.phone === c || u.phone === "0" + c.slice(-10)); 
  };

  const handlePhoneNext = () => {
    setError(""); 
    setStep("pin");
  };

  const handlePinKey = (key) => {
    if (locked) return;
    if (key === "⌫") { setPin(p => p.slice(0, -1)); setError(""); return; }
    if (pin.length >= 4) return;
    
    const next = pin + key; 
    setPin(next);
    
    if (next.length === 4) {
      setTimeout(async () => {
        try {
          await onLogin(phone, next);
          setError("");
        } catch (err) {
          const na = attempts + 1; 
          setAttempts(na); 
          triggerShake(); 
          setPin("");
          
          if (na >= 3) { 
            setLocked(true); 
            setLockTimer(30); 
            setError("Too many attempts. Wait 30s."); 
          } else {
            setError(err.message || `Incorrect PIN. ${3 - na} attempt${3 - na === 1 ? "" : "s"} left.`);
          }
        }
      }, 300);
    }
  };

  const handleBio = () => { 
    setStep("bio"); 
    setTimeout(() => { 
      setStep("bio_done"); 
      setTimeout(() => onLogin(DEFAULT_PHONE, "1234"), 800); 
    }, 2000); 
  };

  if (step === "bio" || step === "bio_done") {
    return (
      <PageTransition style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-8)', textAlign: 'center' }}>
        <motion.div 
          animate={step === "bio" ? { scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] } : { scale: 1.2, color: 'var(--color-primary)' }}
          transition={step === "bio" ? { repeat: Infinity, duration: 1.5 } : { duration: 0.3 }}
          style={{ marginBottom: 'var(--space-6)', color: 'var(--color-accent)' }}
        >
          {step === "bio_done" ? <ShieldCheck size={80} /> : <Fingerprint size={80} strokeWidth={1} />}
        </motion.div>
        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
          {step === "bio_done" ? "Verified!" : "Touch the sensor"}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
          {step === "bio_done" ? "Signing you in securely..." : "Place your finger on the sensor to authenticate"}
        </p>
      </PageTransition>
    );
  }

  if (step === "pin") {
    const user = findUser(phone);
    return (
      <PageTransition style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ 
          background: 'linear-gradient(135deg, var(--color-secondary), var(--color-secondary-light))', 
          padding: '40px 20px 30px', 
          borderBottomLeftRadius: 'var(--radius-3xl)', 
          borderBottomRightRadius: 'var(--radius-3xl)', 
          textAlign: 'center', 
          position: 'relative',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <button 
            onClick={() => { setStep("phone"); setPin(""); setError(""); }} 
            style={{ position: 'absolute', left: 20, top: 40, color: 'rgba(255,255,255,0.8)' }}
          >
            ← Back
          </button>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
            <Avatar name={user?.name || "User"} size={64} />
          </div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 'var(--text-lg)' }}>{user?.name || "User"}</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'var(--text-sm)', marginTop: 4 }}>{fmtPhone(phone)}</div>
        </div>

        <div style={{ padding: 'var(--space-6)', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, textAlign: 'center', marginBottom: 'var(--space-1)' }}>Enter your PIN</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            {locked ? `🔒 Locked for ${lockTimer}s` : "Your 4-digit security PIN"}
          </p>
          
          <motion.div 
            animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
            style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}
          >
            {[0, 1, 2, 3].map(i => (
              <div 
                key={i} 
                style={{ 
                  width: 50, height: 50, 
                  borderRadius: 'var(--radius-xl)', 
                  border: `2px solid ${error ? 'var(--color-danger)' : i < pin.length ? 'var(--color-primary)' : 'var(--color-border)'}`, 
                  background: error ? 'rgba(239, 68, 68, 0.05)' : i < pin.length ? 'var(--color-primary)' : 'var(--color-surface)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  transition: 'all 0.2s' 
                }}
              >
                {i < pin.length && <motion.div initial={{scale:0}} animate={{scale:1}} style={{ width: 12, height: 12, borderRadius: '50%', background: error ? 'var(--color-danger)' : '#fff' }} />}
              </div>
            ))}
          </motion.div>
          
          {error && <div style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-danger)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>{error}</div>}
          
          <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 300, margin: '0 auto var(--space-6)' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((k, i) => (
              <motion.button 
                key={i} 
                disabled={k === "" || locked} 
                onClick={() => handlePinKey(String(k))} 
                whileTap={k !== "" && !locked ? { scale: 0.9 } : {}}
                style={{ 
                  background: k === "" ? "transparent" : locked ? "var(--color-bg)" : "var(--color-surface)", 
                  border: `1px solid ${k === "" || locked ? "transparent" : "var(--color-border)"}`, 
                  borderRadius: 'var(--radius-xl)', 
                  padding: 20, 
                  fontSize: k === "⌫" ? 20 : 24, 
                  fontWeight: 600, 
                  color: locked ? 'var(--color-text-muted)' : 'var(--color-text-primary)', 
                  opacity: k === "" ? 0 : 1,
                  boxShadow: k !== "" && !locked ? 'var(--shadow-sm)' : 'none'
                }} 
              >
                {k}
              </motion.button>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <button onClick={handleBio} style={{ color: 'var(--color-accent)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Fingerprint size={18} /> Use Biometrics
            </button>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
            <button onClick={onRecover} style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
              Forgot PIN?
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  // PHONE STEP
  return (
    <PageTransition style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg)' }}>
      <div style={{ 
        background: 'linear-gradient(135deg, var(--color-secondary), var(--color-secondary-light))', 
        padding: '50px 24px 40px', 
        textAlign: 'center', 
        borderBottomLeftRadius: 'var(--radius-3xl)', 
        borderBottomRightRadius: 'var(--radius-3xl)', 
        marginBottom: 'var(--space-6)',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ 
          width: 72, height: 72, 
          borderRadius: 'var(--radius-2xl)', 
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          margin: '0 auto var(--space-4)', 
          boxShadow: 'var(--shadow-glow)' 
        }}>
          <ShieldCheck size={36} color="white" />
        </div>
        <div style={{ color: '#fff', fontSize: 'var(--text-3xl)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>WalletNG</div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>Secure · Fast · Offline-Ready</div>
      </div>
      
      <div style={{ padding: '0 var(--space-6)', flex: 1 }}>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: 'var(--space-1)' }}>Welcome back</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>Enter your registered phone number</p>
        
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <Input 
            icon={Phone}
            label="Phone Number"
            value={fmtPhone(phone)} 
            onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))} 
            placeholder="080 0000 0000" 
            inputMode="numeric" 
            error={error}
          />
        </div>
        
        <Button 
          fullWidth 
          onClick={handlePhoneNext} 
          disabled={phone.replace(/\D/g, "").length < 10} 
          style={{ marginBottom: 'var(--space-5)' }}
        >
          Continue <ArrowRight size={18} style={{marginLeft: 8}} />
        </Button>
        
        <div style={{ textAlign: "center", marginBottom: 'var(--space-6)' }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>or sign in with</span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          </div>
          <Button variant="outline" fullWidth onClick={handleBio} style={{ color: 'var(--color-secondary)' }}>
            <Fingerprint size={18} style={{marginRight: 8}} /> Fingerprint / Face ID
          </Button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            Don't have an account?{' '}
            <button onClick={onSignUp} style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
              Sign Up
            </button>
          </p>
        </div>
        
        <Card style={{ background: 'linear-gradient(135deg, var(--color-secondary), var(--color-secondary-light))', border: 'none' }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <ShieldCheck size={16} color="var(--color-primary)" />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 'var(--text-sm)' }}>Demo Credentials</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[["Phone", DEFAULT_PHONE], ["PIN", "1234"]].map(([k, v]) => (
              <div key={k} style={{ background: "rgba(255,255,255,.05)", borderRadius: 'var(--radius-lg)', padding: '10px 12px' }}>
                <div style={{ color: "rgba(255,255,255,.5)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{k}</div>
                <div style={{ color: 'var(--color-primary-light)', fontWeight: 800, fontSize: 'var(--text-base)', letterSpacing: 1 }}>{v}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageTransition>
  );
};

export default LoginScreen;
