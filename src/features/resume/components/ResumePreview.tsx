import type { ResumeContent } from '../../../types/resume';
import type { CSSProperties } from 'react';

interface ResumePreviewProps {
  content: ResumeContent;
  mode?: 'styled' | 'ats_raw' | 'heatmap';
  scale?: number;
  loading?: boolean;
}

export function ResumePreview({ content, mode = 'styled', scale = 65, loading = false }: ResumePreviewProps) {
  // ATS Raw Mode
  if (mode === 'ats_raw') {
    return (
      <div className="bg-white p-10 rounded-lg shadow-lg overflow-auto" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', lineHeight: 1.4 }}>
        <div className="text-slate-900 whitespace-pre-wrap text-sm">
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

  // STYLED MODE — Professional Resume Layout
  const pageStyle: CSSProperties = {
    background: '#ffffff',
    padding: '0.75in',
    width: '8.5in',
    minHeight: '11in',
    fontFamily: 'Arial, Helvetica Neue, sans-serif',
    fontSize: '10.5pt',
    lineHeight: '1.3',
    color: '#333333',
    boxSizing: 'border-box',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
    transform: `scale(${scale / 100})`,
    transformOrigin: 'top left',
  };

  const sectionHeaderStyle: CSSProperties = {
    fontSize: '11pt',
    fontWeight: 700,
    color: '#1a1a2e',
    textTransform: 'uppercase',
    letterSpacing: '1pt',
    borderBottom: '0.5pt solid #999999',
    paddingBottom: '3pt',
    marginTop: '14pt',
    marginBottom: '6pt',
  };

  const bulletStyle: CSSProperties = {
    position: 'relative',
    paddingLeft: '18pt',
    marginTop: '3pt',
    lineHeight: '1.3',
  };

  // Data checks
  const hasSummary = content.summary && content.summary.trim().length > 0;
  const hasSkills = content.skills && content.skills.length > 0;
  const hasExperience = content.experience && content.experience.length > 0;
  const hasProjects = content.projects && content.projects.length > 0;
  const hasEducation = content.education && content.education.length > 0;
  const hasAnyContent = hasSummary || hasSkills || hasExperience || hasProjects || hasEducation;
  const hasName = content.profile?.fullName && content.profile.fullName.trim().length > 0;

  const contactItems = [
    content.profile?.location,
    content.profile?.phone,
    content.profile?.email,
    content.profile?.linkedinUrl
  ].filter(Boolean);

  // LOADING STATE (Skeleton)
  if (loading) {
    const skeletonBox = (width: string, height: string, mb: string, ml: string = '0'): CSSProperties => ({
      width,
      height,
      marginBottom: mb,
      marginLeft: ml,
      background: '#e5e7eb',
      borderRadius: '4px',
    });

    return (
      <div style={pageStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12pt' }}>
          <div style={skeletonBox('40%', '20pt', '0')} className="animate-pulse" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16pt' }}>
          <div style={skeletonBox('60%', '10pt', '0')} className="animate-pulse" />
        </div>
        <div style={skeletonBox('30%', '12pt', '8pt')} className="animate-pulse" />
        <div style={skeletonBox('100%', '8pt', '4pt')} className="animate-pulse" />
        <div style={skeletonBox('100%', '8pt', '4pt')} className="animate-pulse" />
        <div style={skeletonBox('80%', '8pt', '24pt')} className="animate-pulse" />
        <div style={skeletonBox('30%', '12pt', '12pt')} className="animate-pulse" />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6pt' }}>
          <div style={skeletonBox('40%', '10pt', '0')} className="animate-pulse" />
          <div style={skeletonBox('15%', '10pt', '0')} className="animate-pulse" />
        </div>
        <div style={skeletonBox('30%', '8pt', '12pt')} className="animate-pulse" />
        <div style={skeletonBox('90%', '8pt', '4pt', '18pt')} className="animate-pulse" />
        <div style={skeletonBox('95%', '8pt', '4pt', '18pt')} className="animate-pulse" />
        <div style={skeletonBox('85%', '8pt', '24pt', '18pt')} className="animate-pulse" />
        <div style={skeletonBox('30%', '12pt', '12pt')} className="animate-pulse" />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6pt' }}>
          <div style={skeletonBox('35%', '10pt', '0')} className="animate-pulse" />
          <div style={skeletonBox('15%', '10pt', '0')} className="animate-pulse" />
        </div>
        <div style={skeletonBox('25%', '8pt', '12pt')} className="animate-pulse" />
        <div style={skeletonBox('90%', '8pt', '4pt', '18pt')} className="animate-pulse" />
        <div style={skeletonBox('80%', '8pt', '24pt', '18pt')} className="animate-pulse" />
        <div style={skeletonBox('20%', '12pt', '12pt')} className="animate-pulse" />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6pt' }}>
          <div style={skeletonBox('45%', '10pt', '0')} className="animate-pulse" />
          <div style={skeletonBox('10%', '10pt', '0')} className="animate-pulse" />
        </div>
        <div style={skeletonBox('35%', '8pt', '0')} className="animate-pulse" />
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {/* Name */}
      {hasName && (
        <h1 style={{
          fontSize: '18pt',
          fontWeight: 700,
          color: '#1a1a2e',
          textAlign: 'center',
          marginBottom: '4pt',
          letterSpacing: '0.5pt',
          marginTop: 0,
        }}>
          {content.profile?.fullName}
        </h1>
      )}

      {/* Contact Info */}
      {contactItems.length > 0 && (
        <p style={{
          fontSize: '9.5pt',
          color: '#555555',
          textAlign: 'center',
          marginBottom: '10pt',
        }}>
          {contactItems.join(' • ')}
        </p>
      )}

      {/* Empty States */}
      {!hasAnyContent && !hasName && (
        <div style={{ textAlign: 'center', marginTop: '40pt', color: '#888', fontSize: '10.5pt' }}>
          Start filling in your resume to see a preview
        </div>
      )}
      {!hasAnyContent && hasName && (
        <div style={{ textAlign: 'center', marginTop: '40pt', color: '#888', fontSize: '10.5pt' }}>
          Complete the builder to see your full resume
        </div>
      )}

      {/* Summary */}
      {hasSummary && (
        <section>
          <h2 style={sectionHeaderStyle}>Professional Summary</h2>
          <p style={{ margin: 0 }}>{content.summary}</p>
        </section>
      )}

      {/* Skills */}
      {hasSkills && (
        <section>
          <h2 style={sectionHeaderStyle}>Technical Skills</h2>
          {content.skills.map((cat, i) => (
            <div key={i} style={{ marginTop: '3pt' }}>
              <span style={{ display: 'inline-block', fontWeight: 600, color: '#1a1a2e', marginRight: '6pt' }}>
                {cat.category}:
              </span>
              <span style={{ color: '#444' }}>
                {cat.items.join(', ')}
              </span>
            </div>
          ))}
        </section>
      )}

      {/* Experience */}
      {hasExperience && (
        <section>
          <h2 style={sectionHeaderStyle}>Professional Experience</h2>
          {content.experience.map((job) => (
            <div key={job.id} style={{ marginBottom: '12pt' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '10.5pt', fontWeight: 700, color: '#1a1a2e' }}>
                  {job.roleTitle}
                </span>
                <span style={{ fontSize: '10pt', color: '#555' }}>
                  {job.startDate} – {job.isCurrent ? 'Present' : job.endDate}
                </span>
              </div>
              <div style={{ fontSize: '10.5pt', fontStyle: 'italic', color: '#444', marginBottom: '4pt' }}>
                {job.company}
                {job.location ? ` | ${job.location}` : ''}
              </div>
              <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                {job.bullets?.map((bullet, i) => (
                  <li key={i} style={bulletStyle}>
                    <span style={{ position: 'absolute', left: '6pt', color: '#333' }}>•</span>
                    {bullet.text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* Projects */}
      {hasProjects && (
        <section>
          <h2 style={sectionHeaderStyle}>Projects</h2>
          {content.projects.map((proj) => (
            <div key={proj.id} style={{ marginBottom: '10pt' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '10.5pt', fontWeight: 700, color: '#1a1a2e' }}>
                  {proj.projectName}
                </span>
              </div>
              <p style={{ margin: '2pt 0', color: '#333' }}>{proj.description}</p>
              {proj.techStack && proj.techStack.length > 0 && (
                <p style={{ fontSize: '9.5pt', fontStyle: 'italic', color: '#555', margin: 0 }}>
                  Tech: {proj.techStack.join(', ')}
                </p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Education */}
      {hasEducation && (
        <section>
          <h2 style={sectionHeaderStyle}>Education</h2>
          {content.education.map((edu) => (
            <div key={edu.id} style={{ marginBottom: '8pt' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '10.5pt', fontWeight: 700, color: '#1a1a2e' }}>
                  {edu.degree} in {edu.fieldOfStudy}
                </span>
                <span style={{ fontSize: '10pt', color: '#555' }}>
                  {edu.graduationDate}
                </span>
              </div>
              <div style={{ fontSize: '10.5pt', fontStyle: 'italic', color: '#444' }}>
                {edu.institution}
                {edu.includeGpa && edu.gpa ? ` | GPA: ${edu.gpa}` : ''}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
