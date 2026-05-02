// server/utils/atsScoring.js
// Enhanced ATS scoring — keyword matching + section detection + formatting checks

// ─── SKILL DATABASE ────────────────────────────────────────────────────────────
const SKILL_DATABASE = {
    'Software Engineer': {
        required:     ['JavaScript', 'Python', 'Java', 'C++', 'Git', 'SQL', 'REST API', 'Data Structures'],
        nice_to_have: ['React', 'Node.js', 'Docker', 'Kubernetes', 'AWS', 'Agile', 'Scrum', 'CI/CD', 'TypeScript', 'System Design'],
        description:  'Core SDE roles at product companies and IT services firms.',
    },
    'Frontend Developer': {
        required:     ['HTML', 'CSS', 'JavaScript', 'React', 'Git', 'Responsive Design'],
        nice_to_have: ['TypeScript', 'Vue', 'Angular', 'Figma', 'Webpack', 'Next.js', 'TailwindCSS', 'REST API', 'Testing'],
        description:  'UI/UX focused engineering roles in web product teams.',
    },
    'Backend Developer': {
        required:     ['Node.js', 'Python', 'Java', 'SQL', 'REST API', 'Git', 'Database'],
        nice_to_have: ['Express', 'Django', 'Spring Boot', 'MongoDB', 'Redis', 'Docker', 'AWS', 'Microservices', 'GraphQL'],
        description:  'Server-side development, APIs, and database engineering.',
    },
    'Full Stack Developer': {
        required:     ['JavaScript', 'React', 'Node.js', 'SQL', 'Git', 'REST API', 'HTML', 'CSS'],
        nice_to_have: ['TypeScript', 'MongoDB', 'Docker', 'AWS', 'Next.js', 'GraphQL', 'Redis', 'Testing'],
        description:  'End-to-end web development across client and server layers.',
    },
    'Data Analyst': {
        required:     ['Python', 'SQL', 'Excel', 'Data Analysis', 'Statistics', 'Visualization'],
        nice_to_have: ['Tableau', 'Power BI', 'R', 'Machine Learning', 'Pandas', 'NumPy', 'Looker', 'ETL'],
        description:  'Business intelligence, reporting, and data-driven decision support.',
    },
    'Data Scientist': {
        required:     ['Python', 'Machine Learning', 'SQL', 'Statistics', 'Pandas', 'NumPy', 'TensorFlow'],
        nice_to_have: ['PyTorch', 'Scikit-learn', 'Deep Learning', 'NLP', 'Computer Vision', 'Spark', 'Keras', 'Feature Engineering'],
        description:  'Advanced ML modeling, research, and productionising AI systems.',
    },
    'DevOps Engineer': {
        required:     ['Docker', 'Kubernetes', 'CI/CD', 'Linux', 'Git', 'AWS', 'Bash'],
        nice_to_have: ['Terraform', 'Jenkins', 'Ansible', 'GCP', 'Azure', 'Prometheus', 'Grafana', 'Helm'],
        description:  'Infrastructure, automation, and reliability engineering.',
    },
    'Product Manager': {
        required:     ['Product Management', 'Strategy', 'Analytics', 'Roadmap', 'Stakeholder'],
        nice_to_have: ['Agile', 'Scrum', 'OKR', 'User Research', 'A/B Testing', 'Jira', 'SQL', 'Wireframing'],
        description:  'Product vision, feature prioritisation, and cross-functional leadership.',
    },
};

// ─── RESUME SECTION DETECTOR ──────────────────────────────────────────────────
// Checks for standard resume sections that ATS systems expect
const EXPECTED_SECTIONS = [
    { key: 'education',    patterns: ['education', 'academic', 'qualification', 'degree', 'university', 'college', 'b.tech', 'btech', 'be ', 'mba', 'msc', 'bsc'] },
    { key: 'experience',   patterns: ['experience', 'internship', 'work history', 'employment', 'intern', 'worked at', 'job'] },
    { key: 'skills',       patterns: ['skills', 'technical skills', 'technologies', 'proficiency', 'tech stack', 'tools'] },
    { key: 'projects',     patterns: ['projects', 'personal projects', 'academic projects', 'project work', 'built', 'developed'] },
    { key: 'achievements', patterns: ['achievement', 'award', 'certification', 'certificate', 'honour', 'honor', 'accomplishment', 'recognition'] },
    { key: 'contact',      patterns: ['email', 'phone', 'linkedin', 'github', 'contact', 'mobile', '@'] },
];

function detectSections(text) {
    const lower = text.toLowerCase();
    return EXPECTED_SECTIONS.map(section => ({
        name: section.key,
        found: section.patterns.some(p => lower.includes(p)),
    }));
}

