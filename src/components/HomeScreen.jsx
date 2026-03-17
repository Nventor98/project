import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';
import { 
  Eye, EyeOff, Send, Download, QrCode, Smartphone, 
  Lightbulb, PiggyBank, BarChart, MoreHorizontal, 
  ArrowUpRight, ArrowDownLeft, RefreshCw, ChevronRight
} from 'lucide-react';
import { Card, PageTransition } from './ui';

const fmtDate = d => new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
const fmtAmt = n => "₦" + n.toLocaleString("en-NG");

export const TxnItem = ({ txn }) => {
  const isCredit = txn.type === "credit";
  const isPending = txn.status === "pending";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-3) 0", borderBottom: "1px solid var(--color-border)" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <div style={{ 
          width: 40, height: 40, borderRadius: 'var(--radius-full)', 
          background: isCredit ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
          display: "flex", alignItems: "center", justifyContent: "center", 
          color: isCredit ? 'var(--color-primary)' : 'var(--color-danger)'
        }}>
          {isCredit ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
        </div>
        <div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text-primary)' }}>{txn.party}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', display: "flex", alignItems: "center", gap: 4 }}>
            {fmtDate(txn.date)} • {txn.time}
            {isPending && <span style={{ background: 'var(--color-warning)', color: '#fff', fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>PENDING</span>}
          </div>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: isCredit ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
          {isCredit ? "+" : "−"}{fmtAmt(txn.amount)}
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{txn.note}</div>
      </div>
    </motion.div>
  );
};

