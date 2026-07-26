-- Add chapter grouping and original prompt storage to learn_lessons

ALTER TABLE learn_lessons ADD COLUMN chapter TEXT DEFAULT '';
ALTER TABLE learn_lessons ADD COLUMN original_prompt TEXT DEFAULT '';
