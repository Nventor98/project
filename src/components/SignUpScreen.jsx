import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, Lock, ArrowRight, ArrowLeft, ShieldCheck, CheckCircle } from 'lucide-react';
import { Button, Input, Card, PageTransition } from './ui';
import { api } from '../api';

const SignUpScreen = ({ onBack, onSignUp }) => {
  const [step, setStep] = useState(1); // 1: Name, 2: Phone, 3: PIN, 4: Confirm PIN, 5: Success
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    pin: '',
    confirmPin: ''
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const steps = [
    { title: "What's your name?", sub: "Enter your full legal name", icon: User, field: "name", placeholder: "e.g. Bola Adesanya" },
    { title: "Phone number", sub: "We'll send a verification code", icon: Phone, field: "phone", placeholder: "080 0000 0000", type: "tel" },
    { title: "Create a PIN", sub: "Secure your wallet with a 4-digit PIN", icon: Lock, field: "pin", placeholder: "••••", type: "password", maxLength: 4 },
    { title: "Confirm PIN", sub: "Re-enter your PIN to verify", icon: ShieldCheck, field: "confirmPin", placeholder: "••••", type: "password", maxLength: 4 }
  ];

  const handleNext = async () => {
    setError("");
    const currentStep = steps[step - 1];
    const val = formData[currentStep.field];

    if (!val) {
      setError(`Please enter your ${currentStep.field}`);
      return;
    }

    if (step === 2 && val.replace(/\D/g, "").length < 10) {
      setError("Please enter a valid phone number");
      return;
    }

    if ((step === 3 || step === 4) && val.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }

    if (step === 4 && val !== formData.pin) {
      setError("PINs do not match");
      return;
    }

    if (step < 4) {
      setStep(step + 1);
    } else {
      // Final submission
      setLoading(true);
      try {
        const user = await api.register(formData.name, formData.phone, formData.pin);
        setStep(5);
        setTimeout(() => onSignUp(user), 2000);
      } catch (err) {
        setError(err.message || "Registration failed. Try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const current = steps[step - 1];

  if (step === 5) {
    return (
      <PageTransition style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 'var(--space-8)', textAlign: 'center' }}>
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          style={{ marginBottom: 'var(--space-6)', color: 'var(--color-primary)' }}
        >
          <CheckCircle size={80} />
        </motion.div>
        <h2 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginBottom: 'var(--space-2)' }}>Account Created!</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>Welcome to WalletNG. Redirecting you to your dashboard...</p>
      </PageTransition>
    );
  }

  return (
    <PageTransition style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 'var(--space-6) var(--space-6) var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={step === 1 ? onBack : () => setStep(step - 1)} style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
          <ArrowLeft size={18} /> {step === 1 ? "Back to Login" : "Back"}
        </button>
        <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', fontWeight: 700 }}>STEP {step} OF 4</div>
      </div>

      <div style={{ padding: '0 var(--space-6) var(--space-8)', flex: 1 }}>
        <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 2, marginBottom: 'var(--space-8)', overflow: 'hidden' }}>
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(step / 4) * 100}%` }}
            style={{ height: '100%', background: 'var(--color-primary)' }}
          />
        </div>

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
                value={formData[current.field]}
                onChange={e => setFormData({ ...formData, [current.field]: e.target.value })}
                maxLength={current.maxLength}
                error={error}
                onKeyPress={e => e.key === 'Enter' && handleNext()}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{ padding: 'var(--space-6)', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <Button fullWidth onClick={handleNext} isLoading={loading}>
          {step === 4 ? "Complete Profile" : "Continue"} <ArrowRight size={18} style={{ marginLeft: 8 }} />
        </Button>
      </div>
    </PageTransition>
  );
};

export default SignUpScreen;
