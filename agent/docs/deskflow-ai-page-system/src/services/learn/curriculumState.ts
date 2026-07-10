import { CURRICULUM_BLUEPRINT, type CurriculumPart } from './curriculum';
import type { LessonSummary } from '../../shared/learn/types';

export interface PartState {
  part: CurriculumPart;
  lessons: LessonSummary[];
  hasContent: boolean;
  checklistCoverage: boolean[];
}

export function buildCurriculumState(lessons: LessonSummary[]): PartState[] {
  return CURRICULUM_BLUEPRINT.map((part) => {
    const mine = lessons.filter((l) => l.part === part.part);
    return {
      part,
      lessons: mine,
      hasContent: mine.length > 0,
      checklistCoverage: part.checklist.map(() => false),
    };
  });
}
