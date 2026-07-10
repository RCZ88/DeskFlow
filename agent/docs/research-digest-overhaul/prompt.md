## Raw Request (user verbatim)

```
i think we do need to improve the research digest system. The current research digest systems is really about the innocence of the UI and the UX because I mean UX is fine But it's also kind of not fine because why is it discussing it per keyword? Why is it not There's too many drop downs, right because currently if I've heard too if I were to List a bunch of stuff on like the topics, but I've only got two topics But they're they're all kind of long, but it resulted in the sort of long List of keywords that it's top again, and the text is just not gonna Convincing there's not it's just text and there's not like actual images or You know those stuff that is actually convincing for a use actually And then there's like no source whatsoever and there's no date on where they and and and then use itself It's not interesting and it's just plain text and I feel like that's just a really bad design for something off a Use scale of something like a terminal if you're thinking of thinking of the for example the new book terminal There's way more than that, right? There's more user more things to read and there's more up to date and there's more accuracy and there's more Credibility into the you are and I feel like that's something that's really missing from our End of the processing and the system that we have So I need you to improve I would like you to use generate problems go to ask the AI to do some research on what are things that we can improve on the system And what are the features that can be implemented to further make it more credible make it more Less we are make it more like it is a use and not just plain text right there needs to be for example I like the numbers or percentage and it's not Don't make everything just like it Text rate we need to mean some Numerate data is right something that's actually like data data oriented
```

## Problem Statement

The Research Digest system generates AI-curated topic summaries but presents them as plain text in collapsible keyword cards. The UI lacks credibility markers (dates, sources, authority), numerical data (percentages, stats, trends), visual interest (images, charts), and any sense of authority or timeliness. The result feels unconvincing and unengaging compared to modern digests like The Browser newsletter.

The data type (`TopicDigestItem`) has already been expanded to support rich fields (`headline`, `date`, `confidence`, `source` with authority, `stats` with trends, `tags`, `mentions`), and the AI prompts have been updated to request this richer data. **The UI components and data flow now need to be redesigned to utilize these fields.**

## Context

Read `agent/docs/research-digest-overhaul/CONTEXT_BUNDLE.md` for the complete architecture reference including all code, IPC endpoints, DB schema, design tokens, and current UI issues.

## The Mandate

Design and implement a complete overhaul of the Research Digest UI system. You are the Lead Designer and Engineer — produce a single, complete solution for ALL of the following.

### Engineering Task

**1. DailyDigestBoard.tsx — News-Style Card Layout:**

Rewrite the `TopicCard` inline component and the outer shell. Each card must render:

- **Metadata bar**: date badge + confidence meter (progress bar visual) + tag pill (color-coded by category)
- **Headline**: bold, prominent headline (not just topic name) — use `item.headline ?? item.topic`
- **Summary**: 2-3 paragraph summary with inline data points highlighted
- **Stats block** (if `item.stats` exists): label + value + trend arrow (▲/▼/―) + percentage change — use existing `dk-trend` CSS classes
- **Source attribution**: source name + authority badge (high=green dot, medium=yellow, low=gray) + source link — use `item.source`, fall back to `item.sources[]`
- **Tag pills**: color-coded pills for each tag in `item.tags`
- **No default collapse**: info visible at-a-glance. Only use expand/collapse for the full source list (not summary)

**2. StateShell States:**

- **Loading**: 3 skeleton cards shaped like the new news cards (not current skeleton)
- **Empty (readyToGenerate)**: "Ready to generate today's digest" with Generate CTA
- **Empty (no topics)**: "No topics configured" with Add Topics CTA
- **Error**: error message with retry
- **Ready**: news-style card grid

**3. DigestTopicCard.tsx — Chat Renderer Update:**

Match the news-style card design but compact for chat context:
- Headline + date + confidence in badge row
- Short summary
- Stats inline if present
- Source as clickable button(s)

**4. AiPage.tsx — Potential Subpage:**

Evaluate whether the digest should become its own sub-tab/subpage within the AI page (separate from the chat deck). If the digest cards are sufficiently feature-rich, splitting into a dedicated tab could improve UX. If you decide yes, provide the routing/sub-navigation design.

### Design Task

1. **News-style card**: Use the existing `dk-card` + `dk-acc` accent bar pattern as the base
2. **Typography**: Headline 14px bold, summary 13px, metadata 11px mono, stats 21px bold
3. **Confidence meter**: A horizontal progress bar (using existing `dk-ring` or new approach) colored green/yellow/red based on score
4. **Trend arrows**: Use existing `dk-trend.dk-up` (green), `dk-trend.dk-dn` (red), CSS classes
5. **Authority badges**: Green dot for high, amber for medium, gray for low — small inline indicators
6. **Tag pills**: Use existing `dk-tag` pattern with colors: breaking=red, analysis=violet, trending=amber, update=cyan, milestone=emerald
7. **Spacing**: Cards separated by 12px, padding 16px inside, consistent with `dk-sec` pattern
8. **Subpage consideration**: If splitting into own subpage, design the tab/nav UI

### UX Task

1. **At-a-glance reading**: User should grasp the key info (headline, date, confidence, key stat) without any interaction
2. **Progressive disclosure**: Stats and source details visible without click; full source list expandable if >3 items
3. **Credibility signals**: Date recency (today=green "Today", this week=amber "3d ago", older=gray date), confidence score bar, source authority dots — all visible on the card face
4. **Data emphasis**: Numerical values (stats.value) are the largest text on the card after headline — bigger than summary text
5. **Terminal/news aesthetic**: Clean, monospace metadata, data-dense but scannable layout

## Constraints

- All new fields are optional — cards must gracefully render old cached data that only has `topic` + `summary`
- Must use existing design token system (CSS variables, `dk-` classes)
- No new external dependencies
- Must preserve all existing IPC endpoints and data flow
- The `StateShell` component must still be used for the 4-state pattern
- The `GlassCard` + `SectionHead` header treatment should be preserved

## Output Format

Provide:
1. Complete `DailyDigestBoard.tsx` rewrite (full file)
2. Complete `DigestTopicCard.tsx` rewrite (full file)  
3. CSS additions needed (if any beyond existing `dk-` classes)
4. Subpage evaluation: yes/no with justification and design if yes
5. Backward compatibility note: how old cached data renders

## Session Metadata
- Title: Research Digest Overhaul — Data-Driven News-Style Presentation
- Description: Design and implement a complete overhaul of the Research Digest UI with news-style cards, credibility markers, numerical data, and visual hierarchy
- Status: active
- Product Area: AI Page (Digest)
- Category: feature
