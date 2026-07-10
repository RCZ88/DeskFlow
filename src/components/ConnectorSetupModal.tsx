import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Calendar, Loader2, Check, AlertCircle, ArrowRight, Server, User, Lock, Shield, Info, ExternalLink } from 'lucide-react';

interface ConnectorSetupModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

type Step = 'type' | 'provider' | 'credentials' | 'testing' | 'done';
type ConnectorType = 'email' | 'calendar';

const PROVIDER_DEFAULTS: Record<string, { hosts: { label: string; host: string; port: number }[] }> = {
  email: {
    hosts: [
      { label: 'Gmail', host: 'imap.gmail.com', port: 993 },
      { label: 'Outlook / Microsoft 365', host: 'outlook.office365.com', port: 993 },
      { label: 'Yahoo Mail', host: 'imap.mail.yahoo.com', port: 993 },
      { label: 'Custom IMAP', host: '', port: 993 },
    ],
  },
  calendar: {
    hosts: [
      { label: 'Google Calendar (CalDAV)', url: 'https://apidata.googleusercontent.com/caldav/v2/', host: '', port: 443 },
      { label: 'Outlook Calendar (CalDAV)', url: 'https://outlook.office365.com/dav/', host: '', port: 443 },
      { label: 'Nextcloud / Owncloud', url: '', host: '', port: 443 },
      { label: 'Custom CalDAV', url: '', host: '', port: 443 },
    ],
  },
};

const PROVIDER_INFO: Record<string, { securityNote: string; setupGuide: string; appPasswordUrl?: string }> = {
  'Gmail': {
    securityNote: 'Google blocks regular passwords for third-party apps. An App Password is a one-time-use credential you can revoke anytime.',
    setupGuide: 'Go to myaccount.google.com → Security → 2-Step Verification → App passwords → Generate one for "Mail"',
    appPasswordUrl: 'https://myaccount.google.com/apppasswords',
  },
  'Outlook / Microsoft 365': {
    securityNote: 'Microsoft may require you to enable "Less secure app access" or generate an app password.',
    setupGuide: 'Settings → Mail → Sync email → Generate an app password, or enable IMAP in your account settings.',
  },
  'Yahoo Mail': {
    securityNote: 'Yahoo requires an app-specific password for third-party email clients.',
    setupGuide: 'Account Security → Generate app password → Select "Mail" → Copy the generated password.',
  },
  'Google Calendar (CalDAV)': {
    securityNote: 'CalDAV uses your Google account credentials. We recommend an App Password for enhanced security.',
    setupGuide: 'Same as Gmail — generate an App Password at myaccount.google.com/apppasswords',
    appPasswordUrl: 'https://myaccount.google.com/apppasswords',
  },
};

