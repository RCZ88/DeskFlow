import { forwardRef } from 'react';
import type { FinanceFtPerson, FinanceTransaction } from '../finance-types';
import { getRepaymentStatus } from '../../../lib/receivables';
import type { ReceiptStyle } from './receiptStyles';

export interface ReceiptPreviewProps {
  style: ReceiptStyle;
  person: FinanceFtPerson;
  txs: FinanceTransaction[];
  total: number;
  displayCurrency: string;
  title: string;
  note: string;
  fmtDate: (d: string) => string;
  fmtMoney: (v: number) => string;
  allTransactions: FinanceTransaction[];
  repaymentTotal?: number;
}

function isRepaid(tx: FinanceTransaction, all: FinanceTransaction[]): boolean {
  const s = getRepaymentStatus(tx, all);
  return s.repaid || Math.abs(tx.amount) - s.totalRepaid <= 0;
}

const W = 480;

function headerBlock(s: ReceiptStyle, title: string, date: string) {
  const base: React.CSSProperties = {
    background: s.headerBg,
    borderBottom: `1px solid ${s.headerBorder}`,
    padding: '24px 24px 20px',
  };
  const brandRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  };
  const brand: React.CSSProperties = {
    fontFamily: s.monoFont,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: s.accent,
  };
  const titleStyle: React.CSSProperties = {
    fontFamily: s.headingFont,
    fontSize: 20,
    fontWeight: 700,
    color: s.text,
    margin: 0,
    lineHeight: 1.3,
  };
  const dateStyle: React.CSSProperties = {
    fontFamily: s.fontFamily,
    fontSize: 12,
    color: s.textSecondary,
    marginTop: 4,
  };

  if (s.headerStyle === 'center') {
    return (
      <div style={{ ...base, textAlign: 'center' }}>
        <div style={brandRow as React.CSSProperties}>
          <div style={{ ...brand, margin: '0 auto' }}>DeskFlow</div>
        </div>
        <div style={titleStyle}>{title}</div>
        <div style={{ ...dateStyle, margin: '4px auto 0' }}>{date}</div>
      </div>
    );
  }
  if (s.headerStyle === 'split') {
    return (
      <div style={base}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={brand}>DeskFlow</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={titleStyle}>{title}</div>
          <div style={{ ...dateStyle, marginTop: 0, textAlign: 'right' as const }}>{date}</div>
        </div>
      </div>
    );
  }
  return (
    <div style={base}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={brand}>DeskFlow</span>
      </div>
      <div style={titleStyle}>{title}</div>
      <div style={dateStyle}>{date}</div>
    </div>
  );
}

function personBlock(s: ReceiptStyle, person: FinanceFtPerson) {
  const labelColor = s.textMuted;
  const valueColor = s.text;
  const container: React.CSSProperties = {
    padding: '16px 24px',
    borderBottom: s.showDividerLine ? `1px solid ${s.divider}` : 'none',
  };
  const label: React.CSSProperties = {
    fontFamily: s.monoFont,
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: labelColor,
    marginBottom: 6,
  };
  const name: React.CSSProperties = {
    fontFamily: s.headingFont,
    fontSize: 16,
    fontWeight: 700,
    color: valueColor,
    marginBottom: 4,
  };
  const detail: React.CSSProperties = {
    fontFamily: s.fontFamily,
    fontSize: 12,
    color: s.textSecondary,
    lineHeight: 1.6,
  };
  return (
    <div style={container}>
      <div style={label}>Billed To</div>
      <div style={name}>{person.name}</div>
      <div style={detail}>
        {person.email && <div>{person.email}</div>}
        {person.phone && <div>{person.phone}</div>}
        {!person.email && !person.phone && <div style={{ color: s.textMuted }}>—</div>}
      </div>
    </div>
  );
}

function amountStyle(s: ReceiptStyle): React.CSSProperties {
  return {
    fontFamily: s.monoFont,
    fontSize: 13,
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums' as const,
    color: s.text,
    textAlign: 'right' as const,
    whiteSpace: 'nowrap' as const,
  };
}

