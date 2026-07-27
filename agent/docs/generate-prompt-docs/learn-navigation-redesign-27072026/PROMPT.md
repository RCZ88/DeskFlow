## Raw Request

> i think on the leanr page, the entirerity of hte content of the home larn page is like places too low. it should be placed a little bit higher to maintian the center, also can we make so that the features are lke showcased on the home page or something? like below the homepage, so lcicking the button should direct it to that part of the page. so it doesnt need to be in a seperate page. its also weird the fact that If I want to go to the homepage, I click on the Explorer features the button that goes back is the back-to-library and then on the library There's no way for me to go back to the future showcase. It's just stupid and like it's weird It's why why is it like that and like I feel like I don't want to show the homepage It looks good, but the navigations and the thing is just quite messy and some scenarios Like the progress, why is everything needed to be on the own separate page kind of be like A way where we can transition where we can instill see the libraries and we can switch where like for example I'm using the arrows button or like I'm something where we can actually Show where we are and stuff like that the navigations on the library is kind of a mess So what I would like you to do is to Generate a prompt to the navigation and the pages I really like the design of the pages, but the fact is that it's like very hard and very confusing Very unprofessional way to navigate through the pages. It's very like I need a better way of navigating through the pages For example take it and I don't know I just need to prompt to be exploring and like giving the best solution To have the navigation and like Alternating through the pages and having everything Probably something combined to one another and like there's none it's to be having those much patient pages all separated to one another From one another right for example the progress thing is why is it go you need to be on a different thing when the learning dashboard Already had already shows that what why don't you put the progress on the Library itself because we already have the ones on the library, right? Why don't you why is there a duplicate progress page? You know why is it they've got to be in a separate thing in this for example active repraw study more cards the reviewed cards and stuff like that Yeah, basically I would like you to use the Internet prompt to go to revamp the way of an navigation and how the pages ranged and the contents are arranged The static contents and stuff like that

## Problem Statement

The Lyceum Learn module (`/learn` route) has 8 separate views managed by a `useState<View>` state machine in `LearnPage.tsx`. The navigation is broken in multiple ways:

1. **Home page content sits too low.** The `WelcomeEmptyState` centers vertically but the hero feels下沉 because quick-action cards are absolutely positioned at viewport bottom.

2. **Feature Showcase is a dead-end page.** Clicking "Explore all features" navigates to a standalone `showcase` view. From there, the only back path is "Back to Library" — there's no way to return to the home page. From Library, there's also no path back to showcase.

3. **Navigation is inconsistent across views.** The nav header (Home, Curriculum, Profile, Ideas, Progress, Study, How it works) only appears on `library` and `showcase` views. On `reader`, `intents`, `progress`, and `study`, users see only "Back to Library" with no other navigation. The `welcome` view has zero navigation at all.

4. **Progress page duplicates Library content.** The Library already shows `MasteryStrip` and `TutorDashboardSection`. The Progress page shows a heatmap + stat cards + most-studied. This is redundant — users shouldn't need a separate page for data already visible in the library.

5. **Too many separate full-page views.** 8 views for what could be 4-5 logical groupings. Several views (intents, import, progress) could be modals or inline sections.

6. **No breadcrumb or location indicator.** Users have no persistent visual cue showing which view they're in.

7. **`onWelcome` bug.** The Library's "Welcome" button is wired to `setView('showcase')` instead of `setView('welcome')` (LearnPage.tsx line 646).

## Context

Read `agent/docs/learn-navigation-redesign/CONTEXT_BUNDLE.md` for the complete code reference including:
- View state machine and rendering logic (LearnPage.tsx lines 458-755)
- WelcomeEmptyState layout and positioning (WelcomeEmptyState.tsx)
- FeatureShowcase standalone page structure (FeatureShowcase.tsx)
- ProgressDashboard content and IPC calls (ProgressDashboard.tsx)
- LessonLibrary existing analytics sections (LessonLibrary.tsx)
- IntentLibrary structure (IntentLibrary.tsx)
- Navigation flow and bugs
- Design tokens and shared components

## Engineering Task

Design a comprehensive navigation and page architecture overhaul for the Learn module that:

1. **Reduces views from 8 to ~5** by merging redundant views:
   - Merge `showcase` into the home page as a scrollable section
   - Merge `progress` analytics (heatmap, streak, most-studied) into the Library view as a collapsible section
   - Convert `intents` to a modal/slide-in panel accessible from the compose flow
   - Convert `import` to a modal overlay (it already functions like one)

2. **Fixes the home page vertical positioning.** The hero content should sit at optical center (~40% from top), not dead center. Quick-action cards should flow naturally below the hero, not be pinned to viewport bottom with `absolute bottom-0`.

3. **Adds a persistent breadcrumb navigation** that shows the full path: `Home > Library > [Lesson Name] > Study`. Always visible, always accurate. Clickable segments for back-navigation.

4. **Adds a persistent tab bar** with active-view highlighting. Tabs: Home, Library, Study. Profile and How-it-works as utility buttons. Ideas accessible from compose dialog.

5. **Fixes all navigation dead-ends.** Every view must have a clear path back to Home and to Library. No more orphaned views.

6. **Adds smooth Framer Motion transitions** between views (slide left for forward navigation, slide right for back, fade for modals).

7. **Fixes the `onWelcome` bug** on line 646 of LearnPage.tsx.

## Design Task

Produce high-fidelity visual specs for:

1. **The persistent navigation bar.** Exact layout, spacing, colors, active states, breadcrumb rendering. Must use existing design tokens (clay, sage, amber, zinc, serif/mono fonts, glass patterns).

2. **The home page with embedded features section.** How the hero sits at optical center, how the features section is laid out below the fold, how the "Explore all features" scroll-to-section works.

3. **The Library view with inline analytics.** How the collapsible analytics section integrates with the existing MasteryStrip and TutorDashboardSection. Exact spacing, collapse/expand animation.

4. **View transitions.** Framer Motion variants for forward/back navigation between views. Shared layout animations for elements that persist across views (e.g., book cards morphing into reader header).

5. **The breadcrumb component.** Visual design, hover states, truncation behavior for long lesson titles, mobile responsive behavior.

## UX Task

Define the complete interaction flow:

1. **First visit:** User lands on Home → sees hero + CTA → can scroll down to features or click "Compose a lesson"
2. **Browsing library:** User clicks Library tab → sees lessons + inline analytics → can toggle covers/spines → clicks a lesson → slides to Reader
3. **Reading a lesson:** Reader view with breadcrumb `Home > Library > [Title]` → can jump to Study from breadcrumb or tab bar
4. **Study session:** Study view with breadcrumb `Home > Library > [Title] > Study` → back navigates to Reader
5. **Compose flow:** Click Compose → CreateLessonDialog modal opens (not a full page) → can access saved Ideas from within the dialog
6. **Import flow:** Click Import → modal overlay opens → not a full page navigation
7. **Profile access:** Profile button → LearnerProfilePanel slides in from right (already works this way)

## Constraints

- Preserve ALL existing functionality — no features removed, only reorganized
- Preserve the existing design language (glass cards, serif headings, clay/sage/amber accents, monospace labels)
- Preserve keyboard shortcuts (j/k nav, Space flip, 1-4 rate, ? shortcuts)
- Preserve the ReaderView internal architecture (it's the most complex and well-designed part)
- Preserve the CreateLessonDialog 3-step flow (it works well as a modal)
- No new dependencies — use existing framer-motion, lucide-react, tailwind
- All changes are in `src/components/learn/` and `src/components/showcase/`
- The `data-page="learn"` attribute must remain on the root element
- IPC backend is already complete — no backend changes needed