const HomeScreen = ({ txns, balance, online, onSync, onReceive, onQRScan, onSend }) => {
  const [hide, setHide] = useState(false);
  const pending = txns.filter(t => t.status === "pending");
  const todayIn = txns.filter(t => t.date === new Date().toISOString().split("T")[0] && t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const todayOut = txns.filter(t => t.date === new Date().toISOString().split("T")[0] && t.type === "debit").reduce((s, t) => s + t.amount, 0);
  
  const svcs = [
    { icon: Send, label: "Send Money", color: "var(--color-primary)", act: onSend }, 
    { icon: Download, label: "Receive", color: "var(--color-accent)", act: onReceive }, 
    { icon: QrCode, label: "QR Pay", color: "var(--color-secondary)", act: onQRScan }, 
    { icon: Smartphone, label: "Airtime", color: "#8B5CF6", act: null }, 
    { icon: Lightbulb, label: "Utilities", color: "var(--color-warning)", act: null }, 
    { icon: PiggyBank, label: "Savings", color: "#14B8A6", act: null }, 
    { icon: BarChart, label: "Loans", color: "var(--color-danger)", act: null }, 
    { icon: MoreHorizontal, label: "More", color: "var(--color-text-secondary)", act: null }
  ];

  return (
    <PageTransition style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{ 
          background: 'linear-gradient(135deg, var(--color-secondary), var(--color-secondary-light))', 
          borderRadius: 'var(--radius-2xl)', 
          padding: 'var(--space-6)', 
          position: "relative", 
          overflow: "hidden",
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <div style={{ position: "absolute", right: -40, top: -40, width: 150, height: 150, borderRadius: "50%", background: "linear-gradient(135deg, var(--color-primary), transparent)", opacity: 0.2 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 'var(--space-4)', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 'var(--text-xs)', color: "rgba(255,255,255,.7)", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Wallet Balance</div>
          <button 
            onClick={() => setHide(h => !h)} 
            style={{ 
              background: "rgba(255,255,255,.1)", border: "none", borderRadius: 'var(--radius-md)', 
              color: "rgba(255,255,255,.8)", padding: "6px 10px", 
              display: "flex", alignItems: "center", gap: 6, fontSize: 'var(--text-xs)', fontWeight: 700 
            }}
          >
            {hide ? <Eye size={14} /> : <EyeOff size={14} />} {hide ? "Show" : "Hide"}
          </button>
        </div>
        
        <div style={{ fontSize: 'var(--text-4xl)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 'var(--space-6)', position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--text-2xl)', marginRight: 4 }}>₦</span>
          {hide ? "••••••" : (
            <CountUp end={balance} duration={1} separator="," decimals={0} />
          )}
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 'var(--space-2)', position: 'relative', zIndex: 1 }}>
          {[
            { label: "Today In", val: `+${fmtAmt(todayIn)}`, c: "var(--color-primary-light)" }, 
            { label: "Today Out", val: `−${fmtAmt(todayOut)}`, c: "var(--color-warning)" }, 
            { label: "Pending", val: pending.length + " txns", c: "var(--color-accent)" }
          ].map((s, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + (idx * 0.1) }}
              key={s.label} 
              style={{ background: "rgba(255,255,255,.1)", backdropFilter: 'blur(10px)', borderRadius: 'var(--radius-lg)', padding: "10px 8px" }}
            >
              <div style={{ fontSize: 9, color: "rgba(255,255,255,.5)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>{s.label}</div>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: s.c }}>{s.val}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <AnimatePresence>
        {online && pending.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onClick={onSync} 
            style={{ 
              background: 'linear-gradient(90deg, var(--color-warning), #F97316)', 
              borderRadius: 'var(--radius-xl)', 
              padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 12, 
              cursor: "pointer", 
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)' 
            }}
          >
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
              <RefreshCw color="white" size={24} />
            </motion.div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 'var(--text-sm)' }}>Sync pending transactions</div>
              <div style={{ color: "rgba(255,255,255,.8)", fontSize: 'var(--text-xs)', fontWeight: 500 }}>Back online — tap to sync now</div>
            </div>
            <ChevronRight color="white" />
          </motion.div>
        )}
      </AnimatePresence>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 'var(--space-4)' }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: 'var(--color-secondary)' }}>Services</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', fontWeight: 700 }}>See all</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 'var(--space-3)' }}>
          {svcs.map((Svc, i) => (
            <motion.div 
              key={Svc.label} 
              onClick={Svc.act} 
              whileTap={{ scale: 0.9 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}
            >
              <div style={{ 
                width: 48, height: 48, borderRadius: 'var(--radius-xl)', 
                background: Svc.act ? `${Svc.color}15` : 'var(--color-surface-hover)', 
                display: "flex", alignItems: "center", justifyContent: "center", 
                color: Svc.act ? Svc.color : 'var(--color-text-secondary)',
                border: Svc.act ? `1px solid ${Svc.color}30` : '1px solid var(--color-border)'
              }}>
                <Svc.icon size={22} strokeWidth={Svc.act ? 2.5 : 2} />
              </div>
              <span style={{ fontSize: '10px', color: Svc.act ? 'var(--color-secondary)' : 'var(--color-text-secondary)', fontWeight: Svc.act ? 700 : 500, textAlign: "center", lineHeight: 1.2 }}>
                {Svc.label}
              </span>
            </motion.div>
          ))}
        </div>
      </Card>

      <motion.div 
        whileHover={{ scale: 1.02 }}
        style={{ 
          background: 'linear-gradient(135deg, var(--color-accent), #60A5FA)', 
          borderRadius: 'var(--radius-xl)', 
          padding: "16px 20px",
          display: "flex", alignItems: "center", gap: 12,
          boxShadow: 'var(--shadow-md)'
        }}
      >
        <div style={{ background: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: '50%' }}>
          <Lightbulb color="white" size={24} />
        </div>
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 'var(--text-sm)' }}>Refer & Earn ₦500</div>
          <div style={{ color: "rgba(255,255,255,.8)", fontSize: 'var(--text-xs)' }}>Invite a friend to get rewarded</div>
        </div>
      </motion.div>

      <Card style={{ marginBottom: 'var(--space-10)' }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: 'var(--color-secondary)' }}>Recent Transactions</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', fontWeight: 700 }}>See all</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {txns.slice(0, 5).map(t => <TxnItem key={t.id} txn={t} />)}
          {txns.length === 0 && (
            <div style={{ padding: 'var(--space-6) 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              No recent transactions
            </div>
          )}
        </div>
      </Card>
    </PageTransition>
  );
};

export default HomeScreen;
