import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ShieldCheck, WifiOff, LineChart, AlertTriangle } from 'lucide-react';
import { PageTransition } from './ui';

const EDU = [
  { 
    id: "e1", title: "Protecting your PIN", tag: "Security", color: "var(--color-danger)", 
    icon: ShieldCheck, emoji: "🔒",
    body: "Never share your PIN with anyone. Bank staff will never ask for your PIN. Avoid using obvious numbers like 1234 or your birth year." 
  },
  { 
    id: "e2", title: "How Bluetooth transfers work", tag: "Offline", color: "#3B82F6", 
    icon: WifiOff, emoji: "📶",
    body: "Bluetooth transfers use GATT protocol to securely send funds directly to another device without internet. It requires both users to have WalletNG open and Bluetooth enabled." 
  },
  { 
    id: "e3", title: "Building a good credit score", tag: "Loans", color: "var(--color-primary)", 
    icon: LineChart, emoji: "📈",
    body: "Your credit score improves by transacting regularly and maintaining a healthy balance. Repaying loans on time also drastically increases your score." 
  },
  { 
    id: "e4", title: "Avoiding transfer scams", tag: "Security", color: "var(--color-warning)", 
    icon: AlertTriangle, emoji: "🚨",
    body: "Always verify the recipient's name before confirming a transfer. If a deal sounds too good to be true, it probably is. Reach out to support if suspicious." 
  }
];

const LearnScreen = () => {
  const [open, setOpen] = useState(null);

  return (
    <PageTransition style={{ padding: '0 var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', paddingBottom: 'var(--space-8)' }}>
      <div>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4 }}>Financial Education</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>Quick lessons to grow your money skills</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {EDU.map((c, i) => {
          const isOpen = open === c.id;
          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={c.id} 
              layout
              onClick={() => setOpen(isOpen ? null : c.id)} 
              style={{ 
                borderRadius: 'var(--radius-xl)', 
                border: `1px solid ${isOpen ? 'transparent' : 'var(--color-border)'}`, 
                background: isOpen ? c.color : 'var(--color-surface)', 
                overflow: "hidden", 
                cursor: "pointer",
                boxShadow: isOpen ? `0 8px 24px ${c.color}30` : 'var(--shadow-sm)'
              }}
            >
              <motion.div layout style={{ display: "flex", alignItems: "center", gap: 14, padding: "var(--space-4)" }}>
                <div style={{ 
                  width: 48, height: 48, borderRadius: 'var(--radius-lg)', 
                  background: isOpen ? "rgba(255,255,255,.2)" : `${c.color}15`, 
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  color: isOpen ? '#fff' : c.color
                }}>
                  <c.icon size={24} strokeWidth={2} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 'var(--text-base)', color: isOpen ? '#fff' : 'var(--color-text-primary)', marginBottom: 6 }}>{c.title}</div>
                  <span style={{ 
                    fontSize: 10, fontWeight: 800, borderRadius: 6, padding: "3px 8px", textTransform: 'uppercase', letterSpacing: 0.5,
                    background: isOpen ? "rgba(255,255,255,.2)" : `${c.color}15`, 
                    color: isOpen ? '#fff' : c.color 
                  }}>
                    {c.tag}
                  </span>
                </div>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} style={{ color: isOpen ? "rgba(255,255,255,.8)" : 'var(--color-text-muted)' }}>
                  <ChevronDown size={20} />
                </motion.div>
              </motion.div>
              
              <AnimatePresence>
                {isOpen && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ opacity: { duration: 0.2 } }}
                    style={{ padding: "0 var(--space-4) var(--space-4)" }}
                  >
                    <p style={{ color: "rgba(255,255,255,.95)", fontSize: 'var(--text-sm)', lineHeight: 1.6, margin: 0, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                      {c.body}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </PageTransition>
  );
};

export default LearnScreen;