// ─── FORMATTING / CONTENT CHECKS ─────────────────────────────────────────────
function runFormatChecks(text) {
    const lower = text.toLowerCase();
    const wordCount = text.trim().split(/\s+/).length;
    const checks = [
        { label: 'Sufficient length (150+ words)',    pass: wordCount >= 150 },
        { label: 'Contains measurable impact numbers', pass: /\d+%|\d+ years?|\d+ projects?|increased|reduced|improved|achieved/i.test(text) },
        { label: 'Email address present',              pass: /[\w.-]+@[\w.-]+\.\w+/.test(text) },
        { label: 'LinkedIn / GitHub URL present',      pass: /linkedin\.com|github\.com/i.test(text) },
        { label: 'No tables or graphics detected',     pass: wordCount > 80 }, // rough proxy — scanned PDFs have very few words
        { label: 'Action verbs used',                  pass: /\b(led|built|designed|implemented|developed|managed|delivered|optimised|created|improved|deployed|architected)\b/i.test(text) },
    ];
    return checks;
}

// ─── MAIN SCORING FUNCTION ────────────────────────────────────────────────────
/**
 * @param {string} resumeText
 * @param {string} jobRole
 * @returns {{
 *   score: number,
 *   breakdown: { keyword: number, section: number, format: number },
 *   foundKeywords: string[],
 *   missingKeywords: string[],
 *   bonusKeywords: string[],
 *   matchPercentage: string,
 *   sections: Array<{name:string, found:boolean}>,
 *   formatChecks: Array<{label:string, pass:boolean}>,
 *   wordCount: number,
 *   grade: string,
 *   recommendation: string,
 * }}
 */
export function calculateATSScore(resumeText, jobRole) {
    const skillSet = SKILL_DATABASE[jobRole] || SKILL_DATABASE['Software Engineer'];
    const upperText = resumeText.toUpperCase();

    // ── 1. Keyword scoring (60 pts) ──────────────────────────────────────────
    const requiredFound   = [];
    const requiredMissing = [];
    const bonusFound      = [];

    for (const skill of skillSet.required) {
        (upperText.includes(skill.toUpperCase()) ? requiredFound : requiredMissing).push(skill);
    }
    for (const skill of skillSet.nice_to_have) {
        if (upperText.includes(skill.toUpperCase())) bonusFound.push(skill);
    }

    const keywordScore = Math.round(
        (requiredFound.length / skillSet.required.length) * 50 +
        Math.min(10, bonusFound.length * 1.5)
    );

    // ── 2. Section completeness (25 pts) ─────────────────────────────────────
    const sections    = detectSections(resumeText);
    const foundSecs   = sections.filter(s => s.found).length;
    const sectionScore = Math.round((foundSecs / sections.length) * 25);

    // ── 3. Format / quality checks (15 pts) ──────────────────────────────────
    const formatChecks  = runFormatChecks(resumeText);
    const passedChecks  = formatChecks.filter(c => c.pass).length;
    const formatScore   = Math.round((passedChecks / formatChecks.length) * 15);

    // ── Final score ───────────────────────────────────────────────────────────
    const finalScore = Math.min(100, keywordScore + sectionScore + formatScore);

    const grade = finalScore >= 85 ? 'A'
                : finalScore >= 70 ? 'B'
                : finalScore >= 55 ? 'C'
                : finalScore >= 40 ? 'D'
                : 'F';

    const recommendation =
          finalScore >= 85 ? 'Excellent match! Your resume is well-optimised for this role. Apply with confidence.'
        : finalScore >= 70 ? 'Good match. A few tweaks to missing keywords could push you above 85%.'
        : finalScore >= 55 ? 'Moderate match. Add the missing required skills and strengthen your experience section.'
        : finalScore >= 40 ? 'Weak match. Significant keyword gaps. Consider tailoring your resume specifically for this role.'
        : 'Poor match. Your resume needs major restructuring to pass ATS filters for this role.';

    return {
        score: finalScore,
        breakdown: { keyword: keywordScore, section: sectionScore, format: formatScore },
        foundKeywords:   [...requiredFound, ...bonusFound],
        missingKeywords: requiredMissing,
        bonusKeywords:   bonusFound,
        matchPercentage: `${requiredFound.length}/${skillSet.required.length}`,
        sections,
        formatChecks,
        wordCount: resumeText.trim().split(/\s+/).length,
        grade,
        recommendation,
    };
}

export const AVAILABLE_ROLES = Object.keys(SKILL_DATABASE);
export const ROLE_DESCRIPTIONS = Object.fromEntries(
    Object.entries(SKILL_DATABASE).map(([k, v]) => [k, v.description])
);
