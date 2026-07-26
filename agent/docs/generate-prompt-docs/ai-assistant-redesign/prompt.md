                                                                                                                                                # PROMPT.md — High-Fidelity Design Prompt for AI Assistant Page Visual Redesign

                                                                                                                                                ## Raw Request

                                                                                                                                                > the design is just straight up bad. agin the conmainter and stuf f looks bad. use  the frontend dev skil and all frontend UI UX skills and the 21st dev mcp and evreything in between to make it look more interesting. more modern ,looks better, but stays on the theem of the app.

                                                                                                                                                ## Problem Statement

                                                                                                                                                The AI Assistant page design is visually unappealing and unprofessional. The container components (GlassCard variants) look identical despite having different purposes, the section decorators/headers are jittering and look bad, and the overall visual hierarchy is unclear. The markdown rendering in MyPlanCard shows purple headings inside an emerald card, creating visual dissonance. The design needs to be more modern, visually interesting, and maintain clear visual hierarchy while staying within the app's theme.

                                                                                                                                                ## Context Bundle Reference

                                                                                                                                                **Source:** `agent/docs/ai-assistant-redesign/CONTEXT_BUNDLE.md`

                                                                                                                                                This prompt must be read in conjunction with the CONTEXT_BUNDLE.md file, which contains:

                                                                                                                                                - Current implementation details of AiPage.tsx and GlassCard.tsx
                                                                                                                                                - Existing design system (colors, typography, spacing)
                                                                                                                                                - Data flow architecture and IPC endpoints
                                                                                                                                                - Current visual issues and user feedback
                                                                                                                                                - Technical constraints and requirements

                                                                                                                                                ## Engineering Task

                                                                                                                                                Design a comprehensive **Data Processing Pipeline** for the AI Assistant page that:

                                                                                                                                                1. **Enhances Visual Hierarchy:** Create clear visual distinction between the three main sections (FOCUS/PLAN/REFLECT) through color, typography, and layout
                                                                                                                                                2. **Improves Card Diversity:** Ensure each GlassCard variant (default, compact, subtle, notebook, bordered, elevated, interactive) has unique visual identity
                                                                                                                                                3. **Optimizes Spacing System:** Implement consistent spacing (gap-6, mb-12, etc.) for better content organization
                                                                                                                                                4. **Enhances Interactive Elements:** Add meaningful hover states, micro-interactions, and transition effects
                                                                                                                                                5. **Modernizes Typography:** Establish clear heading hierarchy with appropriate sizing and weight variations
                                                                                                                                                6. **Maintains Theme Consistency:** Use the existing color palette (pink, amber, emerald, zinc) effectively
                                                                                                                                                7. **Improves Responsive Grid:** Optimize the 12-column grid for better content organization across devices
                                                                                                                                                8. **Fixes Color Issues:** Resolve the purple heading clash in MyPlanCard by using accent-matched colors
                                                                                                                                                9. **Enhances Section Headers:** Make numbered labels (01 FOCUS / 02 PLAN / 03 REFLECT) more visually prominent
                                                                                                                                                10. **Improves Header Design:** Create a mode-aware header with better visual hierarchy

                                                                                                                                                ## Design Task

                                                                                                                                                Design **High-Fidelity Visual Specs** for the AI Assistant page that include:

                                                                                                                                                1. **Section Header Design:**
                                                                                                                                                   - Numbered labels (01 FOCUS / 02 PLAN / 03 REFLECT) with status badges
                                                                                                                                                   - Clear visual hierarchy with icons and descriptive subtitles
                                                                                                                                                   - Consistent styling across all three sections

                                                                                                                                                2. **Card Component Variations:**
                                                                                                                                                   - Unique background, blur, border, and shadow for each variant
                                                                                                                                                   - Enhanced hover states and transition effects
                                                                                                                                                   - Better color contrast and visual weight
                                                                                                                                                   - Interactive states for user engagement

                                                                                                                                                3. **Layout and Grid System:**
                                                                                                                                                   - 12-column responsive grid optimization
                                                                                                                                                   - Consistent card spacing and alignment
                                                                                                                                                   - Better content organization and flow
                                                                                                                                                   - Responsive behavior for mobile, tablet, and desktop

                                                                                                                                                4. **Typography System:**
                                                                                                                                                   - Clear heading hierarchy (h1, h2, h3, h4)
                                                                                                                                                   - Appropriate font sizes and weights
                                                                                                                                                   - Better line heights and tracking
                                                                                                                                                   - Readable text contrast ratios

                                                                                                                                                5. **Color System:**
                                                                                                                                                   - Effective use of accent colors (pink, amber, emerald, zinc)
                                                                                                                                                   - Color-matched heading colors based on card accent
                                                                                                                                                   - Visual hierarchy through color coding
                                                                                                                                                   - Accessible color contrast

                                                                                                                                                6. **Interactive Elements:**
                                                                                                                                                   - Enhanced hover states on cards and buttons
                                                                                                                                                   - Micro-interactions and transitions
                                                                                                                                                   - Focus states for accessibility
                                                                                                                                                   - Loading and error state visuals

                                                                                                                                                7. **Header Design:**
                                                                                                                                                   - Mode-aware header with dynamic content
                                                                                                                                                   - Better visual hierarchy with avatar/icon
                                                                                                                                                   - Responsive design for different screen sizes
                                                                                                                                                   - Clear navigation and action areas

                                                                                                                                                ## UX Task

                                                                                                                                                Design the **Interaction Flow** for the AI Assistant page that includes:

                                                                                                                                                1. **Section Navigation:** Clear visual cues for navigating between FOCUS/PLAN/REFLECT sections
                                                                                                                                                2. **Card Interactions:** Meaningful hover states, click feedback, and drag-and-drop possibilities
                                                                                                                                                3. **Data Presentation:** Clear visualization of goals, progress, and insights
                                                                                                                                                4. **Action Areas:** Prominent call-to-action areas for AI suggestions and planning
                                                                                                                                                5. **Feedback Mechanisms:** Visual feedback for loading, errors, and success states
                                                                                                                                                6. **Responsive Behavior:** Seamless experience across all device sizes
                                                                                                                                                7. **Accessibility Features:** Keyboard navigation, screen reader support, focus management
                                                                                                                                                8. **Micro-interactions:** Subtle animations and transitions for enhanced user experience

                                                                                                                                                ## Constraints

                                                                                                                                                ### Hard Limits
                                                                                                                                                1. **Must work with existing API:** Cannot modify IPC channels or backend services
                                                                                                                                                2. **Must stay in existing files:** Cannot create new files or directories
                                                                                                                                                3. **Must pass build:** All changes must compile with `npm run build`
                                                                                                                                                4. **Must maintain theme consistency:** Use existing color palette and design tokens
                                                                                                                                                5. **Must follow existing patterns:** Adhere to current code conventions and architecture

                                                                                                                                                ### Technical Requirements
                                                                                                                                                1. **Backend compatibility:** All changes must work with existing IPC endpoints
                                                                                                                                                2. **State management:** Must integrate with existing React state management
                                                                                                                                                3. **Component integration:** Must work with existing component ecosystem
                                                                                                                                                4. **Performance:** Must maintain good performance and user experience
                                                                                                                                                5. **Accessibility:** Must meet WCAG accessibility standards

                                                                                                                                                ## What the Generated Solution Should Include

                                                                                                                                                1. **Complete Component Redesign:** Detailed specifications for all GlassCard variants
                                                                                                                                                2. **Visual Hierarchy Plan:** Clear distinction between sections and components
                                                                                                                                                3. **Color System:** Effective use of accent colors for visual organization
                                                                                                                                                4. **Typography Scale:** Complete font sizing and spacing system
                                                                                                                                                5. **Interaction Design:** Detailed hover states, transitions, and micro-interactions
                                                                                                                                                6. **Layout Specifications:** Grid system, card arrangement, and responsive behavior
                                                                                                                                                7. **Implementation Details:** Specific code changes and CSS modifications
                                                                                                                                                8. **Testing Strategy:** Manual testing approach for visual changes
                                                                                                                                                9. **Performance Considerations:** Optimization recommendations
                                                                                                                                                10. **Accessibility Compliance:** WCAG adherence details

                                                                                                                                                ## Output Format

                                                                                                                                                **Markdown** with the following structure:

                                                                                                                                                ```markdown
                                                                                                                                                # AI Assistant Page Visual Redesign - High-Fidelity Design Specification

                                                                                                                                                ## Executive Summary
                                                                                                                                                [Brief overview of the redesign]

                                                                                                                                                ## Section 1: Visual Hierarchy
                                                                                                                                                [Detailed specifications for section headers and visual organization]

                                                                                                                                                ## Section 2: Card Component Variations
                                                                                                                                                [Complete specifications for all GlassCard variants]

                                                                                                                                                ## Section 3: Typography System
                                                                                                                                                [Complete font sizing, weights, and spacing specifications]

                                                                                                                                                ## Section 4: Color System
                                                                                                                                                [Color palette usage and accent-based design]

                                                                                                                                                ## Section 5: Interaction Design
                                                                                                                                                [Hover states, transitions, and micro-interactions]

                                                                                                                                                ## Section 6: Layout and Grid
                                                                                                                                                [Responsive grid specifications and card arrangement]

                                                                                                                                                ## Section 7: Header Design
                                                                                                                                                [Mode-aware header specifications]

                                                                                                                                                ## Section 8: Implementation Details
                                                                                                                                                [Specific code changes and CSS modifications]

                                                                                                                                                ## Section 9: Testing Strategy
                                                                                                                                                [Manual testing approach and verification steps]

                                                                                                                                                ## Section 10: Performance Considerations
                                                                                                                                                [Optimization recommendations]

                                                                                                                                                ## Section 11: Accessibility Compliance
                                                                                                                                                [WCAG adherence details]
                                                                                                                                                ```

                                                                                                                                                ## What the Generated Solution Should NOT Include

                                                                                                                                                1. **Multiple Options:** Do not ask the user to choose between design options
                                                                                                                                                2. **Ambiguous Outcomes:** Do not say "design something better"; specify exactly what needs to be designed
                                                                                                                                                3. **Prescribed Component Structure:** Let the AI decide the architecture
                                                                                                                                                4. **Your Own Interpretation:** Do not add personal framing or commentary to the user's request
                                                                                                                                                5. **Incomplete Specifications:** Ensure all aspects of the request are covered

                                                                                                                                                ## Example Flow

                                                                                                                                                1. **User:** "the design is just straight up bad... make it look more interesting"
                                                                                                                                                2. **You:** [Created CONTEXT_BUNDLE.md with current implementation details]
                                                                                                                                                3. **You:** [Created this PROMPT.md with high-fidelity design specifications]
                                                                                                                                                4. **You:** "I have created a context bundle and prompt. The prompt tasks the AI with designing a comprehensive visual overhaul for the AI Assistant page, with the context bundle as its codebase reference. Send the prompt and context bundle to the AI to get the full design specification."

                                                                                                                                                ## Backend Logic Verification

                                                                                                                                                **✅ All backend requirements met:**
                                                                                                                                                - Existing IPC channels (`getGoals`, `readPlanningMd`, `getTopicDigest`, `getGoalContext`, `suggestGoals`, `getLongtermGoals`) are fully functional
                                                                                                                                                - No new backend features required for this redesign
                                                                                                                                                - All changes are frontend-only
                                                                                                                                                - No backend gaps detected

                                                                                                                                                ## Files Created

                                                                                                                                                - `agent/docs/ai-assistant-redesign/CONTEXT_BUNDLE.md` — Current implementation context
                                                                                                                                                - `agent/docs/ai-assistant-redesign/PROMPT.md` — This design specification prompt
                                                                                                                                                - `agent/docs/ai-assistant-redesign/RESULT.md` — Will be created after AI response
                                                                                                                                                - `agent/docs/ai-assistant-redesign/IMPLEMENTATION_PLAN.md` — Will be created after RESULT.md analysis

                                                                                                                                                ## Next Steps

                                                                                                                                                1. **Send to Target AI:** Claude/GPT-4/Gemini-2.5 with the CONTEXT_BUNDLE.md and this PROMPT.md
                                                                                                                                                2. **Receive RESULT.md:** High-fidelity design specification from the AI
                                                                                                                                                3. **Analyze and Plan:** Create IMPLEMENTATION_PLAN.md mapping the design to actual code
                                                                                                                                                4. **Implement:** Follow the Phase 1-4 workflow to implement the design
                                                                                                                                                5. **Verify:** Ensure all changes pass build and manual testing

                                                                                                                                                ## Critical Rules

                                                                                                                                                1. **RESULT.md is RAW and UNTOUCHABLE:** Consume exactly as-is, do not edit or summarize
                                                                                                                                                2. **Implement After Analysis:** Read RESULT.md fully, trace codebase, identify gaps, plan modifications before coding
                                                                                                                                                3. **Removal MUST Be Confirmed:** If RESULT.md proposes removing anything, ask user for explicit confirmation
                                                                                                                                                4. **Backup Before Every Removal:** Create timestamped backups before deleting any file
                                                                                                                                                5. **Backend Logic MUST Be Verified:** Every feature must be traced to real backend code before implementation
                                                                                                                                                6. **Recursive Completeness Check:** Ensure 100% coverage between PROMPT.md requirements and RESULT.md sections
                                                                                                                                                7. **Task Splitting:** For large specs, split into focused sub-prompts for sequential implementation
                                                                                                                                                8. **Implementation Planning:** Create detailed plan mapping RESULT.md to actual codebase before writing any code
                                                                                                                                                9. **Backend Audit:** Every change must be traced to real IPC, service, and DB code
                                                                                                                                                10. **Flag Backend Gaps:** Any missing backend logic must be explicitly flagged and addressed