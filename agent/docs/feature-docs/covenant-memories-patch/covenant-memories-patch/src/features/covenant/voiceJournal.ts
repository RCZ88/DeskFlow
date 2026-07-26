import { putBlobRecord, getBlobRecord, deleteBlobRecord } from '../warmth/localBlobStore';

// Fully local voice-note recording. Audio is captured with MediaRecorder and
// written straight to IndexedDB on this device -- it is never transcribed,
// never uploaded, and never touches any network call. This is a hard privacy
// requirement, not a preference, so keep this file's contract simple: record
// in, blob out, nothing else.

export interface VoiceRecorderHandle {
  stop: () => Promise<Blob>;
  cancel: () => void;
}

export async function startVoiceRecording(): Promise<VoiceRecorderHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream);
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

  const stopAllTracks = () => stream.getTracks().forEach(t => t.stop());

  recorder.start();

  return {
    stop: () => new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        stopAllTracks();
        resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
      };
      recorder.stop();
    }),
    cancel: () => {
      try { recorder.stop(); } catch { /* already stopped */ }
      stopAllTracks();
    },
  };
}

export async function saveVoiceNote(id: string, blob: Blob, durationSec: number): Promise<void> {
  await putBlobRecord('voiceNotes', { id, blob, meta: { durationSec }, createdAt: Date.now() });
}

export async function loadVoiceNote(id: string): Promise<Blob | null> {
  const record = await getBlobRecord<{ durationSec: number }>('voiceNotes', id);
  return record?.blob ?? null;
}

export async function deleteVoiceNote(id: string): Promise<void> {
  await deleteBlobRecord('voiceNotes', id);
}
