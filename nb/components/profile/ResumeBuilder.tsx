"use client";

import { useState } from "react";

interface ResumeBuilderProps {
  profile: any;
  skills: any[];
  experiences: any[];
  education: any[];
  certifications: any[];
  achievements: any[];
  publications: any[];
  languages: any[];
  volunteering: any[];
}

export default function ResumeBuilder({
  profile,
  skills,
  experiences,
  education,
  certifications,
  achievements,
  publications,
  languages,
  volunteering,
}: ResumeBuilderProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<"modern" | "classic" | "minimal">("modern");
  const [selectedSections, setSelectedSections] = useState({
    skills: true,
    experience: true,
    education: true,
    certifications: true,
    achievements: true,
    publications: false,
    languages: true,
    volunteering: false,
  });

  function generateResume() {
    // Create resume content
    const resumeContent = {
      profile,
      sections: {
        skills: selectedSections.skills ? skills : [],
        experiences: selectedSections.experience ? experiences : [],
        education: selectedSections.education ? education : [],
        certifications: selectedSections.certifications ? certifications : [],
        achievements: selectedSections.achievements ? achievements : [],
        publications: selectedSections.publications ? publications : [],
        languages: selectedSections.languages ? languages : [],
        volunteering: selectedSections.volunteering ? volunteering : [],
      },
      template: selectedTemplate,
    };

    return resumeContent;
  }

  function downloadAsHTML() {
    const content = generateResumeHTML();
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${profile.full_name || "resume"}_resume.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadAsJSON() {
    const data = generateResume();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${profile.full_name || "resume"}_data.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function generateResumeHTML() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${profile.full_name || "Resume"}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 850px; margin: 0 auto; padding: 40px 20px; background: #fff; }
    h1 { font-size: 32px; margin-bottom: 5px; color: #2563eb; }
    h2 { font-size: 20px; margin: 25px 0 15px; padding-bottom: 8px; border-bottom: 2px solid #2563eb; color: #2563eb; }
    h3 { font-size: 16px; margin-bottom: 5px; }
    .header { text-align: center; margin-bottom: 30px; }
    .headline { font-size: 18px; color: #666; margin-bottom: 10px; }
    .contact { font-size: 14px; color: #666; margin-top: 10px; }
    .contact span { margin: 0 10px; }
    .section { margin-bottom: 25px; }
    .item { margin-bottom: 20px; }
    .item-header { display: flex; justify-content: space-between; margin-bottom: 5px; }
    .item-title { font-weight: bold; }
    .item-subtitle { color: #666; font-size: 14px; }
    .item-date { color: #999; font-size: 14px; }
    .description { margin-top: 8px; font-size: 14px; color: #555; }
    .skills { display: flex; flex-wrap: wrap; gap: 8px; }
    .skill { background: #e0e7ff; padding: 6px 12px; border-radius: 15px; font-size: 13px; color: #2563eb; }
    .languages { display: flex; flex-wrap: wrap; gap: 15px; }
    .language { font-size: 14px; }
    .proficiency { color: #666; font-size: 13px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${profile.full_name || "Your Name"}</h1>
    ${profile.headline ? `<div class="headline">${profile.headline}</div>` : ""}
    <div class="contact">
      ${profile.location ? `<span>📍 ${profile.location}</span>` : ""}
      ${profile.website ? `<span>🌐 <a href="${profile.website}">${profile.website}</a></span>` : ""}
    </div>
  </div>

  ${profile.bio ? `
  <div class="section">
    <h2>About</h2>
    <p>${profile.bio.replace(/\n/g, "<br>")}</p>
  </div>
  ` : ""}

  ${selectedSections.skills && skills.length > 0 ? `
  <div class="section">
    <h2>Skills</h2>
    <div class="skills">
      ${skills.map((skill) => `<span class="skill">${skill.skill_name}${skill.proficiency_level ? ` (${skill.proficiency_level})` : ""}</span>`).join("")}
    </div>
  </div>
  ` : ""}

  ${selectedSections.experience && experiences.length > 0 ? `
  <div class="section">
    <h2>Experience</h2>
    ${experiences.map((exp) => `
      <div class="item">
        <div class="item-header">
          <div>
            <div class="item-title">${exp.title}</div>
            <div class="item-subtitle">${exp.company}</div>
          </div>
          <div class="item-date">
            ${new Date(exp.start_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })} - ${exp.current ? "Present" : exp.end_date ? new Date(exp.end_date).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : ""}
          </div>
        </div>
        ${exp.description ? `<div class="description">${exp.description}</div>` : ""}
      </div>
    `).join("")}
  </div>
  ` : ""}

  ${selectedSections.education && education.length > 0 ? `
  <div class="section">
    <h2>Education</h2>
    ${education.map((edu) => `
      <div class="item">
        <div class="item-header">
          <div>
            <div class="item-title">${edu.institution}</div>
            <div class="item-subtitle">${edu.degree}${edu.field_of_study ? `, ${edu.field_of_study}` : ""}</div>
          </div>
          ${edu.start_date ? `<div class="item-date">${new Date(edu.start_date).getFullYear()}${edu.end_date ? ` - ${new Date(edu.end_date).getFullYear()}` : ""}</div>` : ""}
        </div>
      </div>
    `).join("")}
  </div>
  ` : ""}

  ${selectedSections.certifications && certifications.length > 0 ? `
  <div class="section">
    <h2>Certifications</h2>
    ${certifications.map((cert) => `
      <div class="item">
        <div class="item-title">${cert.name}</div>
        <div class="item-subtitle">${cert.issuing_org}${cert.issue_date ? ` • ${new Date(cert.issue_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : ""}</div>
      </div>
    `).join("")}
  </div>
  ` : ""}

  ${selectedSections.achievements && achievements.length > 0 ? `
  <div class="section">
    <h2>Achievements & Awards</h2>
    ${achievements.map((achievement) => `
      <div class="item">
        <div class="item-title">${achievement.title}</div>
        <div class="item-subtitle">${achievement.issuer}${achievement.date_received ? ` • ${new Date(achievement.date_received).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : ""}</div>
        ${achievement.description ? `<div class="description">${achievement.description}</div>` : ""}
      </div>
    `).join("")}
  </div>
  ` : ""}

  ${selectedSections.publications && publications.length > 0 ? `
  <div class="section">
    <h2>Publications</h2>
    ${publications.map((pub) => `
      <div class="item">
        <div class="item-title">${pub.title}</div>
        ${pub.authors && pub.authors.length > 0 ? `<div class="item-subtitle">${pub.authors.join(", ")}</div>` : ""}
        ${pub.publisher ? `<div class="item-subtitle">${pub.publisher}${pub.publication_date ? ` • ${new Date(pub.publication_date).getFullYear()}` : ""}</div>` : ""}
        ${pub.description ? `<div class="description">${pub.description}</div>` : ""}
      </div>
    `).join("")}
  </div>
  ` : ""}

  ${selectedSections.languages && languages.length > 0 ? `
  <div class="section">
    <h2>Languages</h2>
    <div class="languages">
      ${languages.map((lang) => `<div class="language">${lang.language} <span class="proficiency">(${lang.proficiency})</span></div>`).join("")}
    </div>
  </div>
  ` : ""}

  ${selectedSections.volunteering && volunteering.length > 0 ? `
  <div class="section">
    <h2>Volunteering</h2>
    ${volunteering.map((vol) => `
      <div class="item">
        <div class="item-header">
          <div>
            <div class="item-title">${vol.role}</div>
            <div class="item-subtitle">${vol.organization}${vol.cause ? ` • ${vol.cause}` : ""}</div>
          </div>
          ${vol.start_date ? `<div class="item-date">${new Date(vol.start_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })} - ${vol.current ? "Present" : vol.end_date ? new Date(vol.end_date).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : ""}</div>` : ""}
        </div>
        ${vol.description ? `<div class="description">${vol.description}</div>` : ""}
      </div>
    `).join("")}
  </div>
  ` : ""}
</body>
</html>
    `;
  }

  function printResume() {
    const content = generateResumeHTML();
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  }

  return (
    <div className="rounded-xl bg-white dark:bg-zinc-900 border p-6">
      <h2 className="text-2xl font-bold mb-6">Resume Builder</h2>

      {/* Template Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Select Template</h3>
        <div className="grid grid-cols-3 gap-3">
          {["modern", "classic", "minimal"].map((template) => (
            <button
              key={template}
              onClick={() => setSelectedTemplate(template as any)}
              className={`p-4 border-2 rounded-lg text-center capitalize transition-colors ${
                selectedTemplate === template
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                  : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400"
              }`}
            >
              {template}
            </button>
          ))}
        </div>
      </div>

      {/* Section Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Include Sections</h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(selectedSections).map(([section, isSelected]) => (
            <label key={section} className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => setSelectedSections({ ...selectedSections, [section]: e.target.checked })}
                className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="capitalize">{section}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={printResume}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print / Save as PDF
        </button>

        <button
          onClick={downloadAsHTML}
          className="flex items-center gap-2 px-6 py-3 bg-zinc-600 text-white rounded-lg hover:bg-zinc-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download HTML
        </button>

        <button
          onClick={downloadAsJSON}
          className="flex items-center gap-2 px-6 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Export Data (JSON)
        </button>
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-sm text-blue-900 dark:text-blue-200">
          💡 <strong>Tip:</strong> After clicking "Print / Save as PDF", use your browser's print dialog to save as PDF.
          Choose "Save as PDF" as the printer destination for best results.
        </p>
      </div>
    </div>
  );
}

























