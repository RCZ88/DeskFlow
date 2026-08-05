import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  UserProfile, BuilderProgress, ResumeContent, Takeaway,
  ResumeVersion, ResumeScore, Question, AiFeedback,
  ChatCompilation, CertificationScan, DocumentUpload,
  NextQuestionResponse, ResumeReports, ExportSettings, PreviewMode,
} from '../types/resume';

interface ResumeState {
  profile: UserProfile | null;
  builderProgress: BuilderProgress;
  currentQuestion: Question | null;
  aiFeedback: AiFeedback | null;
  resumeContent: ResumeContent;
  takeaways: Takeaway[];
  chatCompilations: ChatCompilation[];
  certScans: CertificationScan[];
  documentUploads: DocumentUpload[];
  score: ResumeScore;
  versions: ResumeVersion[];
  reports: ResumeReports | null;
  previewMode: PreviewMode;
  previewZoom: number;
  isSaving: boolean;
  isLoading: boolean;
  error: string | null;

  setProfile: (p: UserProfile) => void;
  updateBuilderProgress: (p: Partial<BuilderProgress>) => void;
  setCurrentQuestion: (q: Question | null) => void;
  setAiFeedback: (f: AiFeedback | null) => void;
  updateResumeContent: (c: Partial<ResumeContent>) => void;
  setTakeaways: (t: Takeaway[]) => void;
  addTakeaway: (t: Takeaway) => void;
  removeTakeaway: (id: string) => void;
  setChatCompilations: (c: ChatCompilation[]) => void;
  addChatCompilation: (c: ChatCompilation) => void;
  setCertScans: (s: CertificationScan[]) => void;
  addCertScan: (s: CertificationScan) => void;
  setDocumentUploads: (d: DocumentUpload[]) => void;
  addDocumentUpload: (d: DocumentUpload) => void;
  updateScore: (s: ResumeScore) => void;
  setVersions: (v: ResumeVersion[]) => void;
  addVersion: (v: ResumeVersion) => void;
  removeVersion: (id: string) => void;
  setReports: (r: ResumeReports) => void;
  setPreviewMode: (m: PreviewMode) => void;
  setPreviewZoom: (z: number) => void;
  setIsSaving: (s: boolean) => void;
  setIsLoading: (l: boolean) => void;
  setError: (e: string | null) => void;

  fetchProfile: () => Promise<void>;
  saveProfile: (p: UserProfile) => Promise<void>;
  fetchTakeaways: (filters?: any) => Promise<void>;
  fetchChatCompilations: () => Promise<void>;
  fetchCertScans: () => Promise<void>;
  submitAnswer: (questionId: string, answer: any, phase: number) => Promise<NextQuestionResponse>;
  compileResume: () => Promise<void>;
  fetchVersions: () => Promise<void>;
  saveVersion: (v: Partial<ResumeVersion>) => Promise<void>;
  exportResume: (versionId: string, format: string) => Promise<{ success: boolean; filePath?: string }>;
  fetchReports: () => Promise<void>;
  saveProgress: () => Promise<boolean>;
  loadProgress: () => Promise<any>;
}

const defaultProgress: BuilderProgress = {
  currentPhase: 1,
  currentQuestionId: '',
  phaseStatus: { 1: 'in_progress', 2: 'locked', 3: 'locked', 4: 'locked', 5: 'locked', 6: 'locked', 7: 'locked' },
  answers: {},
  questionHistory: [],
  overallPercent: 0,
};

const defaultContent: ResumeContent = {
  profile: {} as UserProfile,
  summary: '',
  experience: [],
  projects: [],
  skills: [],
  education: [],
};

const normalizePhaseStatus = (
  ps: any
): Record<number, 'locked' | 'in_progress' | 'complete'> => {
  if (!ps) return defaultProgress.phaseStatus;
  return Object.fromEntries(
    Object.entries(ps).map(([k, v]) => [Number(k), v])
  ) as Record<number, 'locked' | 'in_progress' | 'complete'>;
};

