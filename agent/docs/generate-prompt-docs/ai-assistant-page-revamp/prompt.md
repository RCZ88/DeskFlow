## Raw Request
"can we make sure that we revamp the layout of the ai assistant page iwth all of the frontend skills. uyse genearte prompt skill @agent\skills\generate-prompt\SKILL.md  to revamp the desing. include the list of skills to use. the layout is wrong and is bad that its all on the side and like its not placed properly with proper scale and shit."

## Problem Statement
The AI assistant page (AiPage.tsx) layout has scaling and balance issues. Users report that elements feel "all on the side" and are "not placed properly with proper scale." Specifically:
1. The current 2:1 column ratio (left column taking 2/3 width, right column taking 1/3) creates visual imbalance
2. Card sizing and spacing may not be optimized for content density and readability
3. Layout doesn't effectively utilize available screen real estate, leading to inefficient use of space
4. Visual hierarchy could be improved to better prioritize important information based on user goals and workflows

This affects user experience by making the interface feel cramped on one side while potentially wasting space on the other, reducing the effectiveness of the AI assistant as a productivity tool.

## Context Bundle Reference
See `agent/docs/ai-assistant-page-revamp/CONTEXT_BUNDLE.md` for complete technical context including:
- Component props and data structures (Goal interface, etc.)
- Design tokens (colors, spacing, typography, animation standards)
- IPC endpoints used for data loading and saving
- State management patterns
- Architecture notes on data flow and component hierarchy
- Current design system configuration (variance=5 balanced, motion=5 moderate, density=7 dense)

## Engineering Task
Design the data processing pipeline for the AI assistant page layout revamp:
1. How should goal data be structured and processed for optimal display in the new layout?
2. What state management patterns should be used to handle loading, error, and interaction states efficiently?
3. How should the responsive breakpoints be determined based on content complexity and screen sizes?
4. What caching or memoization strategies should be implemented to prevent unnecessary re-renders?
5. How should the layout adapt to different data loads (few goals vs many goals, long vs short text content)?
6. What accessibility considerations should be built into the layout structure (screen reader navigation, keyboard focus order)?

## Design Task
Specifically ask for High-Fidelity Visual Specs including:
1. **Layout Structure**: Propose an improved grid or layout system that addresses the "all on the side" feeling and scaling issues
2. **Spacing and Proportions**: Define exact spacing values, column ratios, and card dimensions that create visual balance
3. **Visual Hierarchy**: Specify how to prioritize different card types based on user workflow importance (morning planning vs evening review vs ongoing tracking)
4. **Responsive Behavior**: Detail how the layout should adapt across mobile, tablet, and desktop breakpoints
5. **Component Scaling**: Define how individual cards should scale or reflow based on available space and content
6. **Visual Design**: Apply the Productivity page accent (pink-500) with appropriate glassmorphism, borders, and shadows per frontend-design conventions
7. **Motion Design**: Specify entrance transitions, hover states, and interaction feedback using the moderate motion intensity (250ms ease-out)
8. **Accessibility**: Ensure proper color contrast, focus indicators, and screen reader navigation

## UX Task
Specifically ask for the Interaction Flow including:
1. **Default State**: What users see when first opening the AI assistant page
2. **Goal Interaction**: How users interact with goals (toggle, edit, dismiss, create new)
3. **Suggestion Flow**: How AI-generated suggestions are presented, accepted, or dismissed
4. **Review Process**: How evening reviews are composed, saved, and displayed
5. **Planning Integration**: How the planning checklist interacts with daily goals
6. **Error States**: How loading errors, empty states, and validation issues are communicated
7. **Micro-interactions**: Specific hover, press, and feedback animations for interactive elements
8. **Keyboard Navigation**: Tab order, shortcut suggestions, and accessibility controls

## Constraints
1. Must maintain all existing functionality - no features may be removed
2. Must use existing React components (DailyPlanCard, TopicDigestCard, MyPlanCard, LongTermPlanCard, GoalHistoryCard, ContextSummaryCard)
3. Must follow DeskFlow frontend design system conventions (refer to frontend-design skill)
4. Must preserve responsive behavior - mobile stacking and desktop grid layouts
5. Must maintain motion patterns using framer-motion with ease-out transitions
6. Must retain access to all IPC endpoints and data structures defined in CONTEXT_BUNDLE.md
7. Must keep the same data flow patterns (React state → props → UI rendering)
8. Must maintain the Productivity page accent color (pink-500) as defined in the design system
9. Must not break existing keyboard navigation or accessibility features
10. Implementation must be compatible with Electron desktop environment (avoid layout-thrashing animations)

## Output Format
Please provide your response in markdown format with clear sections for:
- Layout Structure Proposal (with ASCII diagrams or CSS grid/flexbox specifications)
- Detailed Spacing and Dimension Specifications
- Visual Hierarchy and Priority Guidelines
- Responsive Breakpoint Definitions
- Component-Specific Scaling Rules
- Motion and Interaction Specifications
- Accessibility Considerations
- Implementation Notes for Engineers