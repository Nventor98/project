import React from 'react';
import { motion } from 'framer-motion';

export const Card = ({ children, style = {}, noPadding = false, className = "", ...props }) => (
  <motion.div 
    className={`wn-card ${className}`}
    style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-2xl)',
      boxShadow: 'var(--shadow-md)',
      padding: noPadding ? 0 : 'var(--space-5)',
      overflow: 'hidden',
      border: '1px solid var(--color-border)',
      ...style
    }}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    {...props}
  >
    {children}
  </motion.div>
);

export const Button = ({ children, variant = 'primary', size = 'md', style = {}, isLoading = false, fullWidth = false, ...props }) => {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    borderRadius: 'var(--radius-xl)',
    transition: 'all var(--transition-fast)',
    cursor: props.disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: props.disabled ? 0.6 : 1,
    width: fullWidth ? '100%' : 'auto',
    border: 'none',
    ...style
  };

  if (isPrimary) {
    baseStyle.background = 'var(--color-primary)';
    baseStyle.color = '#fff';
    baseStyle.boxShadow = '0 6px 15px rgba(16, 185, 129, 0.25)';
  } else if (isSecondary) {
    baseStyle.background = 'var(--color-secondary)';
    baseStyle.color = '#fff';
    baseStyle.boxShadow = '0 6px 15px rgba(10, 25, 47, 0.2)';
  } else if (variant === 'ghost') {
    baseStyle.background = 'transparent';
    baseStyle.color = 'var(--color-text-secondary)';
  } else {
    // outline
    baseStyle.background = 'transparent';
    baseStyle.border = '2px solid var(--color-border)';
    baseStyle.color = 'var(--color-text-primary)';
  }

  if (size === 'md') {
    baseStyle.padding = 'var(--space-3) var(--space-5)';
    baseStyle.fontSize = 'var(--text-base)';
  } else if (size === 'lg') {
    baseStyle.padding = 'var(--space-4) var(--space-6)';
    baseStyle.fontSize = 'var(--text-lg)';
  } else {
    baseStyle.padding = 'var(--space-2) var(--space-3)';
    baseStyle.fontSize = 'var(--text-sm)';
  }

  return (
    <motion.button 
      whileTap={!(props.disabled || isLoading) ? { scale: 0.96 } : {}}
      style={baseStyle}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? "Loading..." : children}
    </motion.button>
  );
};

export const Input = React.forwardRef(({ label, error, icon: Icon, style = {}, containerStyle = {}, ...props }, ref) => {
  const hasIcon = !!Icon;
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', ...containerStyle }}>
      {label && <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-secondary)' }}>{label}</label>}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {hasIcon && (
          <div style={{ position: 'absolute', left: 'var(--space-3)', color: 'var(--color-text-muted)' }}>
            <Icon size={20} />
          </div>
        )}
        <input
          ref={ref}
          style={{
            width: '100%',
            background: 'var(--color-bg)',
            border: `1.5px solid ${error ? 'var(--color-danger)' : 'transparent'}`,
            borderRadius: 'var(--radius-xl)',
            padding: `var(--space-3) var(--space-4)`,
            paddingLeft: hasIcon ? 'var(--space-10)' : 'var(--space-4)',
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-primary)',
            outline: 'none',
            transition: 'all var(--transition-fast)',
            ...style
          }}
          {...props}
        />
      </div>
      {error && (
        <motion.span 
          initial={{ opacity: 0, height: 0 }} 
          animate={{ opacity: 1, height: 'auto' }} 
          style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)', fontWeight: 500, marginLeft: 'var(--space-1)' }}
        >
          {error}
        </motion.span>
      )}
    </div>
  );
});
Input.displayName = 'Input';

export const Avatar = ({ name, url, size = 44 }) => {
  const initials = name?.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase() || '?';
  
  if (url) {
    return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: 'var(--radius-full)', objectFit: 'cover' }} />;
  }

  return (
    <div 
      style={{
        width: size, 
        height: size, 
        borderRadius: 'var(--radius-full)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontWeight: 800,
        color: '#fff',
        background: 'linear-gradient(135deg, var(--color-accent), var(--color-secondary))',
        fontSize: size * 0.4,
        boxShadow: 'var(--shadow-md)'
      }}
    >
      {initials}
    </div>
  );
};

export const PageTransition = ({ children, style = {} }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -15 }}
    transition={{ type: "spring", stiffness: 300, damping: 30 }}
    style={{ width: '100%', height: '100%', ...style }}
  >
    {children}
  </motion.div>
);
