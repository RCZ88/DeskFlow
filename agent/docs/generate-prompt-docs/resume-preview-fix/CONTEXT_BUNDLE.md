# CONTEXT_BUNDLE.md — Resume Preview Fix

## User's Raw Request (Verbatim)

"also, the preview is not really that convincing at all. it doesnt have that like resume style formality and like the fonts and like the paper, and everything about it is like not working showing properly with the proper style and stuff. how about the lines and everything? and like how does it handles lines and like other formattings and proper formatting and like the tabs and indents. i need you to generate prompt"

---

## Current ResumePreview.tsx (Full Source — 137 lines)

```tsx
// src/features/resume/components/ResumePreview.tsx
import type { ResumeContent } from '../../../types/resume';

interface ResumePreviewProps {
  content: ResumeContent;
  mode?: 'styled' | 'ats_raw' | 'heatmap';
  scale?: number;
}

export function ResumePreview({ content, mode = 'styled', scale = 65 }: ResumePreviewProps) {
  if (mode === 'ats_raw') {
    return (
      <div className="bg-white p-10 rounded-lg shadow-lg overflow-auto" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', lineHeight: 1.4 }}>
        <div className="text-black whitespace-pre-wrap text-sm">
          {content.profile?.fullName || 'Your Name'}
          {'\n'}{content.profile?.email || ''} | {content.profile?.phone || ''} | {content.profile?.location || ''}
          {'\n'}{content.profile?.linkedinUrl || ''}
          {'\n\n'}PROFESSIONAL SUMMARY
          {'\n'}{content.summary || 'No summary yet.'}
          {'\n\n'}TECHNICAL SKILLS
          {'\n'}{content.skills?.map(s => `${s.category}: ${s.items.join(', ')}`).join('\n') || 'No skills yet.'}
          {'\n\n'}PROFESSIONAL EXPERIENCE
          {'\n'}{content.experience?.map(e => `${e.roleTitle} | ${e.company} | ${e.startDate} - ${e.isCurrent ? 'Present' : e.endDate}\n${e.bullets?.map(b => `• ${b.text}`).join('\n') || ''}`).join('\n\n') || 'No experience yet.'}
          {'\n\n'}PROJECTS
          {'\n'}{content.projects?.map(p => `${p.projectName}\n${p.description}\nTech: ${p.techStack?.join(', ') || ''}`).join('\n\n') || 'No projects yet.'}
          {'\n\n'}EDUCATION
          {'\n'}{content.education?.map(e => `${e.degree} in ${e.fieldOfStudy} | ${e.institution} | ${e.graduationDate}`).join('\n') || 'No education yet.'}
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white text-slate-900 p-10 rounded-lg shadow-lg overflow-auto"
      style={{
        fontFamily: "'Arial', 'Helvetica', sans-serif",
        fontSize: '11pt',
        lineHeight: 1.4,
        transform: `scale(${scale / 100})`,
        transformOrigin: 'top left',
        width: '8.5in',
        minHeight: '11in',
      }}
    >
      {/* Name */}
      <h1 style={{ fontSize: '20pt', fontWeight: 'bold', marginBottom: '4px', color: '#1a1a2e' }}>
        {content.profile?.fullName || 'Your Name'}
      </h1>

      {/* Contact */}
      <p style={{ fontSize: '10pt', color: '#333', marginBottom: '12px' }}>
        {[content.profile?.location, content.profile?.phone, content.profile?.email, content.profile?.linkedinUrl].filter(Boolean).join(' | ')}
      </p>

      {/* Summary */}
      {content.summary && (
        <>
          <h2 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px', marginTop: '12px' }}>
            PROFESSIONAL SUMMARY
          </h2>
          <p style={{ marginTop: '6px' }}>{content.summary}</p>
        </>
      )}

      {/* Skills */}
      {content.skills && content.skills.length > 0 && (
        <>
          <h2 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px', marginTop: '12px' }}>
            TECHNICAL SKILLS
          </h2>
          {content.skills.map((cat, i) => (
            <p key={i} style={{ marginTop: '4px' }}>
              <strong>{cat.category}:</strong> {cat.items.join(', ')}
            </p>
          ))}
        </>
      )}

      {/* Experience */}
      {content.experience && content.experience.length > 0 && (
        <>
          <h2 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px', marginTop: '12px' }}>
            PROFESSIONAL EXPERIENCE
          </h2>
          {content.experience.map((job) => (
            <div key={job.id} style={{ marginBottom: '10px' }}>
              <p style={{ fontWeight: 'bold' }}>
                {job.roleTitle} | {job.company} | {job.location} | {job.startDate} - {job.isCurrent ? 'Present' : job.endDate}
              </p>
              <ul style={{ paddingLeft: '20px', marginTop: '2px' }}>
                {job.bullets?.map((bullet, i) => (
                  <li key={i}>{bullet.text}</li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}

      {/* Projects */}
      {content.projects && content.projects.length > 0 && (
        <>
          <h2 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px', marginTop: '12px' }}>
            PROJECTS
          </h2>
          {content.projects.map((proj) => (
            <div key={proj.id} style={{ marginBottom: '8px' }}>
              <p style={{ fontWeight: 'bold' }}>{proj.projectName}</p>
              <p>{proj.description}</p>
              {proj.techStack && proj.techStack.length > 0 && (
                <p style={{ fontStyle: 'italic', fontSize: '10pt' }}>Tech: {proj.techStack.join(', ')}</p>
              )}
            </div>
          ))}
        </>
      )}

      {/* Education */}
      {content.education && content.education.length > 0 && (
        <>
          <h2 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px', marginTop: '12px' }}>
            EDUCATION
          </h2>
          {content.education.map((edu) => (
            <div key={edu.id} style={{ marginBottom: '6px' }}>
              <p style={{ fontWeight: 'bold' }}>
                {edu.degree} in {edu.fieldOfStudy}
              </p>
              <p>{edu.institution} | {edu.graduationDate}</p>
              {edu.includeGpa && edu.gpa && <p>GPA: {edu.gpa}</p>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
```