export function ConnectorSetupModal({ open, onClose, onCreated }: ConnectorSetupModalProps) {
  const [step, setStep] = useState<Step>('type');
  const [connectorType, setConnectorType] = useState<ConnectorType | null>(null);
  const [providerIdx, setProviderIdx] = useState<number | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('993');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [caldavUrl, setCalDavUrl] = useState('');
  const [tls, setTls] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep('type'); setConnectorType(null); setProviderIdx(null);
    setDisplayName(''); setHost(''); setPort('993'); setUsername(''); setPassword('');
    setCalDavUrl(''); setTls(true); setTesting(false); setTestResult(null); setError(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const selectType = (type: ConnectorType) => {
    setConnectorType(type);
    setStep('provider');
  };

  const selectProvider = (idx: number) => {
    setProviderIdx(idx);
    const defaults = PROVIDER_DEFAULTS[connectorType!].hosts[idx];
    if (defaults.host) setHost(defaults.host);
    if ('port' in defaults) setPort(String(defaults.port));
    if ('url' in defaults && defaults.url) setCalDavUrl(defaults.url);
    setDisplayName(defaults.label);
    setStep('credentials');
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const config = connectorType === 'email'
        ? { host, port: Number(port), username, password, tls }
        : { url: caldavUrl, username, password };
      const addR = await window.deskflowAPI!.connectors.add({
        type: connectorType!, provider: connectorType === 'email' ? 'imap' : 'caldav',
        displayName, config,
      });
      if (!addR.success || !addR.connector) { setError(addR.error || 'Failed to add'); setTesting(false); return; }
      const testR = await window.deskflowAPI!.connectors.test(addR.connector.id);
      setTestResult(testR);
      if (testR.success) {
        await window.deskflowAPI!.connectors.sync(addR.connector.id);
        setStep('done');
        onCreated?.();
      } else {
        await window.deskflowAPI!.connectors.remove(addR.connector.id);
      }
    } catch (err: any) {
      setError(err.message);
    }
    setTesting(false);
  };

  const currentProvider = providerIdx !== null ? PROVIDER_DEFAULTS[connectorType!].hosts[providerIdx] : null;
  const providerName = currentProvider?.label || '';
  const providerInfo = PROVIDER_INFO[providerName];

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md rounded-xl bg-zinc-900 ring-1 ring-zinc-800 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Connect a Service</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {step === 'type' && 'Choose what to connect'}
                  {step === 'provider' && 'Select your provider'}
                  {step === 'credentials' && 'Enter your credentials securely'}
                  {step === 'testing' && 'Testing connection...'}
                  {step === 'done' && 'Connected successfully!'}
                </p>
              </div>
              <button onClick={handleClose} className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Security Badge */}
            <div className="px-5 py-2 flex items-center gap-2 bg-emerald-500/5 border-b border-zinc-800">
              <Shield size={14} className="text-emerald-400" />
              <span className="text-[11px] text-emerald-300/80">
                Your credentials are encrypted and stored locally — never sent to DeskFlow
              </span>
            </div>

            {/* Progress */}
            <div className="px-5 py-3 flex items-center gap-2">
              {['type', 'provider', 'credentials', 'done'].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`h-1.5 w-6 rounded-full transition-colors ${
                    ['type', 'provider', 'credentials', 'done'].indexOf(step) >= i ? 'bg-pink-500' : 'bg-zinc-800'
                  }`} />
                </div>
              ))}
            </div>

            {/* Content */}
            <div className="px-5 pb-5">
              <AnimatePresence mode="wait">
                {step === 'type' && (
                  <motion.div key="type" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                    <p className="text-xs text-zinc-500 mb-4">
                      Connectors let DeskFlow read your email and calendar to power smarter planning.
                      Your data stays on your device — we never see your messages or events.
                    </p>
                    <button onClick={() => selectType('email')} className="w-full flex items-center gap-3 p-4 rounded-lg bg-zinc-800/40 ring-1 ring-zinc-700/30 hover:bg-zinc-800/60 hover:ring-zinc-600/50 transition-all text-left">
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-pink-500/10 ring-1 ring-pink-500/20">
                        <Mail className="h-5 w-5 text-pink-400" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-zinc-100 block">Email</span>
                        <span className="text-xs text-zinc-500">IMAP — Gmail, Outlook, Yahoo, any provider</span>
                      </div>
                      <ArrowRight className="ml-auto h-4 w-4 text-zinc-600" />
                    </button>
                    <button onClick={() => selectType('calendar')} className="w-full flex items-center gap-3 p-4 rounded-lg bg-zinc-800/40 ring-1 ring-zinc-700/30 hover:bg-zinc-800/60 hover:ring-zinc-600/50 transition-all text-left">
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/20">
                        <Calendar className="h-5 w-5 text-cyan-400" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-zinc-100 block">Calendar</span>
                        <span className="text-xs text-zinc-500">CalDAV — Google, Outlook, Nextcloud</span>
                      </div>
                      <ArrowRight className="ml-auto h-4 w-4 text-zinc-600" />
                    </button>
                  </motion.div>
                )}

                {step === 'provider' && connectorType && (
                  <motion.div key="provider" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-2">
                    {PROVIDER_DEFAULTS[connectorType].hosts.map((p, i) => (
                      <button key={i} onClick={() => selectProvider(i)} className="w-full flex items-center gap-3 p-3 rounded-lg bg-zinc-800/40 ring-1 ring-zinc-700/30 hover:bg-zinc-800/60 hover:ring-zinc-600/50 transition-all text-left">
                        <Server className="h-4 w-4 text-zinc-500" />
                        <span className="text-sm text-zinc-200">{p.label}</span>
                        <ArrowRight className="ml-auto h-4 w-4 text-zinc-600" />
                      </button>
                    ))}
                    <button onClick={() => setStep('type')} className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors pt-2">
                      ← Back
                    </button>
                  </motion.div>
                )}

                {step === 'credentials' && (
                  <motion.div key="creds" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                    {/* Provider-Specific Guidance */}
                    {providerInfo && (
                      <div className="rounded-lg bg-zinc-800/30 px-3 py-3 ring-1 ring-zinc-700/30 space-y-2">
                        <div className="flex items-start gap-2">
                          <Info size={14} className="text-cyan-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[12px] font-medium text-zinc-300 mb-1">How to connect {providerName}</p>
                            <p className="text-[11px] text-zinc-500 leading-relaxed">{providerInfo.setupGuide}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Shield size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                          <p className="text-[11px] text-zinc-500 leading-relaxed">{providerInfo.securityNote}</p>
                        </div>
                        {providerInfo.appPasswordUrl && (
                          <a
                            href={providerInfo.appPasswordUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
                          >
                            Open {providerName} App Passwords page
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Display Name</label>
                      <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full rounded-lg bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-700/50 focus:outline-none focus:ring-2 focus:ring-pink-500/50 placeholder:text-zinc-600" placeholder="My Email" />
                    </div>
                    {connectorType === 'email' && (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <label className="text-xs text-zinc-500 mb-1 block">IMAP Host</label>
                            <input value={host} onChange={(e) => setHost(e.target.value)} className="w-full rounded-lg bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 font-mono ring-1 ring-zinc-700/50 focus:outline-none focus:ring-2 focus:ring-pink-500/50 placeholder:text-zinc-600" placeholder="imap.gmail.com" />
                          </div>
                          <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Port</label>
                            <input value={port} onChange={(e) => setPort(e.target.value)} className="w-full rounded-lg bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 font-mono ring-1 ring-zinc-700/50 focus:outline-none focus:ring-2 focus:ring-pink-500/50" placeholder="993" />
                          </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={tls} onChange={(e) => setTls(e.target.checked)} className="rounded border-zinc-600 bg-zinc-800 text-pink-500 focus:ring-pink-500/50" />
                          <span className="text-xs text-zinc-400">Use TLS/SSL (recommended)</span>
                        </label>
                      </>
                    )}
                    {connectorType === 'calendar' && (
                      <div>
                        <label className="text-xs text-zinc-500 mb-1 block">CalDAV URL</label>
                        <input value={caldavUrl} onChange={(e) => setCalDavUrl(e.target.value)} className="w-full rounded-lg bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 font-mono ring-1 ring-zinc-700/50 focus:outline-none focus:ring-2 focus:ring-pink-500/50 placeholder:text-zinc-600" placeholder="https://apidata.googleusercontent.com/caldav/v2/" />
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Username / Email</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
                        <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-lg bg-zinc-800/60 pl-9 pr-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-700/50 focus:outline-none focus:ring-2 focus:ring-pink-500/50 placeholder:text-zinc-600" placeholder="you@gmail.com" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">
                        {connectorType === 'email' ? 'App Password' : 'Password'}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg bg-zinc-800/60 pl-9 pr-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-700/50 focus:outline-none focus:ring-2 focus:ring-pink-500/50 placeholder:text-zinc-600" placeholder="xxxx-xxxx-xxxx-xxxx" />
                      </div>
                      <p className="text-[10px] text-zinc-600 mt-1">
                        {connectorType === 'email'
                          ? 'For Gmail: use an App Password, not your regular password (see guide above)'
                          : 'Enter your account password or app password'}
                      </p>
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 ring-1 ring-red-500/20 text-xs text-red-300">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {error}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button onClick={() => setStep('provider')} className="px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">← Back</button>
                      <button
                        onClick={handleTest}
                        disabled={!username || !password || testing}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-pink-500/10 text-pink-300 ring-1 ring-pink-500/20 hover:bg-pink-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {testing ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Testing...</>
                        ) : testResult?.success ? (
                          <><Check className="h-4 w-4" /> Connected</>
                        ) : (
                          'Test & Connect'
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 'done' && (
                  <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
                    <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
                      <Check className="h-6 w-6 text-emerald-400" />
                    </div>
                    <p className="text-sm font-medium text-zinc-100">{displayName} connected!</p>
                    <p className="text-xs text-zinc-500 mt-1">Data will sync automatically in the background</p>
                    <div className="mt-4 rounded-lg bg-zinc-800/30 px-4 py-3 text-left">
                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        <span className="font-medium text-zinc-400">What happens next:</span> DeskFlow will periodically
                        sync your {connectorType === 'email' ? 'emails' : 'calendar events'} to provide context
                        for your daily planning. You can disconnect anytime from the Connectors panel.
                      </p>
                    </div>
                    <button onClick={handleClose} className="mt-4 rounded-lg px-6 py-2 text-sm font-medium bg-zinc-800 text-zinc-300 ring-1 ring-zinc-700 hover:bg-zinc-700 transition-colors">
                      Done
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
