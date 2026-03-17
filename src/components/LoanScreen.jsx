import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, ShieldCheck, ChevronRight, Zap } from 'lucide-react';
import { PageTransition, Button } from './ui';

const fmtAmt = n => "₦" + n.toLocaleString("en-NG");

const loanScore = (txns) => {
  const vol = txns.reduce((s,t) => s + t.amount, 0);
  const freq = txns.length;
  let score = 20 + Math.min(30, (vol / 100000) * 30) + Math.min(50, (freq / 50) * 50);
  return Math.max(10, Math.min(99, Math.round(score)));
};

const LoanScreen = ({ txns }) => {
  const score = loanScore(txns);
  const maxLoan = score >= 70 ? 50000 : score >= 50 ? 25000 : score >= 30 ? 10000 : 5000;
  const tier = score >= 70 ? "Gold" : score >= 50 ? "Silver" : score >= 30 ? "Bronze" : "Starter";
  const tierColor = score >= 70 ? "#F5A623" : score >= 50 ? "#94A3B8" : score >= 30 ? "#D97706" : "var(--color-text-muted)";
  
  let finalScoreColor;
  if(score >= 70) finalScoreColor = "var(--color-primary)";
  else if (score >= 50) finalScoreColor = "#3B82F6";
  else if (score >= 30) finalScoreColor = "var(--color-warning)";
  else finalScoreColor = "var(--color-danger)";

  const R = 52, circ = 2 * Math.PI * R, dash = (score / 100) * circ;

  return (
    <PageTransition style={{ padding: '0 var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4 }}>Micro-Loans</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>Your eligibility based on transaction history</p>
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{ 
          background: `linear-gradient(135deg, var(--color-secondary), var(--color-secondary-light))`, 
          borderRadius: 'var(--radius-2xl)', 
          padding: 'var(--space-6)', 
          display: "flex", alignItems: "center", gap: 'var(--space-6)',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative', overflow: 'hidden'
        }}
      >
        <div style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.1 }}>
          <ShieldCheck size={180} />
        </div>
        
        <div style={{ position: 'relative' }}>
          <svg width="120" height="120" viewBox="0 0 130 130" style={{ flexShrink: 0, transform: "rotate(-90deg)" }}>
            <circle cx="65" cy="65" r={R} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="10" />
            <motion.circle 
              cx="65" cy="65" r={R} fill="none" stroke={finalScoreColor} strokeWidth="10" strokeLinecap="round"
              initial={{ strokeDasharray: `0 ${circ}` }}
              animate={{ strokeDasharray: `${dash} ${circ}` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fill: "white", fontSize: 28, fontWeight: 900, color: '#fff' }}>{score}</span>
            <span style={{ color: "rgba(255,255,255,.6)", fontSize: 10, fontWeight: 700, marginTop: -2 }}>/100</span>
          </div>
        </div>

        <div style={{ zIndex: 1 }}>
          <div style={{ color: "rgba(255,255,255,.6)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: 700 }}>Credit Score</div>
          <div style={{ color: tierColor, fontWeight: 800, fontSize: 'var(--text-base)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={16} /> {tier}
          </div>
          <div style={{ color: "rgba(255,255,255,.6)", fontSize: 'var(--text-xs)', marginBottom: 2 }}>Eligible for</div>
          <div style={{ color: '#fff', fontSize: 'var(--text-3xl)', fontWeight: 900, letterSpacing: '-0.02em' }}>{fmtAmt(maxLoan)}</div>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        {[
          { icon: Zap, label: "Instant Payout", desc: "Straight to wallet" },
          { icon: TrendingUp, label: "Low Interest", desc: "Starts at 5% flat" }
        ].map((F, i) => (
          <div key={i} style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <F.icon size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>{F.label}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{F.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <Button style={{ marginTop: 'auto', background: 'linear-gradient(135deg, var(--color-warning), #EA580C)', color: '#fff', border: 'none' }} fullWidth>
        Apply for {fmtAmt(maxLoan)} Loan <ChevronRight size={18} style={{marginLeft: 8}} />
      </Button>
    </PageTransition>
  );
};

export default LoanScreen;