---

## Current Problems

1. **Font:** Uses `Arial, Helvetica, sans-serif` — looks generic, not like a real resume
2. **Section lines:** `borderBottom: '1px solid #000'` — too thick, too dark, looks like a box
3. **Spacing:** Inconsistent margins between sections
4. **Contact line:** Uses `|` separator — looks like code, not a resume
5. **Experience header:** `roleTitle | company | location | dates` — pipes look like CSV, not formatted resume
6. **Bullets:** No proper bullet character, no indentation, no spacing between bullets
7. **Skills:** Just `Category: item, item, item` — no visual structure
8. **Education:** Missing proper formatting (no GPA styling, no date alignment)
9. **Overall:** Looks like a text dump, not a professionally formatted resume

---

## What a Real Resume Looks Like (Reference)

### Header
```
                            JOHN DOE
     San Francisco, CA | (555) 123-4567 | john@email.com | linkedin.com/in/johndoe
```
- Name: centered, large, bold, dark navy (#1a1a2e)
- Contact: centered, smaller, separated by bullets (•) not pipes
- Thin horizontal line below contact

### Section Headers
```
PROFESSIONAL EXPERIENCE
────────────────────────────────────────────────────────
```
- ALL CAPS, bold, 11pt
- Thin line below (0.5pt, gray #666, NOT black)
- Consistent spacing: 12pt above, 6pt below

### Experience Entry
```
Senior Software Engineer                           Jan 2022 – Present
Tech Company Inc. | San Francisco, CA
────────────────────────────────────────────────────────
• Architected microservices migration reducing latency by 42%
• Led team of 5 engineers to deliver $2M project on schedule
• Implemented CI/CD pipeline cutting deployment time from 2hrs to 15min
```
- Role: left-aligned, bold
- Dates: right-aligned on same line as role
- Company: italic or regular, with location
- Thin line separator (optional)
- Bullets: proper `•` character, 6pt spacing between them

### Skills
```
TECHNICAL SKILLS
────────────────────────────────────────────────────────
Languages:     TypeScript, Python, Go, Rust
Frameworks:     React, Next.js, Node.js, Django
Infrastructure: AWS, Docker, Kubernetes, Terraform
```
- Category labels: bold or semi-bold, left-aligned
- Items: separated by commas, proper indentation
- Two-column layout possible for skills

---

## Design System Context

```
Resume preview uses INLINE STYLES (not Tailwind) because it simulates
actual resume formatting. The container uses Tailwind for positioning,
but inner content uses raw CSS to match what an ATS would see.

Key constraints:
- Must use ATS-safe fonts (Arial, Calibri, Times New Roman)
- Single column layout (ATS requirement)
- No tables, graphics, or text boxes
- Font size: 10.5-11pt body, 14-16pt name, 11-12pt headers
- Line spacing: 1.15-1.3 for body, 1.0 for headers
- Margins: 0.5in-1in all sides
- White background, black/dark text
```