function dateCell(s: ReceiptStyle, date: string, fmtDate: (d: string) => string): React.CSSProperties {
  return {
    fontFamily: s.fontFamily,
    fontSize: 12,
    color: s.textSecondary,
    whiteSpace: 'nowrap' as const,
  };
}

function descCell(s: ReceiptStyle): React.CSSProperties {
  return {
    fontFamily: s.fontFamily,
    fontSize: 13,
    color: s.text,
  };
}

function statusPill(s: ReceiptStyle, repaid: boolean): React.CSSProperties {
  return {
    display: 'inline-block',
    fontFamily: s.monoFont,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    padding: '2px 8px',
    borderRadius: s.layout === 'swiss' ? '0px' : s.borderRadius,
    background: repaid ? (s.layout === 'swiss' ? s.accent : s.accentBg) : 'transparent',
    color: repaid ? (s.layout === 'swiss' ? '#ffffff' : s.accent) : s.textMuted,
    border: `1px solid ${repaid ? s.accent : s.divider}`,
  };
}

// ── Classic layout ──
function classicRow(
  s: ReceiptStyle,
  tx: FinanceTransaction,
  idx: number,
  all: FinanceTransaction[],
  fmtDate: (d: string) => string,
  fmtMoney: (v: number) => string,
) {
  const isRepaymentTx = tx.type === 'income' && (tx.on_behalf_of === 1 || (tx.tags && tx.tags.includes('ft_repaid:')));
  const repaid = isRepaid(tx, all);
  const rowBg = idx % 2 === 1 ? s.rowAlt : 'transparent';
  const cellPad = { padding: '10px 12px' };
  const grid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 80px 64px 80px',
    alignItems: 'center',
    background: rowBg,
    borderBottom: `1px solid ${s.divider}`,
  };
  return (
    <div key={tx.id} style={grid}>
      <div style={{ ...descCell(s), ...cellPad }}>
        {isRepaymentTx && <span style={{ color: '#10b981', marginRight: 4 }}>↩</span>}
        {tx.description || (isRepaymentTx ? 'Repayment' : tx.merchant || 'Transaction')}
      </div>
      <div style={{ ...dateCell(s, tx.date, fmtDate), ...cellPad }}>
        {fmtDate(tx.date)}
      </div>
      <div style={{ ...cellPad, textAlign: 'center' as const }}>
        {isRepaymentTx ? (
          <span style={{ ...statusPill(s, true), background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }}>Repaid</span>
        ) : (
          <span style={statusPill(s, repaid)}>{repaid ? 'Paid' : 'Pending'}</span>
        )}
      </div>
      <div style={{ ...amountStyle(s), ...cellPad, color: isRepaymentTx ? '#10b981' : s.text }}>
        {isRepaymentTx ? '+' : ''}{fmtMoney(tx.amount)}
      </div>
    </div>
  );
}

function classicTableHeader(s: ReceiptStyle) {
  const label: React.CSSProperties = {
    fontFamily: s.monoFont,
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: s.textMuted,
    padding: '8px 12px',
    borderBottom: `2px solid ${s.divider}`,
  };
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 80px 64px 80px',
        borderBottom: `2px solid ${s.divider}`,
      }}
    >
      <div style={label}>Description</div>
      <div style={label}>Date</div>
      <div style={{ ...label, textAlign: 'center' as const }}>Status</div>
      <div style={{ ...label, textAlign: 'right' as const }}>Amount</div>
    </div>
  );
}

