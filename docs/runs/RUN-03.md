# Run 03 — Recruiter portal, applications, uploads

## Scope
Bring the recruiter side of the marketplace online and wire students end-to-end: discover → apply → track → converse.

## Database & storage
- Bucket `resumes` (private) + per-user storage RLS.
- `resumes`: `file_path`, `file_name`, `file_size`.
- Triggers: `updated_at` on `jobs`, `applications`.
- Policy: recruiters can insert notifications for applicants on their jobs.

## Server functions
- `recruiter.functions.ts`: `becomeRecruiter`, `listMyJobs`, `createJob`, `listApplicants`, `decideApplication`, `getThread`, `sendThreadMessage`.
- `jobs.functions.ts`: `listOpenJobs`, `applyToJob`, `listMyApplications`, `listMyResumes`, `getMyRoles`.
- Free-tier rules: 30 applications per job (recruiter), no per-student application cap (uses AI quota for AI-generated docs only).

## Routes
| Route | Audience | Purpose |
|---|---|---|
| `/jobs` | student | Searchable job board, apply dialog |
| `/applications` | student | Status tracker + feedback thread |
| `/recruiter` | recruiter | Posting overview + new-job CTA |
| `/recruiter/new-job` | recruiter | Post a role |
| `/recruiter/applicants/:jobId` | recruiter | Pipeline + shortlist/proceed/regret with preset feedback |
| `/profile` | all | Enable recruiter role |

## UX
- Sidebar gains **My Applications** universally and **Recruiter** when role-gated.
- Resume page now accepts PDF/DOCX/TXT uploads (parsed client-side, stored in `resumes` bucket and linked to the AI-run row).
- Feedback threads open automatically on a non-pending decision; both parties get notifications.

## Out of scope (handled later)
- Job scraping (Run 4), Subscriptions/Admin (Run 5), Heatmaps/SEO/Tours polish (Run 6).

## Test paths
1. Sign up → `/profile` → Enable recruiter → `/recruiter/new-job` → post.
2. Second account → `/jobs` → Apply (attach uploaded resume).
3. Recruiter → `/recruiter/applicants/:id` → Shortlist → student sees status + thread on `/applications`.