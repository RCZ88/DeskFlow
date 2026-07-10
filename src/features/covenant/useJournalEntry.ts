import { useCallback, useEffect, useRef, useState } from 'react';
import { loadJournal, saveJournal } from './storage';
import { startVoiceRecording, saveVoiceNote, loadVoiceNote, deleteVoiceNote, type VoiceRecorderHandle } from './voiceJournal';

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useCovenantJournalEntry(commitmentId: string | null, date: string, initialText?: string, onSave?: () => void) {
  const [text, setText] = useState(initialText || '');
  const [voiceNoteId, setVoiceNoteId] = useState<string | undefined>(undefined);
  const [voiceDurationSec, setVoiceDurationSec] = useState<number | undefined>(undefined);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<VoiceRecorderHandle | null>(null);

  useEffect(() => {
    const existing = loadJournal().find(j => j.commitmentId === commitmentId && j.date === date);
    if (existing) {
      setText(existing.text || '');
      setVoiceNoteId(existing.voiceNoteId);
      setVoiceDurationSec(existing.voiceDurationSec);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commitmentId, date]);

  useEffect(() => {
    let revoke: string | null = null;
    if (voiceNoteId) {
      loadVoiceNote(voiceNoteId).then(blob => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          revoke = url;
          setVoiceUrl(url);
        }
      });
    } else {
      setVoiceUrl(null);
    }
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [voiceNoteId]);

  const persist = useCallback((patch: Partial<{ text: string; voiceNoteId?: string; voiceDurationSec?: number }>) => {
    const all = loadJournal();
    const idx = all.findIndex(j => j.commitmentId === commitmentId && j.date === date);
    const next = {
      commitmentId,
      date,
      text: patch.text ?? (idx >= 0 ? all[idx].text : text),
      voiceNoteId: 'voiceNoteId' in patch ? patch.voiceNoteId : (idx >= 0 ? all[idx].voiceNoteId : voiceNoteId),
      voiceDurationSec: 'voiceDurationSec' in patch ? patch.voiceDurationSec : (idx >= 0 ? all[idx].voiceDurationSec : voiceDurationSec),
      updatedAt: Date.now(),
    };
    if (idx >= 0) all[idx] = next; else all.push(next);
    saveJournal(all);
  }, [commitmentId, date, text, voiceNoteId, voiceDurationSec]);

  const save = useCallback(() => {
    persist({ text });
    onSave?.();
  }, [persist, text, onSave]);

  const startRecording = useCallback(async () => {
    try {
      recorderRef.current = await startVoiceRecording();
      setIsRecording(true);
    } catch {
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const handle = recorderRef.current;
    if (!handle) return;
    const startedAt = Date.now();
    const blob = await handle.stop();
    const durationSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const id = uid();
    await saveVoiceNote(id, blob, durationSec);
    setVoiceNoteId(id);
    setVoiceDurationSec(durationSec);
    setIsRecording(false);
    persist({ voiceNoteId: id, voiceDurationSec: durationSec });
  }, [persist]);

  const deleteVoice = useCallback(() => {
    if (voiceNoteId) deleteVoiceNote(voiceNoteId);
    setVoiceNoteId(undefined);
    setVoiceDurationSec(undefined);
    persist({ voiceNoteId: undefined, voiceDurationSec: undefined });
  }, [voiceNoteId, persist]);

  return { text, setText, save, isRecording, startRecording, stopRecording, voiceUrl, voiceDurationSec, deleteVoice };
}
