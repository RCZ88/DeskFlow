import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Key, Shield, Fingerprint, Eye, EyeOff, AlertCircle } from 'lucide-react';

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

export function FinanceLockScreen({ onUnlock, onSetup, onBiometricUnlock, isFirstTime, error }: FinanceLockScreenProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number>(3);
  const [cooldownTime, setCooldownTime] = useState<number>(0);
  const [isBlurred, setIsBlurred] = useState<boolean>(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);
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
          const id = arrayBufferToBase64Url(credential.id instanceof ArrayBuffer ? credential.id : (credential as any).rawId);
          await window.deskflowAPI.financeStoreWebAuthnCredential(id);
          const ok = await onBiometricUnlock();
          if (!ok) setBiometricError('Biometric unlock failed');
        }
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') return;
      setBiometricError(err.message || 'Biometric authentication failed');
    } finally {
      setBiometricBusy(false);
    }
  };

  useEffect(() => {
    if (!isFirstTime && attemptsLeft < 3) {
      setIsBlurred(true);
      const timeout = setTimeout(() => setIsBlurred(false), 250);
      return () => clearTimeout(timeout);
    }
  }, [attemptsLeft, isFirstTime]);

  const handleSubmit = async () => {
    if (!password || cooldownTime > 0) return;
    setSubmitting(true);
    try {
      if (isFirstTime) {
        if (password.length < 4) {
          setSetupError('Password must be at least 4 characters');
          setSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          setSetupError('Passwords do not match');
          setSubmitting(false);
          return;
        }
        const ok = await onSetup(password);
        if (!ok) setSetupError('Failed to set password');
      } else {
        const ok = await onUnlock(password);
        if (!ok) {
          setSetupError('Incorrect password');
          setAttemptsLeft(prev => Math.max(0, prev - 1));
          setCooldownTime(30);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = error || setupError;

  return (
    <div className="flex-1 flex items-center justify-center p-5">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <div
          className={`glass rounded-xl p-8 flex flex-col items-center text-center transition-all duration-500 ${isBlurred ? 'backdrop-blur-sm scale-95 opacity-80' : ''}`}
          style={{
            filter: isBlurred ? 'blur(4px)' : 'none',
            transition: 'filter 250ms ease, backdrop-blur 250ms ease, transform 250ms ease, opacity 250ms ease'
          }}
        >
          <div className="w-14 h-14 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-5">
            <Shield className="w-7 h-7 text-emerald-400" />
          </div>

          <h2 className="text-lg font-semibold text-white mb-1">
            {isFirstTime ? 'Secure Your Finance Page' : 'Finance is Locked'}
          </h2>
          <p className="text-sm text-zinc-400 mb-6">
            {isFirstTime
              ? 'Set a master password to protect your financial data'
              : 'Enter your password to access your finances'}
          </p>

          <div className="w-full space-y-3">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setSetupError(null); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Password"
                autoFocus
                disabled={cooldownTime > 0}
                className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-4 py-2.5 pr-10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
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
              <div className="flex items-center gap-2 text-xs text-red-400 text-left">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isFirstTime
                    ? displayError
                    : attemptsLeft > 0
                      ? `Incorrect password — ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} left`
                      : `Too many attempts. Try again in ${cooldownTime}s`
                  }
                </span>
              </div>
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
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={submitting || !password || cooldownTime > 0}
              className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

            {!isFirstTime && biometricSupported && (
              <button
                onClick={handleBiometricClick}
                disabled={biometricBusy}
                className="flex items-center justify-center gap-2 w-full py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {biometricBusy ? (
                  <div className="w-4 h-4 border-2 border-zinc-400/30 border-t-zinc-400 rounded-full animate-spin" />
                ) : (
                  <Fingerprint className="w-4 h-4" />
                )}
                {biometricBusy ? 'Authenticating...' : 'Use Windows Hello'}
              </button>
            )}
            {biometricError && (
              <div className="flex items-center gap-2 text-xs text-red-400 text-left">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{biometricError}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
