export interface GuideStep {
  title: string;
  description: string;
  tips?: string[];
  badge?: string;
}

export interface ProductGuide {
  id: string;
  title: string;
  category: 'Applicant' | 'Officer' | 'Platform' | 'Governance';
  summary: string;
  readTime: string;
  iconName: string;
  badge: string;
  sections: Array<{
    heading: string;
    content: string;
    steps?: GuideStep[];
    importantNotice?: string;
  }>;
}

export const PRODUCT_GUIDES: ProductGuide[] = [
  {
    id: 'individual-validation',
    title: 'Individual Application Pre-Validation Guide',
    category: 'Applicant',
    summary:
      'Step-by-step instructions for selecting government application schemes, answering conditional questions, uploading proofs, running automated pre-validation, and resolving document gaps.',
    readTime: '4 min read',
    iconName: 'FileCheck2',
    badge: 'Applicant Workflow',
    sections: [
      {
        heading: '1. Selecting an Application Profile',
        content:
          'Begin by navigating to the Government Applications Catalogue or Pre-Validation Dashboard. Select from verified statutory profiles such as SPICe+ (INC-32) Company Incorporation, GST REG-01 Registration, or Passport Form 1. Each profile references official government statutory rules and guidelines.',
        steps: [
          {
            title: 'Browse Available Schemes',
            description:
              'Filter by authority (MCA, CBIC, MEA) or application category. Check the verification badge on each profile before selecting.',
            badge: 'Step 1',
          },
          {
            title: 'Check Lifecycle Status',
            description:
              'Only application types marked "Published" are active for pre-validation. Profiles labeled "Under Review" cannot be processed until officially verified.',
            badge: 'Step 2',
          },
        ],
      },
      {
        heading: '2. Answering Dynamic Situational Questions',
        content:
          'Official application requirements depend heavily on applicant situation. TypeNull prompts conditional questions to tailor your required document checklist dynamically.',
        steps: [
          {
            title: 'Premise / Rental Status',
            description:
              'For company incorporation or GST, answering "Rented" dynamically adds Registered Lease Agreement and Owner NOC to your mandatory checklist.',
            badge: 'Dynamic Rule',
          },
          {
            title: 'Corporate Promoter Participation',
            description:
              'Indicating a corporate shareholder dynamically activates the Board Resolution requirement for authorised signatories.',
            badge: 'Dynamic Rule',
          },
        ],
      },
      {
        heading: '3. Uploading Supporting Evidence',
        content:
          'Upload digital proofs in PDF, JPEG, or PNG format. Ensure scans are clear, high-contrast, and oriented correctly. The client-side OCR engine parses vector PDF text directly or uses WebAssembly Tesseract.js for scanned raster images.',
        importantNotice:
          'Accepted file limit is 10 MB per document. Unreadable or corrupted files will prevent the engine from extracting key statutory identifiers.',
      },
      {
        heading: '4. Running Pre-Validation & Interpreting Results',
        content:
          'Execute the validation engine to compare uploaded documents and metadata against Knowledge Base statutory rules. The engine produces categorized findings with specific statutory citations.',
        steps: [
          {
            title: 'Review Categorized Findings',
            description:
              'Inspect findings grouped by Missing Documents, Missing Fields, Cross-Document Discrepancies, and Document Readability.',
            badge: 'Inspection',
          },
          {
            title: 'Correct Discrepancies & Revalidate',
            description:
              'Upload missing files or correct mismatched field values. Revalidating refreshes the outcome badge and removes stale result flags.',
            badge: 'Resolution',
          },
        ],
        importantNotice:
          'Regulatory Notice: TypeNull pre-validation checks documentary consistency against codified rules. Pre-validation does not guarantee statutory approval or grant registration from the competent regulatory authority.',
      },
    ],
  },
  {
    id: 'organisation-screening',
    title: 'Organisation Bulk Screening Guide',
    category: 'Officer',
    summary:
      'Operating instructions for institutional officers to ingest multiple applicant dossiers, configure batch screening, evaluate compliance across received files, and export CSV audit reports.',
    readTime: '5 min read',
    iconName: 'Shield',
    badge: 'Institutional Workflow',
    sections: [
      {
        heading: '1. Accessing the Authorised Officer Workspace',
        content:
          'The Officer Workspace is restricted to authenticated users holding the "officer" role. All intake batches and applicant records are strictly isolated by organisation ID in accordance with multi-tenant Row Level Security (RLS).',
      },
      {
        heading: '2. Choosing an Intake Mode',
        content:
          'Officers can stage applicant dossiers using either the Structured Multi-Application Builder or bulk Folder/ZIP Archive upload.',
        steps: [
          {
            title: 'Structured Multi-Application Builder',
            description:
              'Interactively add individual applicants by legal identifier and attach specific PDF/image proofs directly to each applicant dossier.',
            badge: 'Intake Mode A',
          },
          {
            title: 'Folder / ZIP Archive Ingestion',
            description:
              'Select a directory or upload a .ZIP archive. Files grouped in subfolders are mapped to distinct applicant dossiers. Path traversal sequences (../) are sanitized and forbidden extensions (.exe, .sh) are automatically rejected.',
            badge: 'Intake Mode B',
          },
        ],
      },
      {
        heading: '3. Statutory Publication Safeguard',
        content:
          'Batch screening can only be initiated against published government application profiles. If an unverified profile (e.g. DIR-3, TM-A) is selected, an amber safeguard alert is displayed and screening execution is locked until official verification.',
      },
      {
        heading: '4. Fault-Tolerant Screening & Report Export',
        content:
          'Screening processes each dossier asynchronously. An unreadable file or individual dossier failure records status "failed" and outcome "Unable to Assess" without aborting the overall batch. Once complete, officers can filter by outcome category and export a sanitized CSV screening report for institutional auditing.',
      },
    ],
  },
  {
    id: 'application-catalogue',
    title: 'Government Applications Catalogue Guide',
    category: 'Platform',
    summary:
      'Understanding government service discovery, published statutory application profiles, lifecycle verification statuses, and conditional eligibility questions.',
    readTime: '3 min read',
    iconName: 'Compass',
    badge: 'Knowledge Base',
    sections: [
      {
        heading: '1. Authoritative Knowledge Base Registry',
        content:
          'The Application Catalogue indexes Indian Central and State government services across corporate affairs (SPICe+), indirect taxation (GST REG-01), consular passport services (Passport Form 1), and regulatory licensing. Each entry contains statutory legal citations, authoritative department sources, and verified document checklists.',
      },
      {
        heading: '2. Understanding Lifecycle Verification Badges',
        content:
          'Every government service and application variant displays an explicit lifecycle status:',
        steps: [
          {
            title: 'Published (Green)',
            description:
              'Statutory requirements, mandatory document rules, and conditional checklists have been officially verified. Active for pre-validation and bulk screening.',
            badge: 'Ready for Use',
          },
          {
            title: 'Under Review / Partial (Amber)',
            description:
              'Service is in the process of verification or requires updated statutory guidance. Pre-validation is withheld to prevent misleading determinations.',
            badge: 'Verification Pending',
          },
          {
            title: 'Discovered (Purple)',
            description:
              'Official portal endpoint discovered and catalogued; structured field extraction and document rules are scheduled for verification.',
            badge: 'Catalogue Record',
          },
        ],
      },
      {
        heading: '3. Transparent Coverage Boundary',
        content:
          'TypeNull indexes accessible official government sources and documents verified requirements incrementally. TypeNull does not claim universal coverage of all regional or municipal forms across India.',
      },
    ],
  },
  {
    id: 'understanding-results',
    title: 'Understanding Validation Outcomes & Findings',
    category: 'Governance',
    summary:
      'Comprehensive explanation of the four mutually exclusive screening outcomes: Complete, Minor Issues, Major Issues, and Unable to Assess.',
    readTime: '4 min read',
    iconName: 'Scale',
    badge: 'Determination Semantics',
    sections: [
      {
        heading: '1. Four Mutually Exclusive Outcome Categories',
        content:
          'TypeNull evaluates dossiers against regulatory benchmarks and maps the determination into exactly one of four standardized outcomes:',
        steps: [
          {
            title: 'Complete (Green)',
            description:
              'All mandatory documents are present and legible. All required statutory fields conform to prescribed formats. Zero major or minor discrepancies detected.',
            badge: 'Outcome 1',
          },
          {
            title: 'Minor Issues (Amber)',
            description:
              'Core requirements are met, but non-blocking procedural notices or low-contrast scan clarity warnings were detected. Application can proceed with caution.',
            badge: 'Outcome 2',
          },
          {
            title: 'Major Issues (Rose)',
            description:
              'At least one confirmed substantive violation was established: missing mandatory statutory document, invalid identifier format, expired credential, or cross-document data mismatch.',
            badge: 'Outcome 3',
          },
          {
            title: 'Unable to Assess (Purple)',
            description:
              'Prerequisite assessment could not be performed due to unreadable bitmap scans, corrupted files, or empty dossiers. No false substantive defect is manufactured; manual review is required.',
            badge: 'Outcome 4',
          },
        ],
      },
      {
        heading: '2. Distinguishing Technical Failures from Violations',
        content:
          'When an unreadable scan or stream parsing error occurs, TypeNull explicitly tags it as a technical extraction issue (`OCR-QUAL-FAIL`) rather than a legal violation. Technical errors do not produce substantive blocking findings.',
      },
      {
        heading: '3. Statutory Non-Approval Disclaimer',
        content:
          'Pre-validation verifies documentary completeness and data consistency against official published rules. It does not replace discretionary human officer review or guarantee registration by competent authorities.',
      },
    ],
  },
  {
    id: 'account-access',
    title: 'Account Access & Role-Based Workspaces',
    category: 'Platform',
    summary:
      'Overview of user roles (Applicant, Institutional Officer, Administrator), workspace navigation, session persistence, and data privacy safeguards.',
    readTime: '3 min read',
    iconName: 'UserCheck',
    badge: 'Access & Security',
    sections: [
      {
        heading: '1. User Roles & Workspace Navigation',
        content:
          'TypeNull implements strict Role-Based Access Control (RBAC):',
        steps: [
          {
            title: 'Applicant Role',
            description:
              'Access to Pre-Validation Dashboard, Application Catalogue, dossier preparation, file uploads, and personal validation runs.',
            badge: 'Applicant',
          },
          {
            title: 'Officer Role',
            description:
              'Access to Organisation Bulk Screening Workspace, multi-applicant batch creation, intake archive parsing, and CSV audit reports.',
            badge: 'Officer',
          },
          {
            title: 'Administrator Role',
            description:
              'Access to Administration Console, Government Service Discovery management, source registry governance, and system metrics.',
            badge: 'Administrator',
          },
        ],
      },
      {
        heading: '2. Multi-Tenant Data Isolation',
        content:
          'Applicant records are isolated by user ID via Row Level Security (RLS). Institutional batch screenings are isolated by organisation ID, ensuring officers cannot inspect batches belonging to other entities.',
      },
      {
        heading: '3. Offline & Live Session Support',
        content:
          'TypeNull operates with live Supabase PostgreSQL and Storage when configured, with robust in-memory session persistence when operating in evaluation environments.',
      },
    ],
  },
];

export function getGuideById(id: string): ProductGuide | undefined {
  return PRODUCT_GUIDES.find((g) => g.id === id);
}

export function searchGuides(query: string): ProductGuide[] {
  const q = query.trim().toLowerCase();
  if (!q) return PRODUCT_GUIDES;
  return PRODUCT_GUIDES.filter((guide) => {
    return (
      guide.title.toLowerCase().includes(q) ||
      guide.summary.toLowerCase().includes(q) ||
      guide.category.toLowerCase().includes(q) ||
      guide.badge.toLowerCase().includes(q) ||
      guide.sections.some(
        (s) =>
          s.heading.toLowerCase().includes(q) ||
          s.content.toLowerCase().includes(q) ||
          s.steps?.some((st) => st.title.toLowerCase().includes(q) || st.description.toLowerCase().includes(q))
      )
    );
  });
}