function classicTotal(s: ReceiptStyle, total: number, fmtMoney: (v: number) => string, totalStyle: string) {
  if (totalStyle === 'line') {
    const line: React.CSSProperties = {
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 16,
      padding: '14px 24px',
      borderTop: `2px solid ${s.accent}`,
    };
    return (
      <div style={line}>
        <span style={{ fontFamily: s.headingFont, fontSize: 14, fontWeight: 700, color: s.text }}>Total</span>
        <span style={{ ...amountStyle(s), fontSize: 18, color: s.accent }}>{fmtMoney(total)}</span>
      </div>
    );
  }
  const bar: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    background: s.totalBg,
    color: '#ffffff',
  };
  return (
    <div style={bar}>
      <span style={{ fontFamily: s.headingFont, fontSize: 14, fontWeight: 700, color: '#ffffff' }}>Total</span>
      <span style={{ fontFamily: s.monoFont, fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums' as const, color: '#ffffff' }}>{fmtMoney(total)}</span>
    </div>
  );
}

// ── Minimal layout ──
function minimalRow(
  s: ReceiptStyle,
  tx: FinanceTransaction,
  idx: number,
  all: FinanceTransaction[],
  fmtDate: (d: string) => string,
  fmtMoney: (v: number) => string,
) {
  const isRepaymentTx = tx.type === 'income' && (tx.on_behalf_of === 1 || (tx.tags && tx.tags.includes('ft_repaid:')));
  const repaid = isRepaid(tx, all);
  const pad = { padding: '12px 24px' };
  return (
    <div key={tx.id} style={{ borderBottom: `1px solid ${s.divider}`, ...pad, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: s.fontFamily, fontSize: 13, color: s.text, marginBottom: 2 }}>
          {isRepaymentTx && <span style={{ color: '#10b981', marginRight: 4 }}>↩</span>}
          {tx.description || (isRepaymentTx ? 'Repayment' : tx.merchant || 'Transaction')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: s.fontFamily, fontSize: 11, color: s.textMuted }}>{fmtDate(tx.date)}</span>
          {isRepaymentTx ? (
            <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 10, border: '1px solid #86efac', color: '#15803d' }}>Repaid</span>
          ) : (
            <span style={statusPill(s, repaid)}>{repaid ? 'Paid' : 'Pending'}</span>
          )}
        </div>
      </div>
      <div style={{ ...amountStyle(s), flexShrink: 0, color: isRepaymentTx ? '#10b981' : s.text }}>
        {isRepaymentTx ? '+' : ''}{fmtMoney(tx.amount)}
      </div>
    </div>
  );
}

function minimalTotal(s: ReceiptStyle, total: number, fmtMoney: (v: number) => string, totalStyle: string) {
  if (totalStyle === 'line') {
    const line: React.CSSProperties = {
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 20,
      padding: '20px 24px',
      borderTop: `1px solid ${s.border}`,
    };
    return (
      <div style={line}>
        <span style={{ fontFamily: s.fontFamily, fontSize: 14, fontWeight: 300, color: s.textSecondary, letterSpacing: '0.02em' }}>Total</span>
        <span style={{ fontFamily: s.monoFont, fontSize: 20, fontWeight: 300, fontVariantNumeric: 'tabular-nums' as const, color: s.text }}>{fmtMoney(total)}</span>
      </div>
    );
  }
  const bar: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    background: s.totalBg,
    color: '#ffffff',
  };
  return (
    <div style={bar}>
      <span style={{ fontFamily: s.fontFamily, fontSize: 13, fontWeight: 500, color: '#ffffff' }}>Total</span>
      <span style={{ fontFamily: s.monoFont, fontSize: 18, fontWeight: 500, fontVariantNumeric: 'tabular-nums' as const, color: '#ffffff' }}>{fmtMoney(total)}</span>
    </div>
  );
}

