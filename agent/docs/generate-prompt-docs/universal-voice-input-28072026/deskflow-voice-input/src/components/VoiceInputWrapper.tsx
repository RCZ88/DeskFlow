/**
 * VoiceInputWrapper — Universal voice input wrapper
 * Wraps any <input> or <textarea> with a mic button and floating panel.
 * Works with both controlled and uncontrolled inputs.
 */

import { useRef, useCallback, useEffect, useState, type ReactElement, cloneElement } from 'react';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { useAudioVisualizer } from '../hooks/useAudioVisualizer';
import { VoiceMicButton } from './VoiceMicButton';
import { VoiceFloatingPanel } from './VoiceFloatingPanel';
import { getCursorPosition, insertAtCursor, removeLastSentence } from '../lib/voice-utils';

interface VoiceInputWrapperProps {
  children: ReactElement<{
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    ref?: React.Ref<HTMLInputElement | HTMLTextAreaElement>;
  }>;
  /** Silence timeout in ms (default 5000) */
  silenceMs?: number;
  /** Language code override */
  lang?: string;
  /** Show language picker */
  showLangPicker?: boolean;
  /** Callback when transcript is finalized */
  onTranscript?: (text: string) => void;
}

export function VoiceInputWrapper({
  children,
  silenceMs = 5000,
  lang,
  showLangPicker = true,
  onTranscript,
}: VoiceInputWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [localValue, setLocalValue] = useState('');
  const sentencesRef = useRef<string[]>([]);

  const audio = useAudioVisualizer();

  // Track sentences for backspace
  const addSentence = useCallback((text: string) => {
    sentencesRef.current = [...sentencesRef.current, text];
  }, []);

  const removeLast = useCallback(() => {
    if (sentencesRef.current.length === 0) return;
    const last = sentencesRef.current[sentencesRef.current.length - 1];
    sentencesRef.current = sentencesRef.current.slice(0, -1);

    const el = inputRef.current;
    if (!el) return;

    // Remove last sentence from input value
    const current = el.value;
    const sentences = current.split(/[.!?\n]+/).map(s => s.trim()).filter(Boolean);
    if (sentences.length > 0) {
      const newText = sentences.slice(0, -1).join('. ') + (sentences.length > 1 ? '.' : '');
      updateValue(newText);
    }
  }, []);

  // Unified value updater — handles both controlled and uncontrolled
  const updateValue = useCallback((newValue: string, cursorPos?: number) => {
    const el = inputRef.current;
    if (!el) return;

    const isControlled = children.props.value !== undefined;

    if (isControlled) {
      // For controlled inputs, dispatch synthetic event
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype || window.HTMLTextAreaElement.prototype,
        'value'
      )?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(el, newValue);
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      // Uncontrolled: set directly
      el.value = newValue;
      setLocalValue(newValue);
    }

    // Restore cursor position
    if (cursorPos !== undefined) {
      el.setSelectionRange(cursorPos, cursorPos);
    }
  }, [children.props.value]);

  // Handle transcript from voice input
  const handleTranscript = useCallback((text: string) => {
    // Check for backspace command
    if (text.startsWith('\x00BACKSPACE:')) {
      // Already handled by removeLast
      return;
    }

    const el = inputRef.current;
    if (!el) return;

    addSentence(text);

    const cursor = getCursorPosition(el);
    const { newValue, newCursor } = insertAtCursor(el.value, text, cursor, 'append');
    updateValue(newValue, newCursor.start);

    onTranscript?.(text);
  }, [addSentence, updateValue, onTranscript]);

  const voice = useVoiceInput({
    onTranscript: handleTranscript,
    silenceMs,
    lang,
    mode: 'append',
    elementRef: inputRef,
  });

  // Start audio visualizer when listening starts
  useEffect(() => {
    if (voice.state === 'listening' && !audio.active) {
      audio.start();
    } else if (voice.state !== 'listening' && audio.active) {
      audio.stop();
    }
  }, [voice.state, audio]);

  const handleToggle = useCallback(() => {
    if (voice.state === 'listening') {
      voice.stop();
    } else {
      sentencesRef.current = [];
      voice.start();
    }
  }, [voice]);

  const handleBackspace = useCallback(() => {
    removeLast();
    voice.backspace();
  }, [removeLast, voice]);

  // Keyboard: Escape stops voice input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && voice.state === 'listening') {
        voice.stop();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [voice]);

  // Determine if input is multiline
  const isMultiline = children.type === 'textarea' ||
    (typeof children.type === 'function' && children.type.name?.toLowerCase().includes('textarea'));

  // Clone child with ref merged
  const childWithRef = cloneElement(children, {
    ref: (node: HTMLInputElement | HTMLTextAreaElement | null) => {
      inputRef.current = node;
      // Forward ref if child has one
      const childRef = children.props.ref;
      if (typeof childRef === 'function') childRef(node);
      else if (childRef && 'current' in childRef) (childRef as React.MutableRefObject<unknown>).current = node;
    },
    className: `${children.props.className || ''} pr-10`, // Make room for mic button
  });

  if (!voice.supported) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      {childWithRef}

      {/* Mic button — positioned inside input */}
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10">
        <VoiceMicButton
          state={voice.state}
          isActive={voice.isActive}
          error={voice.error}
          lang={voice.lang}
          onToggle={handleToggle}
          onLangChange={voice.setLang}
          showLangPicker={showLangPicker}
          size={isMultiline ? 'sm' : 'md'}
        />
      </div>

      {/* Floating panel */}
      <VoiceFloatingPanel
        state={voice.state}
        interim={voice.interim}
        bars={audio.bars}
        volume={audio.volume}
        audioActive={audio.active}
        countdownMs={voice.countdownMs}
        error={voice.error}
        sentencesCount={sentencesRef.current.length}
        onStop={voice.stop}
        onBackspace={handleBackspace}
        position={isMultiline ? 'above' : 'below'}
      />
    </div>
  );
}
