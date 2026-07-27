export interface UserProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  location: string;
  targetRole: string;
  careerLevel: 'junior' | 'mid' | 'senior' | 'staff' | 'principal';
  professionalSummary: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bullet {
  text: string;
  metrics?: string;
  xyzCompliant: boolean;
}

export interface ResumeExperience {
  id: string;
  profileId: string;
  company: string;
  roleTitle: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  bullets: Bullet[];
  sortOrder: number;
}

export interface ResumeProject {
  id: string;
  profileId: string;
  projectName: string;
  description: string;
  techStack: string[];
  bullets: Bullet[];
  link: string;
  sortOrder: number;
}

export interface ResumeSkill {
  id: string;
  profileId: string;
  category: 'languages' | 'frameworks' | 'infrastructure' | 'databases' | 'ai_tools' | 'practices';
  skillName: string;
  proficiency: 'expert' | 'proficient' | 'familiar';
  yearsExperience: number;
}

export interface SkillCategory {
  category: string;
  items: string[];
}

export interface ResumeEducation {
  id: string;
  profileId: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  graduationDate: string;
  gpa: number;
  includeGpa: boolean;
  includeGraduationDate: boolean;
  sortOrder: number;
}

export interface Takeaway {
  id: string;
  userId: string;
  source: 'chatgpt' | 'claude' | 'cursor' | 'manual' | 'mobile_scan' | 'document_upload';
  sessionId: string;
  sessionDate: string;
  takeawayType: 'PROJECT' | 'SKILL' | 'PROBLEM_SOLVED' | 'OPTIMIZATION' | 'ARCHITECTURE_DECISION' | 'CERTIFICATION' | 'CREDENTIAL';
  title: string;
  xyzBulletDraft: string;
  techStack: string[];
  metricsEstimated: Record<string, any>;
  context: string;
  skillsDemonstrated: string[];
  resumeSection: 'EXPERIENCE' | 'PROJECTS' | 'SKILLS' | 'EDUCATION';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'pending' | 'confirmed' | 'rejected' | 'used';
  createdAt: string;
  updatedAt: string;
}

export interface ChatCompilation {
  id: string;
  userId: string;
  source: 'chatgpt' | 'claude' | 'cursor' | 'manual';
  sessionName: string;
  sessionDate: string;
  transcriptPreview: string;
  takeawayCount: number;
  confirmedCount: number;
  status: 'processing' | 'completed' | 'failed';
  createdAt: string;
}

export interface CertificationScan {
  id: string;
  userId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  extractedData: {
    name?: string;
    issuer?: string;
    dateEarned?: string;
    expiryDate?: string;
    credentialId?: string;
    verificationUrl?: string;
  };
  status: 'pending' | 'extracted' | 'confirmed' | 'added';
  createdAt: string;
}

export interface DocumentUpload {
  id: string;
  userId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  extractedContent: string;
  takeawayCount: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}

export interface ResumeVersion {
  id: string;
  profileId: string;
  versionName: string;
  targetRole: string;
  targetCompany: string;
  content: ResumeContent;
  score: number;
  scoreBreakdown: Record<string, number>;
  hrReviewResult: HrReviewResult | null;
  isCurrent: boolean;
  createdAt: string;
}

export interface ResumeContent {
  profile: UserProfile;
  summary: string;
  experience: ResumeExperience[];
  projects: ResumeProject[];
  skills: SkillCategory[];
  education: ResumeEducation[];
}

export interface QuestionHistoryEntry {
  questionId: string;
  question: Question;
  answer: any;
  aiFeedback: AiFeedback | null;
  timestamp: string;
}

export interface BuilderProgress {
  currentPhase: number;
  currentQuestionId: string;
  phaseStatus: Record<number, 'locked' | 'in_progress' | 'complete'>;
  answers: Record<string, any>;
  questionHistory: QuestionHistoryEntry[];
  overallPercent: number;
}

export const QUALITY_COLORS: Record<AiFeedback['quality'], string> = {
  strong: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/25',
  good: 'bg-blue-500/15 text-blue-400 ring-blue-500/25',
  needs_work: 'bg-amber-500/15 text-amber-400 ring-amber-500/25',
  weak: 'bg-red-500/15 text-red-400 ring-red-500/25',
};

export interface Question {
  id: string;
  phase: number;
  phaseName: string;
  questionNumber: string;
  text: string;
  whyItMatters: string;
  inputType: 'text' | 'textarea' | 'metric' | 'tags' | 'slider' | 'select';
  exampleAnswer: string;
  showExample: boolean;
  validation: {
    minLength?: number;
    requiresMetric?: boolean;
    metricTypes?: string[];
  };
  guideInclude?: string[];
  guideExclude?: string[];
  guideTips?: string[];
}

export interface AiFeedback {
  quality: 'strong' | 'good' | 'needs_work' | 'weak';
  comment: string;
  suggestion: string;
  bulletDraft: string;
}

export interface ResumeScore {
  current: number;
  previous: number;
  breakdown: Record<string, number>;
}

export interface NextQuestionResponse {
  nextQuestion: Question;
  aiFeedback: AiFeedback;
  progress: {
    overallPercent: number;
    currentPhasePercent: number;
    phaseStatus: string;
  };
  checklistUpdates: { item: string; status: string }[];
  resumeScore: ResumeScore;
}

export interface HrReviewResult {
  overallScore: number;
  verdict: string;
  dimensionScores: Record<string, number>;
  fixList: FixItem[];
  redlineDraft: RedlineItem[];
}

export interface FixItem {
  dimension: string;
  issue: string;
  severity: 'critical' | 'major' | 'minor';
  suggestion: string;
}

export interface RedlineItem {
  original: string;
  suggested: string;
  reason: string;
}

export interface SurveyAnswer {
  questionId: string;
  answer: any;
  timestamp: string;
}

export interface SurveyState {
  currentStep: number;
  answers: SurveyAnswer[];
  completed: boolean;
}

export interface ResumeReport {
  id: string;
  userId: string;
  type: 'completion' | 'ats_check' | 'keyword_analysis' | 'improvement_suggestions';
  title: string;
  data: Record<string, any>;
  score?: number;
  createdAt: string;
}

export interface ResumeReports {
  completionReport: {
    overallPercent: number;
    sectionsComplete: Record<string, boolean>;
    missingFields: string[];
  };
  atsReport: {
    score: number;
    issues: string[];
    suggestions: string[];
  };
  keywordReport: {
    matchedKeywords: string[];
    missingKeywords: string[];
    matchRate: number;
  };
}

export interface ExportSettings {
  format: 'pdf' | 'markdown' | 'json';
  targetRole: string;
  targetCompany: string;
  includePhoto: boolean;
  customSections: string[];
}

export type PreviewMode = 'styled' | 'ats_raw' | 'heatmap';

export const PHASE_NAMES: Record<number, string> = {
  1: 'Foundation',
  2: 'Experience Archaeology',
  3: 'Project Excavation',
  4: 'Skills Inventory',
  5: 'Impact Quantification',
  6: 'Objective Audit',
  7: 'Final Assembly',
};

export const PHASE_ICONS: Record<number, string> = {
  1: 'Rocket',
  2: 'Briefcase',
  3: 'FolderOpen',
  4: 'Code2',
  5: 'TrendingUp',
  6: 'Search',
  7: 'FileText',
};