// ── Bold layout ──
function boldRow(
  s: ReceiptStyle,
  tx: FinanceTransaction,
  idx: number,
  all: FinanceTransaction[],
  fmtDate: (d: string) => string,
  fmtMoney: (v: number) => string,
) {
  const repaid = isRepaid(tx, all);
  const rowBg = idx % 2 === 1 ? s.rowAlt : 'transparent';
  const numCircle: React.CSSProperties = {
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: s.accentBg,
    color: s.accent,
    fontFamily: s.monoFont,
    fontSize: 11,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };
  const grid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '32px 1fr 72px',
    alignItems: 'center',
    gap: 12,
    padding: '12px 24px',
    borderBottom: `2px solid ${s.border}`,
    background: rowBg,
  };
  return (
    <div key={tx.id} style={grid}>
      <div style={numCircle}>{String(idx + 1).padStart(2, '0')}</div>
      <div>
        <div style={{ fontFamily: s.fontFamily, fontSize: 13, fontWeight: 600, color: s.text, marginBottom: 2 }}>
          {(tx.type === 'income' && (tx.on_behalf_of === 1 || (tx.tags && tx.tags.includes('ft_repaid:')))) && <span style={{ color: '#10b981', marginRight: 4 }}>↩</span>}
          {tx.description || (tx.type === 'income' && (tx.on_behalf_of === 1 || (tx.tags && tx.tags.includes('ft_repaid:'))) ? 'Repayment' : tx.merchant || 'Transaction')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: s.fontFamily, fontSize: 11, color: s.textMuted }}>{fmtDate(tx.date)}</span>
          {(tx.type === 'income' && (tx.on_behalf_of === 1 || (tx.tags && tx.tags.includes('ft_repaid:')))) ? (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', background: '#dcfce7', color: '#166534', borderRadius: s.borderRadius }}>Repaid</span>
          ) : (
            <span style={statusPill(s, isRepaid(tx, all))}>{isRepaid(tx, all) ? 'Paid' : 'Pending'}</span>
          )}
        </div>
      </div>
      <div style={{ ...amountStyle(s), fontWeight: 700, fontSize: 14, color: (tx.type === 'income' && (tx.on_behalf_of === 1 || (tx.tags && tx.tags.includes('ft_repaid:')))) ? '#10b981' : s.text }}>
        {(tx.type === 'income' && (tx.on_behalf_of === 1 || (tx.tags && tx.tags.includes('ft_repaid:')))) ? '+' : ''}{fmtMoney(tx.amount)}
      </div>
    </div>
  );
}

