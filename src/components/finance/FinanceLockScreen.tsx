import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock as LockIcon, Key, Shield, Fingerprint, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface FinanceLockScreenProps {
  onUnlock: (password: string) => Promise<boolean>;
  onSetup: (password: string) => Promise<boolean>;
  onBiometricUnlock?: () => Promise<boolean>;
  isFirstTime: boolean;
  error: string | null;
}

function arrayBufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToArrayBuffer(str: string): ArrayBuffer {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

const shakeVariants = {
  shake: {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: { duration: 0.4 },
  },
};

export function FinanceLockScreen({ onUnlock, onSetup, onBiometricUnlock, isFirstTime, error }: FinanceLockScreenProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number>(3);
  const [cooldownTime, setCooldownTime] = useState<number>(0);
  const [shake, setShake] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (cooldownTime > 0) {
      cooldownIntervalRef.current = setInterval(() => {
        setCooldownTime(prev => {
          if (prev <= 1) {
            clearInterval(cooldownIntervalRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, [cooldownTime]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'PublicKeyCredential' in window) {
      setBiometricSupported(true);
    }
  }, []);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleBiometricClick = async () => {
    if (biometricBusy || !onBiometricUnlock) return;
    setBiometricBusy(true);
    setBiometricError(null);
    try {
      const { credentialId: storedId } = await window.deskflowAPI.financeGetWebAuthnCredential();
      const rpId = window.location.hostname;
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      if (storedId) {
        const credential = await navigator.credentials.get({
          publicKey: {
            challenge,
            rpId,
            allowCredentials: [{
              id: base64UrlToArrayBuffer(storedId),
              type: 'public-key',
            }],
            userVerification: 'required',
            timeout: 30000,
          },
        });
        if (credential) {
          const ok = await onBiometricUnlock();
          if (!ok) setBiometricError('Biometric unlock failed');
        }
      } else {
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { id: rpId, name: 'App Tracker' },
            user: {
              id: crypto.getRandomValues(new Uint8Array(16)),
              name: 'finance',
              displayName: 'Finance Access',
            },
            pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'required',
            },
            timeout: 30000,
          },
        });
        if (credential) {
          const credentialId = credential.rawId || (credential.id instanceof ArrayBuffer ? credential.id : new Uint8Array(0).buffer);
          const id = arrayBufferToBase64Url(credentialId instanceof ArrayBuffer ? credentialId : (credentialId as unknown as ArrayBuffer));
          await window.deskflowAPI.financeStoreWebAuthnCredential(id);
          const ok = await onBiometricUnlock();
          if (!ok) setBiometricError('Biometric unlock failed');
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'NotAllowedError') return;
      setBiometricError(err instanceof Error ? err.message : 'Biometric authentication failed');
    } finally {
      setBiometricBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (!password || cooldownTime > 0) return;
    setSubmitting(true);
    try {
      if (isFirstTime) {
        if (password.length < 4) {
          setSetupError('Password must be at least 4 characters');
          triggerShake();
          setSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          setSetupError('Passwords do not match');
          triggerShake();
          setSubmitting(false);
          return;
        }
        const ok = await onSetup(password);
        if (!ok) { setSetupError('Failed to set password'); triggerShake(); }
      } else {
        const ok = await onUnlock(password);
        if (!ok) {
          setSetupError('Incorrect password');
          const newAttempts = Math.max(0, attemptsLeft - 1);
          setAttemptsLeft(newAttempts);
          if (newAttempts <= 0) setCooldownTime(30);
          triggerShake();
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = error || setupError;

  return (
    <div className="flex-1 flex items-center justify-center p-5 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.03] via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-emerald-500/[0.02] blur-3xl pointer-events-none" />

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={shake ? 'shake' : { scale: 1, opacity: 1, filter: 'blur(0px)' }}
        variants={shakeVariants}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm relative"
      >
        <motion.div
          initial={false}
          animate={shake ? { scale: 0.97, filter: 'blur(1px)' } : { scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-xl p-8 flex flex-col items-center text-center bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50"
        >
          <div className="w-16 h-16 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-6">
            <Shield className="w-8 h-8 text-emerald-400" />
          </div>

          <h2 className="text-lg font-semibold text-white mb-1">
            {isFirstTime ? 'Secure Your Finance Page' : 'Finance is Locked'}
          </h2>
          <p className="text-sm text-zinc-400 mb-6">
            {isFirstTime
              ? (biometricSupported ? 'Use Windows Hello or a password to protect your data' : 'Set a master password to protect your financial data')
              : 'Unlock to access your finances'}
          </p>

          <div className="w-full space-y-3">
            {biometricSupported && (
              <>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBiometricClick}
                  disabled={biometricBusy}
                  className="relative flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-emerald-500/25"
                >
                  {biometricBusy ? (
                    <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                  ) : (
                    <Fingerprint className="w-5 h-5" />
                  )}
                  {biometricBusy ? 'Authenticating...' : (isFirstTime ? 'Set up with Windows Hello' : 'Use Windows Hello')}
                </motion.button>
                {isFirstTime && !showPasswordForm && (
                  <button
                    onClick={() => setShowPasswordForm(true)}
                    className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Or set a password instead
                  </button>
                )}
              </>
            )}

            {(!biometricSupported || showPasswordForm || !isFirstTime) && (
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setSetupError(null); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="Password"
                    autoFocus={!biometricSupported}
                    disabled={cooldownTime > 0}
                    className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-4 py-2.5 pr-10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950 rounded-md"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {isFirstTime && (
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="Confirm password"
                    className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors"
                  />
                )}

                {displayError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-xs text-red-400 text-left"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {isFirstTime
                        ? displayError
                        : attemptsLeft > 0
                          ? `Incorrect password \u2014 ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} left`
                          : `Too many attempts. Try again in ${cooldownTime}s`
                      }
                    </span>
                  </motion.div>
                )}

                {cooldownTime > 0 && (
                  <div className="w-full bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-red-400">
                    <div className="flex items-center justify-between mb-1">
                      <span>Rate limit activated</span>
                      <span>{cooldownTime}s remaining</span>
                    </div>
                    <div className="w-full bg-zinc-700/50 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-red-500 h-full transition-all duration-1000 ease-linear"
                        style={{ width: `${(cooldownTime / 30) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <motion.button
                  whileTap={{ scale: submitting ? 1 : 0.98 }}
                  onClick={handleSubmit}
                  disabled={submitting || !password || cooldownTime > 0}
                  className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      {isFirstTime ? 'Set Password' : 'Unlock'}
                    </>
                  )}
                </motion.button>

                {isFirstTime && biometricSupported && (
                  <button
                    onClick={() => setShowPasswordForm(false)}
                    className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Use Windows Hello instead
                  </button>
                )}
              </div>
            )}

            {biometricError && (
              <div className="flex items-center gap-2 text-xs text-red-400 text-left">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{biometricError}</span>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
