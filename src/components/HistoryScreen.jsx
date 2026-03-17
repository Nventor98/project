import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { Card, PageTransition } from './ui';
import { TxnItem } from './HomeScreen.jsx';

const fmtAmt = n => "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2 });

const HistoryScreen = ({ txns }) => {
  const [filter, setFilter] = useState("all");
  
  const filtered = filter === "all" ? txns : txns.filter(t => t.type === filter || t.status === filter);
  const totalIn = txns.filter(t => t.type === "credit" && t.status === "confirmed").reduce((s, t) => s + t.amount, 0);
  const totalOut = txns.filter(t => t.type === "debit" && t.status === "confirmed").reduce((s, t) => s + t.amount, 0);

  const filters = [
    { id: "all", label: "All" },
    { id: "credit", label: "Money In" },
    { id: "debit", label: "Money Out" },
    { id: "pending", label: "Pending" }
  ];

  return (
    <PageTransition style={{ padding: '0 var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--color-text-primary)' }}>Transactions</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 'var(--space-3)' }}>
        <motion.div 
          whileHover={{ scale: 1.02 }}
          style={{ background: `linear-gradient(135deg, var(--color-primary), var(--color-primary-light))`, borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div style={{ color: "rgba(255,255,255,.7)", fontSize: 'var(--text-xs)', marginBottom: 4, textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5 }}>Money In</div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 'var(--text-xl)' }}>+{fmtAmt(totalIn)}</div>
        </motion.div>
        <motion.div 
          whileHover={{ scale: 1.02 }}
          style={{ background: `linear-gradient(135deg, var(--color-warning), #F97316)`, borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div style={{ color: "rgba(255,255,255,.7)", fontSize: 'var(--text-xs)', marginBottom: 4, textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5 }}>Money Out</div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 'var(--text-xl)' }}>−{fmtAmt(totalOut)}</div>
        </motion.div>
      </div>

      <div style={{ display: "flex", gap: 'var(--space-2)', overflowX: "auto", paddingBottom: 4, margin: '0 -var(--space-4)', paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {filters.map(f => (
          <motion.button 
            key={f.id} 
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter(f.id)}
            style={{ 
              whiteSpace: "nowrap",
              padding: "8px 16px",
              borderRadius: 'var(--radius-full)',
              fontWeight: 700,
              fontSize: 'var(--text-sm)',
              border: `1px solid ${filter === f.id ? 'var(--color-secondary)' : 'var(--color-border)'}`,
              background: filter === f.id ? 'var(--color-secondary)' : 'var(--color-surface)',
              color: filter === f.id ? '#fff' : 'var(--color-text-secondary)',
              cursor: "pointer",
              transition: 'all 0.2s',
              boxShadow: filter === f.id ? 'var(--shadow-sm)' : 'none',
              flexShrink: 0
            }}
          >
            {f.label}
          </motion.button>
        ))}
      </div>

      <Card style={{ padding: '0 var(--space-4)' }}>
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ textAlign: "center", color: 'var(--color-text-muted)', padding: "var(--space-10) 0", display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
            >
              <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-full)', background: 'var(--color-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Search size={28} color="var(--color-text-muted)" />
              </div>
              <p style={{ fontWeight: 600 }}>No transactions found</p>
            </motion.div>
          ) : (
            filtered.map((t, i) => (
              <motion.div key={t.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: i * 0.05 }} >
                <TxnItem txn={t} />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </Card>
    </PageTransition>
  );
};

export default HistoryScreen;