function boldTotal(s: ReceiptStyle, total: number, fmtMoney: (v: number) => string, totalStyle: string) {
  if (totalStyle === 'banner') {
    const banner: React.CSSProperties = {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '18px 24px',
      background: s.totalBg,
      color: '#ffffff',
      borderRadius: `0 0 ${s.borderRadius} ${s.borderRadius}`,
    };
    return (
      <div style={banner}>
        <span style={{ fontFamily: s.headingFont, fontSize: 16, fontWeight: 800, color: '#ffffff', letterSpacing: '0.02em' }}>TOTAL</span>
        <span style={{ fontFamily: s.monoFont, fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums' as const, color: '#ffffff' }}>{fmtMoney(total)}</span>
      </div>
    );
  }
  const bar: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    background: s.totalBg,
    color: '#ffffff',
  };
  return (
    <div style={bar}>
      <span style={{ fontFamily: s.headingFont, fontSize: 14, fontWeight: 700, color: '#ffffff' }}>Total</span>
      <span style={{ fontFamily: s.monoFont, fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums' as const, color: '#ffffff' }}>{fmtMoney(total)}</span>
    </div>
  );
}

// ── Glass layout ──
function glassRow(
  s: ReceiptStyle,
  tx: FinanceTransaction,
  idx: number,
  all: FinanceTransaction[],
  fmtDate: (d: string) => string,
  fmtMoney: (v: number) => string,
) {
  const repaid = isRepaid(tx, all);
  const dot: React.CSSProperties = {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: repaid ? '#22c55e' : s.textMuted,
    boxShadow: repaid ? '0 0 6px rgba(34,197,94,0.5)' : 'none',
    flexShrink: 0,
  };
  const row: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 24px',
    borderBottom: `1px solid ${s.divider}`,
    background: idx % 2 === 1 ? s.rowAlt : 'transparent',
  };
  return (
    <div key={tx.id} style={row}>
      <div style={{ ...dot, background: (tx.type === 'income' && (tx.on_behalf_of === 1 || (tx.tags && tx.tags.includes('ft_repaid:')))) ? '#10b981' : repaid ? '#22c55e' : s.textMuted, boxShadow: (tx.type === 'income' && (tx.on_behalf_of === 1 || (tx.tags && tx.tags.includes('ft_repaid:')))) ? '0 0 6px rgba(16,185,129,0.5)' : repaid ? '0 0 6px rgba(34,197,94,0.5)' : 'none' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: s.fontFamily, fontSize: 13, color: s.text, marginBottom: 2 }}>
          {(tx.type === 'income' && (tx.on_behalf_of === 1 || (tx.tags && tx.tags.includes('ft_repaid:')))) && <span style={{ color: '#10b981', marginRight: 4 }}>↩</span>}
          {tx.description || (tx.type === 'income' && (tx.on_behalf_of === 1 || (tx.tags && tx.tags.includes('ft_repaid:'))) ? 'Repayment' : tx.merchant || 'Transaction')}
        </div>
        <div style={{ fontFamily: s.fontFamily, fontSize: 11, color: s.textMuted }}>{fmtDate(tx.date)}</div>
      </div>
      <div style={{ ...amountStyle(s), color: (tx.type === 'income' && (tx.on_behalf_of === 1 || (tx.tags && tx.tags.includes('ft_repaid:')))) ? '#10b981' : s.text }}>
        {(tx.type === 'income' && (tx.on_behalf_of === 1 || (tx.tags && tx.tags.includes('ft_repaid:')))) ? '+' : ''}{fmtMoney(tx.amount)}
      </div>
    </div>
  );
}

function glassTotal(s: ReceiptStyle, total: number, fmtMoney: (v: number) => string, totalStyle: string) {
  if (totalStyle === 'pill') {
    const pill: React.CSSProperties = {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      margin: '16px 24px',
      padding: '14px 20px',
      background: s.totalBg,
      border: `1px solid ${s.totalBorder}`,
      borderRadius: '100px',
    };
    return (
      <div style={pill}>
        <span style={{ fontFamily: s.fontFamily, fontSize: 13, fontWeight: 600, color: s.accent }}>Total</span>
        <span style={{ fontFamily: s.monoFont, fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' as const, color: s.accent }}>{fmtMoney(total)}</span>
      </div>
    );
  }
  const bar: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    background: s.totalBg,
    border: `1px solid ${s.totalBorder}`,
  };
  return (
    <div style={bar}>
      <span style={{ fontFamily: s.fontFamily, fontSize: 13, fontWeight: 600, color: s.accent }}>Total</span>
      <span style={{ fontFamily: s.monoFont, fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums' as const, color: s.accent }}>{fmtMoney(total)}</span>
    </div>
  );
}

// ── Swiss layout ──
function swissRow(
  s: ReceiptStyle,
  tx: FinanceTransaction,
  idx: number,
  all: FinanceTransaction[],
  fmtDate: (d: string) => string,
  fmtMoney: (v: number) => string,
) {
  const repaid = isRepaid(tx, all);
  const rowBg = idx % 2 === 1 ? s.rowAlt : 'transparent';
  const grid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '40px 1fr 72px',
    alignItems: 'center',
    gap: 0,
    borderBottom: `1px solid ${s.border}`,
    background: rowBg,
  };
  const num: React.CSSProperties = {
    fontFamily: s.monoFont,
    fontSize: 12,
    fontWeight: 700,
    color: s.textMuted,
    padding: '10px 8px 10px 24px',
    borderRight: `1px solid ${s.border}`,
  };
  const cell: React.CSSProperties = {
    padding: '10px 12px',
  };
  return (
    <div key={tx.id} style={grid}>
      <div style={num}>{String(idx + 1).padStart(2, '0')}</div>
      <div style={{ ...cell, display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
        <span style={{ fontFamily: s.fontFamily, fontSize: 13, color: s.text, fontWeight: 500 }}>
          {(tx.type === 'income' && (tx.on_behalf_of === 1 || (tx.tags && tx.tags.includes('ft_repaid:')))) && <span style={{ color: '#10b981', marginRight: 4 }}>↩</span>}
          {tx.description || (tx.type === 'income' && (tx.on_behalf_of === 1 || (tx.tags && tx.tags.includes('ft_repaid:'))) ? 'Repayment' : tx.merchant || 'Transaction')}
        </span>
        <span style={{ fontFamily: s.fontFamily, fontSize: 11, color: s.textMuted }}>
          {fmtDate(tx.date)}
        </span>
      </div>
      <div style={{ padding: '10px 24px 10px 12px', display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 4 }}>
        <span style={{ ...amountStyle(s), color: (tx.type === 'income' && (tx.on_behalf_of === 1 || (tx.tags && tx.tags.includes('ft_repaid:')))) ? '#10b981' : s.text }}>
          {(tx.type === 'income' && (tx.on_behalf_of === 1 || (tx.tags && tx.tags.includes('ft_repaid:')))) ? '+' : ''}{fmtMoney(tx.amount)}
        </span>
        {(tx.type === 'income' && (tx.on_behalf_of === 1 || (tx.tags && tx.tags.includes('ft_repaid:')))) ? (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', background: '#dcfce7', color: '#166534', border: `1px solid ${s.border}` }}>REPAID</span>
        ) : (
          <span style={statusPill(s, repaid)}>{repaid ? 'PAID' : 'PENDING'}</span>
        )}
      </div>
    </div>
  );
}

function swissTotal(s: ReceiptStyle, total: number, fmtMoney: (v: number) => string) {
  const bar: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 24px',
    background: s.totalBg,
    borderTop: `2px solid ${s.border}`,
  };
  return (
    <div style={bar}>
      <span style={{ fontFamily: s.headingFont, fontSize: 14, fontWeight: 700, color: '#ffffff', letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>Total</span>
      <span style={{ fontFamily: s.monoFont, fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums' as const, color: '#ffffff' }}>{fmtMoney(total)}</span>
    </div>
  );
}

// ── Header row for classic/swiss table layouts ──
function classicHeaderRow(s: ReceiptStyle) {
  const label: React.CSSProperties = {
    fontFamily: s.monoFont,
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: s.textMuted,
    padding: '8px 12px',
  };
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: s.layout === 'swiss' ? '40px 1fr 72px' : '1fr 80px 64px 80px',
        borderBottom: `2px solid ${s.divider}`,
      }}
    >
      {s.layout === 'swiss' ? (
        <>
          <div style={{ ...label, padding: '8px 8px 8px 24px', borderRight: `1px solid ${s.border}` }}>#</div>
          <div style={label}>Description</div>
          <div style={{ ...label, textAlign: 'right' as const, padding: '8px 24px 8px 12px' }}>Amount</div>
        </>
      ) : (
        <>
          <div style={label}>Description</div>
          <div style={label}>Date</div>
          <div style={{ ...label, textAlign: 'center' as const }}>Status</div>
          <div style={{ ...label, textAlign: 'right' as const }}>Amount</div>
        </>
      )}
    </div>
  );
}

function noteBlock(s: ReceiptStyle, note: string) {
  if (!note) return null;
  return (
    <div
      style={{
        padding: '12px 24px',
        borderTop: s.showDividerLine ? `1px solid ${s.divider}` : 'none',
      }}
    >
      <div
        style={{
          fontFamily: s.monoFont,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
          color: s.textMuted,
          marginBottom: 4,
        }}
      >
        Note
      </div>
      <div style={{ fontFamily: s.fontFamily, fontSize: 12, color: s.textSecondary, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
        {note}
      </div>
    </div>
  );
}

function footerBlock(s: ReceiptStyle, date: string) {
  return (
    <div
      style={{
        padding: '12px 24px',
        borderTop: s.showDividerLine ? `1px solid ${s.divider}` : 'none',
        textAlign: 'center' as const,
      }}
    >
      <span style={{ fontFamily: s.fontFamily, fontSize: 10, color: s.textMuted }}>
        Generated by DeskFlow · {date}
      </span>
    </div>
  );
}

function emptyState(s: ReceiptStyle) {
  return (
    <div
      style={{
        padding: '48px 24px',
        textAlign: 'center' as const,
      }}
    >
      <div style={{ fontFamily: s.fontFamily, fontSize: 14, color: s.textMuted }}>
        No transactions selected
      </div>
    </div>
  );
}

// ── ReceiptPreview component ──
export const ReceiptPreview = forwardRef<HTMLDivElement, ReceiptPreviewProps>(
  function ReceiptPreview(
    { style: s, person, txs, total, displayCurrency, title, note, fmtDate, fmtMoney, allTransactions, repaymentTotal = 0 },
    ref,
  ) {
    const now = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const outerBg: React.CSSProperties = {
      width: W,
      background: s.bg,
      color: s.text,
      fontFamily: s.fontFamily,
      borderRadius: s.borderRadius,
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)',
    };

    const renderTxList = () => {
      if (txs.length === 0) return emptyState(s);

      const showTable = s.layout === 'classic' || s.layout === 'swiss';

      if (showTable) {
        return (
          <div>
            {classicHeaderRow(s)}
            <div>
              {txs.map((tx, i) =>
                s.layout === 'swiss'
                  ? swissRow(s, tx, i, allTransactions, fmtDate, fmtMoney)
                  : classicRow(s, tx, i, allTransactions, fmtDate, fmtMoney),
              )}
            </div>
          </div>
        );
      }

      return (
        <div>
          {txs.map((tx, i) =>
            s.layout === 'minimal'
              ? minimalRow(s, tx, i, allTransactions, fmtDate, fmtMoney)
              : s.layout === 'bold'
              ? boldRow(s, tx, i, allTransactions, fmtDate, fmtMoney)
              : glassRow(s, tx, i, allTransactions, fmtDate, fmtMoney),
          )}
        </div>
      );
    };

    const renderSummary = () => {
      if (txs.length === 0 || repaymentTotal <= 0) return null;
      const balance = total - repaymentTotal;
      const summaryBg = s.layout === 'glass' ? 'rgba(255,255,255,0.03)' : s.accentBg;
      return (
        <div style={{ padding: '12px 24px', background: summaryBg, borderBottom: `1px solid ${s.divider}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontFamily: s.fontFamily, fontSize: 11, color: s.textSecondary }}>Total Owed</span>
            <span style={{ fontFamily: s.monoFont, fontSize: 11, fontWeight: 600, color: s.text }}>{fmtMoney(total)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontFamily: s.fontFamily, fontSize: 11, color: '#10b981' }}>Already Paid</span>
            <span style={{ fontFamily: s.monoFont, fontSize: 11, fontWeight: 600, color: '#10b981' }}>-{fmtMoney(repaymentTotal)}</span>
          </div>
          <div style={{ height: 1, background: s.divider, margin: '6px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: s.headingFont, fontSize: 12, fontWeight: 700, color: s.text }}>Balance Remaining</span>
            <span style={{ fontFamily: s.monoFont, fontSize: 14, fontWeight: 700, color: balance > 0 ? '#f59e0b' : '#10b981', fontVariantNumeric: 'tabular-nums' as const }}>{fmtMoney(Math.max(0, balance))}</span>
          </div>
        </div>
      );
    };

    const renderTotal = () => {
      if (txs.length === 0) return null;

      switch (s.layout) {
        case 'classic':
          return classicTotal(s, total, fmtMoney, s.totalStyle);
        case 'minimal':
          return minimalTotal(s, total, fmtMoney, s.totalStyle);
        case 'bold':
          return boldTotal(s, total, fmtMoney, s.totalStyle);
        case 'glass':
          return glassTotal(s, total, fmtMoney, s.totalStyle);
        case 'swiss':
          return swissTotal(s, total, fmtMoney);
        default:
          return classicTotal(s, total, fmtMoney, s.totalStyle);
      }
    };

    return (
      <div ref={ref} style={outerBg}>
        {headerBlock(s, title, now)}
        {personBlock(s, person)}
        <div>{renderTxList()}</div>
        {renderSummary()}
        {renderTotal()}
        {noteBlock(s, note)}
        {footerBlock(s, now)}
      </div>
    );
  },
);
