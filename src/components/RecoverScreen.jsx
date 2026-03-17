import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Lock, Key, ArrowRight, ArrowLeft, ShieldCheck, CheckCircle } from 'lucide-react';
import { Button, Input, Card, PageTransition } from './ui';
import { api } from '../api';

const RecoverScreen = ({ onBack }) => {
  const [step, setStep] = useState(1); // 1: Phone, 2: OTP, 3: New PIN, 4: Success
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestOTP = async () => {
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Please enter a valid phone number");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.requestReset(phone);
      setStep(2);
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length < 4) {
      setError("Enter the 6-digit code sent to you");
      return;
    }
    setError("");
    setStep(3);
  };

  const handleResetPin = async () => {
    if (newPin.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }
    setLoading(true);
    try {
      await api.resetPin(phone, otp, newPin);
      setStep(4);
      setTimeout(onBack, 2500);
    } catch (err) {
      setError(err.message || "Failed to reset PIN");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { title: "Forgot PIN?", sub: "Enter your phone number to recover your account", icon: Phone, field: "phone", placeholder: "080 0000 0000", action: handleRequestOTP, btn: "Send Code" },
    { title: "Verify Phone", sub: "Enter the 6-digit code sent via SMS", icon: Key, field: "otp", placeholder: "123456", action: handleVerifyOTP, btn: "Verify Code" },
    { title: "New PIN", sub: "Create a new 4-digit security PIN", icon: Lock, field: "newPin", placeholder: "••••", type: "password", maxLength: 4, action: handleResetPin, btn: "Reset PIN" }
  ];

  const current = steps[step - 1];

  if (step === 4) {
    return (
      <PageTransition style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 'var(--space-8)', textAlign: 'center' }}>
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{ marginBottom: 'var(--space-6)', color: 'var(--color-primary)' }}
        >
          <CheckCircle size={80} />
        </motion.div>
        <h2 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginBottom: 'var(--space-2)' }}>PIN Reset!</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>Your security PIN has been updated. You can now log in with your new PIN.</p>
      </PageTransition>
    );
  }

  return (
    <PageTransition style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 'var(--space-6) var(--space-6) var(--space-4)', display: 'flex', alignItems: 'center' }}>
        <button onClick={step === 1 ? onBack : () => setStep(step - 1)} style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
          <ArrowLeft size={18} /> {step === 1 ? "Back to Login" : "Back"}
        </button>
      </div>

      <div style={{ padding: '0 var(--space-6) var(--space-8)', flex: 1 }}>
        <AnimatePresence mode="wait">
          <motion.div 
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: 'var(--space-1)' }}>{current.title}</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-8)' }}>{current.sub}</p>

            <div style={{ marginBottom: 'var(--space-8)' }}>
              <Input 
                autoFocus
                icon={current.icon}
                placeholder={current.placeholder}
                type={current.type || "text"}
                value={step === 1 ? phone : step === 2 ? otp : newPin}
                onChange={e => {
                  const val = e.target.value;
                  if (step === 1) setPhone(val);
                  if (step === 2) setOtp(val);
                  if (step === 3) setNewPin(val);
                }}
                maxLength={current.maxLength}
                error={error}
                onKeyPress={e => e.key === 'Enter' && current.action()}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{ padding: 'var(--space-6)', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <Button fullWidth onClick={current.action} isLoading={loading}>
          {current.btn} <ArrowRight size={18} style={{ marginLeft: 8 }} />
        </Button>
      </div>
    </PageTransition>
  );
};

export default RecoverScreen;