export const useResumeStore = create<ResumeState>()(
  persist(
    (set, get) => ({
      profile: null,
      builderProgress: defaultProgress,
      currentQuestion: null,
      aiFeedback: null,
      resumeContent: defaultContent,
      takeaways: [],
      chatCompilations: [],
      certScans: [],
      documentUploads: [],
      score: { current: 0, previous: 0, breakdown: {} },
      versions: [],
      reports: null,
      previewMode: 'styled',
      previewZoom: 65,
      isSaving: false,
      isLoading: false,
      error: null,

      setProfile: (p) => set({ profile: p }),
      updateBuilderProgress: (p) => set((s) => ({ builderProgress: { ...s.builderProgress, ...p } })),
      setCurrentQuestion: (q) => set({ currentQuestion: q }),
      setAiFeedback: (f) => set({ aiFeedback: f }),
      updateResumeContent: (c) => set((s) => ({ resumeContent: { ...s.resumeContent, ...c } })),
      setTakeaways: (t) => set({ takeaways: t }),
      addTakeaway: (t) => set((s) => ({ takeaways: [...s.takeaways, t] })),
      removeTakeaway: (id) => set((s) => ({ takeaways: s.takeaways.filter((t) => t.id !== id) })),
      setChatCompilations: (c) => set({ chatCompilations: c }),
      addChatCompilation: (c) => set((s) => ({ chatCompilations: [c, ...s.chatCompilations] })),
      setCertScans: (s) => set({ certScans: s }),
      addCertScan: (s) => set((st) => ({ certScans: [s, ...st.certScans] })),
      setDocumentUploads: (d) => set({ documentUploads: d }),
      addDocumentUpload: (d) => set((s) => ({ documentUploads: [d, ...s.documentUploads] })),
      updateScore: (s) => set({ score: s }),
      setVersions: (v) => set({ versions: v }),
      addVersion: (v) => set((s) => ({ versions: [v, ...s.versions] })),
      removeVersion: (id) => set((s) => ({ versions: s.versions.filter((v) => v.id !== id) })),
      setReports: (r) => set({ reports: r }),
      setPreviewMode: (m) => set({ previewMode: m }),
      setPreviewZoom: (z) => set({ previewZoom: z }),
      setIsSaving: (s) => set({ isSaving: s }),
      setIsLoading: (l) => set({ isLoading: l }),
      setError: (e) => set({ error: e }),

      fetchProfile: async () => {
        try {
          const p = await (window as any).deskflowAPI?.resume?.getProfile();
          if (p) set({ profile: p });
        } catch (e) {
          console.error('[ResumeStore] fetchProfile:', e);
        }
      },
      saveProfile: async (p) => {
        set({ isSaving: true });
        try {
          await (window as any).deskflowAPI?.resume?.saveProfile(p);
          set({ profile: p, isSaving: false });
        } catch (e) {
          console.error('[ResumeStore] saveProfile:', e);
          set({ isSaving: false });
        }
      },
      fetchTakeaways: async (filters) => {
        try {
          const t = await (window as any).deskflowAPI?.resume?.getTakeaways(filters);
          if (t) set({ takeaways: t });
        } catch (e) {
          console.error('[ResumeStore] fetchTakeaways:', e);
        }
      },
      fetchChatCompilations: async () => {
        try {
          const c = await (window as any).deskflowAPI?.resume?.getChatCompilations();
          if (c) set({ chatCompilations: c });
        } catch (e) {
          console.error('[ResumeStore] fetchChatCompilations:', e);
        }
      },
      fetchCertScans: async () => {
        try {
          const s = await (window as any).deskflowAPI?.resume?.getCertScans();
          if (s) set({ certScans: s });
        } catch (e) {
          console.error('[ResumeStore] fetchCertScans:', e);
        }
      },
      submitAnswer: async (questionId, answer, phase) => {
        set({ isSaving: true });
        try {
          const result = await (window as any).deskflowAPI?.resume?.submitAnswer(questionId, answer, phase);
          set({
            builderProgress: result.progress,
            currentQuestion: result.nextQuestion,
            aiFeedback: result.aiFeedback,
            score: result.resumeScore,
            isSaving: false,
          });
          return result;
        } catch (e) {
          console.error('[ResumeStore] submitAnswer:', e);
          set({ isSaving: false });
          throw e;
        }
      },
      compileResume: async () => {
        set({ isSaving: true });
        try {
          const content = await (window as any).deskflowAPI?.resume?.compileResume(get().resumeContent);
          set({ resumeContent: content, isSaving: false });
        } catch (e) {
          console.error('[ResumeStore] compileResume:', e);
          set({ isSaving: false });
        }
      },
      fetchVersions: async () => {
        try {
          const pid = get().profile?.id;
          if (!pid) return;
          const v = await (window as any).deskflowAPI?.resume?.getVersions(pid);
          if (v) set({ versions: v });
        } catch (e) {
          console.error('[ResumeStore] fetchVersions:', e);
        }
      },
      saveVersion: async (v) => {
        set({ isSaving: true });
        try {
          const saved = await (window as any).deskflowAPI?.resume?.saveVersion(v);
          set((s) => ({
            versions: [saved, ...s.versions.filter((x) => x.id !== saved.id)],
            isSaving: false,
          }));
        } catch (e) {
          console.error('[ResumeStore] saveVersion:', e);
          set({ isSaving: false });
        }
      },
      exportResume: async (versionId, format) => {
        set({ isSaving: true });
        try {
          const r = await (window as any).deskflowAPI?.resume?.exportPdf(versionId, format);
          set({ isSaving: false });
          return r || { success: false };
        } catch (e) {
          console.error('[ResumeStore] exportResume:', e);
          set({ isSaving: false });
          return { success: false };
        }
      },
      fetchReports: async () => {
        try {
          const r = await (window as any).deskflowAPI?.resume?.getReports();
          if (r) set({ reports: r });
        } catch (e) {
          console.error('[ResumeStore] fetchReports:', e);
        }
      },
      saveProgress: async () => {
        set({ isSaving: true });
        try {
          const ok = await (window as any).deskflowAPI?.resume?.saveProgress(get().builderProgress);
          set({ isSaving: false });
          return ok !== false;
        } catch (e) {
          console.error('[ResumeStore] saveProgress:', e);
          set({ isSaving: false });
          return false;
        }
      },
      loadProgress: async () => {
        try {
          return await (window as any).deskflowAPI?.resume?.loadProgress() || null;
        } catch (e) {
          console.error('[ResumeStore] loadProgress:', e);
          return null;
        }
      },
    }),
    {
      name: 'resume-builder-storage',
      partialize: (s) => ({
        profile: s.profile,
        builderProgress: s.builderProgress,
        resumeContent: s.resumeContent,
        aiFeedback: s.aiFeedback,
        previewMode: s.previewMode,
        previewZoom: s.previewZoom,
      }),
      merge: (persisted: any, current: any) => ({
        ...current,
        ...persisted,
        builderProgress: {
          ...current.builderProgress,
          ...persisted?.builderProgress,
          phaseStatus: normalizePhaseStatus(persisted?.builderProgress?.phaseStatus),
          questionHistory: persisted?.builderProgress?.questionHistory ?? [],
        },
      }),
    }
  )
);

let saveTimer: ReturnType<typeof setTimeout> | null = null;
useResumeStore.subscribe((state, prev) => {
  if (state.builderProgress === prev.builderProgress) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      (window as any).deskflowAPI?.resume?.saveProgress?.(state.builderProgress);
    } catch (e) {
      console.error('[ResumeStore] auto-save error:', e);
    }
  }, 400);
});
