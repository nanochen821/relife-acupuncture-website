# Clinic Content Manager — Project Direction

## 1. Document Purpose

This document records the current agreed direction for the website content-management system.

It is intended to guide future implementation and prevent the project from drifting into an unnecessarily large or unclear scope.

The system is not intended to become a full WordPress replacement in its first version. The goal is to build a reusable content-management template for clinic and small health-service websites while keeping the current ReLife website as the first real implementation.

---

## 2. Project Goal

Build a reusable clinic content-management system that allows non-technical clinic staff to manage website content without editing HTML, JavaScript, JSON, Markdown syntax, or Git directly.

The first implementation will be used by ReLife Acupuncture, but the architecture should allow the same system to be adapted later for another clinic by changing configuration, branding, categories, authors, and content.

Working name:

```text
Clinic Content Manager
```

Initial version:

```text
Clinic Content Manager v1
```

---

## 3. Agreed Product Direction

The project follows the reusable-template direction.

The system should be reusable for:

- acupuncture clinics
- wellness clinics
- physical therapy clinics
- massage or rehabilitation practices
- other small health-service websites with similar publishing needs

The first version does not need to support every industry.

The project should remain focused on clinic and health-service content rather than becoming a fully generic CMS for restaurants, schools, e-commerce, real estate, or every possible business type.

---

## 4. Core Principle

The content-management system and the public website should remain separate responsibilities.

```text
CMS
├── creates content
├── edits content
├── validates required fields
├── manages drafts and publication
├── uploads images
├── generates or updates content files
└── triggers deployment

Public Website
├── loads published content
├── renders article pages
├── renders patient story pages
├── supports search and filters
├── displays YouTube content
└── does not contain editing logic
```

The public website should primarily render content. The CMS should primarily manage and generate content.

---

## 5. Existing Website Architecture

The current website is a static site built with:

- HTML
- CSS
- JavaScript
- Markdown content files
- JSON manifest files
- GitHub repository hosting

The current article system already follows a useful direction:

```text
Markdown article
    ↓
Article manifest
    ↓
JavaScript loader
    ↓
Article list and detail pages
```

The existing article format includes front matter similar to:

```yaml
---
title: Listening to the Body’s Oldest Stories
date: 2026-05-19
category: Stories from the Treatment Room
author: Tsung-Mei (Connie) Tsai, L.Ac.
summary: A short article summary.
featured: true
---
```

The CMS should generate and manage this content so clinic staff never need to edit this syntax manually.

---

## 6. Recommended Technical Strategy

The first version should not build authentication, database management, file storage, and publishing infrastructure from zero.

Recommended stack:

```text
GitHub
├── source code
├── content files
├── version history
└── deployment source

Decap CMS
├── admin interface
├── article forms
├── patient story forms
├── rich-text editing
├── image upload interface
└── content commits

Netlify
├── website deployment
├── CMS authentication support
└── automatic redeployment after content changes
```

The CMS interface will be customized around the website’s own content model. Decap CMS is the implementation foundation, not necessarily the permanent final product.

The architecture should leave open the option of replacing Decap CMS later without requiring the public website to be completely rewritten.

---

## 7. Cost Direction

The first version should be designed to operate using free plans where practical.

Expected initial cost:

```text
$0 per month
```

Likely free components:

- GitHub repository
- Decap CMS
- Netlify free plan or free usage tier
- Netlify subdomain

Possible future costs may include:

- custom domain registration
- higher hosting usage
- large image storage requirements
- advanced email services
- paid analytics
- advanced authentication
- database services
- multi-client platform hosting

No paid service should be introduced unless it solves a confirmed need.

---

## 8. Clinic Content Manager v1 Scope

Version 1 will manage two main content types:

```text
1. Health Articles
2. Patient Stories
```

The first version should focus on making these two content types easy and safe to publish.

---

# Part A — Health Articles

## 9. Health Article Management

Clinic staff should be able to:

- view existing articles
- create a new article
- edit an existing article
- save a draft
- publish an article
- unpublish an article
- choose a category
- enter an author
- enter a publication date
- write a summary
- write formatted article content
- mark an article as featured
- upload or select a cover image
- preview the article before publication

Clinic staff should not need to edit:

- Markdown syntax
- YAML front matter
- filenames
- slugs
- JSON manifests
- HTML
- JavaScript
- Git commits

---

## 10. Health Article Data Model

Initial article fields:

```yaml
title: string
slug: string
date: date
updated_date: date | optional
category: string
author: string
summary: string
featured: boolean
published: boolean
cover_image: image | optional
cover_image_alt: string | optional
body: rich text / markdown
language: string
```

Possible future fields:

```yaml
reviewed_by: string
review_date: date
seo_title: string
seo_description: string
related_articles: list
sources: list
```

The first version should avoid adding fields that are not yet used by the public website.

---

## 11. Health Article Categories

Initial categories may include:

- Acupuncture & TCM
- Pain & Mobility
- Everyday Wellness
- Sleep & Stress
- Allergy & Immune
- Stories from the Treatment Room
- Clinic News

Categories should eventually be configurable rather than permanently hard-coded into the CMS.

For the first implementation, a controlled selection list is acceptable because it prevents spelling differences and inconsistent category names.

---

# Part B — Patient Stories

## 12. Patient Stories as a Separate Content Type

Patient Stories should not be stored as ordinary Health Articles.

The CMS should display them as a separate collection:

```text
Articles
Patient Stories
```

This is important because Patient Stories require different fields, different legal safeguards, and direct YouTube video support.

---

## 13. Patient Story Management

Clinic staff should be able to:

- view existing patient stories
- create a new patient story
- edit an existing story
- save a draft
- publish or unpublish a story
- enter a story title
- add a short summary
- add the full written story
- select a treatment topic
- enter a publication date
- paste a YouTube video URL
- upload or select a cover image
- mark a story as featured
- choose how the patient is identified
- confirm publication authorization
- preview the story before publication

---

## 14. Patient Story Data Model

Initial patient story fields:

```yaml
title: string
slug: string
date: date
summary: string
body: rich text / markdown
treatment_topic: string
youtube_url: string | optional
youtube_title: string | optional
cover_image: image | optional
cover_image_alt: string | optional
featured: boolean
published: boolean
patient_display_name: string | optional
identity_mode: enum
consent_confirmed: boolean
language: string
```

Suggested identity options:

```text
Full name
First name only
Initials
Anonymous
```

Possible future fields:

```yaml
quote: string
related_treatments: list
video_thumbnail_override: image
consent_record_reference: string
reviewed_by: string
```

The public content file should not contain private consent documents or sensitive patient records.

---

## 15. YouTube Video Support

Clinic staff should paste a normal YouTube URL.

Examples:

```text
https://www.youtube.com/watch?v=VIDEO_ID
https://youtu.be/VIDEO_ID
https://www.youtube.com/shorts/VIDEO_ID
```

The system should extract the video ID automatically.

Clinic staff should not paste iframe code.

Preferred first-version behavior:

```text
YouTube URL
    ↓
Video ID parser
    ↓
Privacy-enhanced embed
    ↓
youtube-nocookie.com player
```

The public page may either:

1. embed the video directly, or
2. display a thumbnail that loads the player after user interaction

A click-to-load player may be preferred later for performance and privacy, but a responsive privacy-enhanced embed is acceptable for the first version.

Invalid or unsupported YouTube URLs should produce a clear validation error in the CMS or fail safely on the public page.

---

## 16. Patient Consent and Publication Safety

Patient Stories require stricter safeguards than ordinary articles.

The CMS should include a required confirmation such as:

```text
I confirm that the clinic has permission to publish this story and any associated video or image.
```

A story should not be considered publishable unless:

```yaml
consent_confirmed: true
```

This checkbox is an administrative safeguard, not a replacement for the clinic’s actual written consent process.

Consent forms, medical records, private communications, insurance information, and other sensitive documents must never be committed to the public GitHub repository.

---

## 17. Patient Story Writing Guidelines

Patient Stories should describe personal experiences without promising identical outcomes for other patients.

Avoid language such as:

```text
Acupuncture cured the condition.
This treatment always works.
Guaranteed relief.
Permanent recovery.
Every patient will experience the same result.
```

Prefer language such as:

```text
The patient describes the changes they personally experienced.
Results and treatment experiences vary between individuals.
The story reflects one patient’s experience and is not a guarantee of outcome.
```

The public Patient Story page should include an appropriate disclaimer.

---

# Part C — Admin Experience

## 18. Desired Admin Navigation

Initial admin navigation should conceptually contain:

```text
Dashboard
Articles
Patient Stories
Media
Settings
```

However, the first implementation may begin with only the content collections that Decap CMS provides directly.

A custom dashboard is not required for the first milestone.

The first usable version may therefore begin as:

```text
Articles
Patient Stories
Media
```

A custom branded dashboard can be added later if the existing CMS foundation is stable.

---

## 19. Desired Editor Experience

The editor should use normal form controls rather than exposing content syntax.

Example:

```text
Title
[________________________________]

Category
[ Pain & Mobility ▼ ]

Author
[________________________________]

Publication Date
[____ / ____ / ______]

Summary
[________________________________]

Content
[Heading] [Bold] [Link] [Image]

[Save Draft] [Preview] [Publish]
```

The editor should be understandable without technical training.

---

## 20. Draft and Publishing Behavior

Desired states:

```text
Draft
Published
Unpublished
```

Minimum first-version requirement:

- staff can save changes without immediately publishing
- published content appears on the public website
- unpublished content does not appear publicly
- content changes remain versioned in GitHub

The exact workflow depends on the selected Decap CMS editorial workflow configuration.

---

## 21. Media Management

Version 1 should support:

- article cover images
- patient story cover images
- images inserted into article content
- images inserted into patient story content
- alternative text fields

Images should be stored in a predictable project directory, for example:

```text
assets/images/uploads/
```

Possible later structure:

```text
assets/images/uploads/articles/
assets/images/uploads/patient-stories/
```

The first implementation should avoid building a fully custom digital asset manager.

---

# Part D — Reusability

## 22. Reusable Clinic Configuration

Clinic-specific values should gradually move into configuration rather than remain scattered through code.

Example future configuration:

```yaml
site_name: ReLife Acupuncture
site_type: acupuncture-clinic
default_author: Tsung-Mei (Connie) Tsai, L.Ac.
default_language: en
supported_languages:
  - en
  - zh-Hant

article_categories:
  - Acupuncture & TCM
  - Pain & Mobility
  - Everyday Wellness
  - Sleep & Stress
  - Allergy & Immune
  - Stories from the Treatment Room
  - Clinic News

patient_story_topics:
  - Pain Management
  - Mobility
  - Sleep
  - Stress
  - Allergy
  - General Wellness
```

A future clinic should be able to replace these values without rewriting the CMS core.

---

## 23. Reusability Boundary

The initial reusable scope is:

```text
Clinic and small health-service content management
```

The initial reusable scope is not:

```text
Universal CMS for every industry
Multi-tenant SaaS platform
WordPress replacement
Website page builder
E-commerce system
Patient portal
Electronic medical record system
```

This boundary is important to keep the project achievable.

---

# Part E — Multilingual Direction

## 24. Chinese Support

The Chinese version will be implemented later, after the English website and content-management workflow are stable.

However, the data structure should avoid blocking future bilingual content.

Possible approaches to evaluate later:

### Option A — Separate content files

```text
content/articles/en/example.md
content/articles/zh-Hant/example.md
```

Advantages:

- simple files
- easier independent publication
- clear separation

### Option B — One entry with language groups

```yaml
english:
  title:
  summary:
  body:

chinese:
  title:
  summary:
  body:
```

Advantages:

- translations remain connected
- easier side-by-side editing

Disadvantages:

- larger and more complicated editor forms
- less convenient when only one language is available

No final multilingual storage decision has been made yet.

Current agreement:

- do not translate the full site now
- do not build the full bilingual editor now
- preserve language-ready fields and directory structure where reasonable
- revisit this after the English publishing workflow is working

---

# Part F — Technical Architecture Direction

## 25. Target Content Flow

Desired publishing flow:

```text
Clinic staff opens /admin/
        ↓
Logs in
        ↓
Creates or edits content
        ↓
Saves draft or publishes
        ↓
CMS writes content files to GitHub
        ↓
Manifest is generated or updated
        ↓
Netlify rebuilds the website
        ↓
Published content appears publicly
```

---

## 26. Manifest Direction

The existing website uses `data/articles.json` to locate Markdown files.

The preferred long-term direction is:

```text
CMS content
    ↓
Generated manifest
    ↓
Public website loader
```

Clinic staff should never update the manifest manually.

Possible solutions:

1. CMS directly updates the manifest
2. a build script scans content directories and generates the manifest
3. the static-site build process generates the manifest automatically

Preferred direction:

> Use a build script to scan content directories and generate manifests automatically.

This reduces human error and keeps content management separate from rendering logic.

Potential manifests:

```text
data/articles.json
data/patient-stories.json
```

---

## 27. Frontend Rendering Direction

The public website should continue to render content safely using DOM creation and text content where practical.

The current custom Markdown parser may remain temporarily.

Later options include:

- improve the existing parser
- use a small trusted Markdown parser
- generate sanitized HTML during the build process

No Markdown rendering library should be introduced until there is a clear need and its security and deployment impact have been reviewed.

---

## 28. Slug and Filename Direction

Clinic staff should not manually create slugs or filenames.

Desired behavior:

```text
Article title
    ↓
Automatic slug
    ↓
Generated filename
```

Example:

```text
Listening to the Body’s Oldest Stories
```

becomes:

```text
listening-to-the-bodys-oldest-stories.md
```

The system should also allow a slug to be adjusted when necessary, but this should not be required for normal use.

Changing a published slug may break old links, so slug editing should be handled carefully in later versions.

---

# Part G — Security and Privacy

## 29. Authentication

Version 1 should use established authentication provided through the selected CMS and hosting workflow.

Do not build a custom password or session system in the first version.

The system should avoid storing passwords in:

- JavaScript files
- HTML files
- GitHub repository files
- environment files committed to Git

---

## 30. Sensitive Information

The CMS is for public website content only.

It must not be used to store:

- patient medical records
- patient symptoms submitted privately
- appointment details
- insurance information
- addresses not intended for publication
- private phone numbers
- consent forms
- clinical notes
- diagnostic information
- protected health information

The CMS is not a patient portal and not an electronic medical record system.

---

## 31. Repository Visibility

The current repository may remain public only when all committed content is intended for public viewing or is safe source code.

Never commit confidential clinic or patient information, even temporarily, because Git history may preserve removed data.

If private operational content is ever introduced, repository visibility and storage architecture must be reconsidered before implementation.

---

# Part H — Explicitly Out of Scope for v1

## 32. Features Not Included in Version 1

The following are not part of Clinic Content Manager v1:

- custom authentication system
- custom password reset
- custom user database
- multiple complex staff roles
- patient account login
- appointment management
- medical records
- online diagnosis tools
- payment processing
- comments
- article likes
- advanced analytics dashboard
- custom drag-and-drop page builder
- editing every page of the public website
- multi-client SaaS hosting
- AI-generated automatic publication
- automatic medical claim approval
- full multilingual workflow
- complete custom media library
- WordPress-level plugin architecture

These may only be considered after the first version is stable and there is a real need.

---

# Part I — Proposed Implementation Phases

## 33. Phase 0 — Confirm Current Content System

Goal:

Understand and document the existing article and patient story structures before changing code.

Tasks:

- inspect current article files
- inspect current patient story files
- inspect article manifests
- inspect patient story manifests
- inspect list and detail JavaScript
- confirm current image paths
- confirm deployment status

Deliverable:

```text
Current content architecture summary
```

---

## 34. Phase 1 — Stabilize Content Models

Goal:

Define consistent article and patient story schemas.

Tasks:

- finalize article front matter fields
- finalize patient story front matter fields
- define category and topic values
- define draft and published behavior
- define image fields
- define YouTube URL field
- define consent confirmation field

Deliverables:

```text
Article schema
Patient Story schema
Example content files
```

---

## 35. Phase 2 — Automatic Manifest Generation

Goal:

Remove the need to update JSON manifests manually.

Tasks:

- create article manifest generator
- create patient story manifest generator
- scan only publishable content
- validate required fields
- generate predictable output
- connect generator to build process

Deliverables:

```text
data/articles.json
data/patient-stories.json
```

automatically generated from content files.

---

## 36. Phase 3 — Public Patient Story Integration

Goal:

Ensure Patient Stories support the final data model and YouTube videos.

Tasks:

- update patient story loader
- add YouTube URL parsing
- add privacy-enhanced embed
- add responsive video layout
- add safe fallback for missing or invalid videos
- add consent-aware publication filtering
- add appropriate disclaimer

Deliverable:

```text
Published patient stories render correctly with optional YouTube video
```

---

## 37. Phase 4 — Decap CMS Admin Foundation

Goal:

Create the first usable admin interface.

Tasks:

- create `/admin/index.html`
- create `/admin/config.yml`
- configure Git backend
- configure media folders
- configure Articles collection
- configure Patient Stories collection
- configure field validation
- configure editorial workflow if appropriate

Deliverable:

```text
/admin/ opens a usable content-management interface
```

---

## 38. Phase 5 — Netlify Deployment and Login

Goal:

Allow authorized clinic staff to access the CMS securely.

Tasks:

- connect repository to Netlify
- configure deployment
- configure CMS authentication
- invite authorized editor account
- test login
- test draft creation
- test publication
- confirm automatic site rebuild

Deliverable:

```text
Authorized clinic staff can log in and publish content without using Git
```

---

## 39. Phase 6 — Editor Usability Improvements

Goal:

Make the admin interface comfortable for non-technical clinic staff.

Possible tasks:

- improve field labels
- add help text
- set sensible defaults
- add custom preview templates
- improve category selection
- improve author defaults
- add YouTube validation guidance
- improve image alt-text guidance
- improve consent warning visibility

Deliverable:

```text
Clinic staff can use the CMS with minimal instruction
```

---

## 40. Phase 7 — Reusable Clinic Configuration

Goal:

Reduce ReLife-specific hard-coding.

Tasks:

- centralize clinic identity settings
- centralize authors
- centralize categories
- centralize patient story topics
- centralize default disclaimers
- document how to adapt the system for another clinic

Deliverable:

```text
A second clinic can reuse the system with limited configuration changes
```

---

## 41. Phase 8 — Chinese Content Planning

Goal:

Choose and implement the bilingual content architecture after the English workflow is stable.

Tasks:

- choose separate-file or grouped-field model
- add language relationships
- add Chinese content collections or fields
- update article routing
- update patient story routing
- update language switch behavior

This phase should not begin until the English CMS publishing workflow has been tested successfully.

---

# Part J — Development Rules

## 42. Working Method

The project should follow these development rules:

1. Discuss architecture before implementation.
2. Reach agreement before introducing a new subsystem.
3. Change one focused part at a time.
4. Avoid large multi-file rewrites when a small patch is sufficient.
5. Test each milestone before continuing.
6. Do not claim a feature works before the user confirms it.
7. Do not invent clinic facts, patient stories, permissions, or credentials.
8. Preserve the current working frontend while adding CMS functionality.
9. Keep the future architecture open without overengineering the first version.
10. Create Git commits only when requested.

---

## 43. Definition of Success for v1

Clinic Content Manager v1 is successful when an authorized clinic staff member can:

```text
1. Open /admin/
2. Log in
3. Create or edit a Health Article
4. Create or edit a Patient Story
5. Paste a YouTube URL into a Patient Story
6. Upload a cover image
7. Save a draft
8. Publish content
9. See the website update automatically
10. Complete the process without editing code or using Git
```

The system must also ensure:

```text
- unpublished content remains hidden
- invalid content fails safely
- patient stories require a consent confirmation field
- no sensitive patient data is stored
- the public website remains usable if a video or image is missing
```

---

# Part K — Current Decisions Summary

## 44. Confirmed Decisions

The following decisions are currently agreed:

- The system will follow the reusable clinic-template direction.
- The first implementation is for ReLife Acupuncture.
- The system will focus on clinics and small health-service websites.
- Decap CMS is the recommended first CMS foundation.
- GitHub will store source code and content.
- Netlify is the recommended deployment and authentication platform.
- The first version should aim to use free plans.
- Health Articles and Patient Stories will be separate content collections.
- Patient Stories will support YouTube URLs.
- Patient Stories will include an authorization confirmation field.
- Clinic staff will not manually edit Markdown, JSON, HTML, or Git.
- The public frontend and the content-management system will remain separate responsibilities.
- Automatic manifest generation is preferred over manual manifest editing.
- Chinese support is planned for later, not implemented immediately.
- The system will not become a full generic CMS or SaaS platform in v1.

---

## 45. Decisions Still Open

The following decisions will be made later:

- exact article and patient story directory structure
- exact draft and published file organization
- exact Decap CMS authentication configuration
- whether GitHub Pages will remain active after Netlify deployment
- exact image upload directory structure
- exact patient story page design
- direct video embed versus click-to-load video
- custom Markdown parser versus build-time HTML generation
- exact bilingual content storage model
- whether a custom dashboard is needed after v1
- whether categories should later become editable content

These open decisions should be resolved only when their implementation phase begins.

---

# Part L — Next Step

## 46. Immediate Next Step

Before writing CMS configuration, inspect the current Patient Stories implementation in the same way the existing Health Articles implementation has already been reviewed.

Required files may include:

```text
pages/patient-stories/index.html
pages/patient-stories/story.html
js/patient-stories.js
js/patient-story-detail.js
content/patient-stories/*
data/patient-stories.json
```

After reviewing those files, the next discussion should finalize the two content schemas:

```text
Article schema v1
Patient Story schema v1
```

Only after those schemas are agreed should implementation begin.

---

## 47. Final Direction Statement

Clinic Content Manager should begin as a practical, reusable publishing system for clinic websites—not as a full custom CMS platform.

The first version should use proven infrastructure to provide safe login, visual editing, media uploads, drafts, and publication while preserving ownership of the website code and content in GitHub.

The project should grow through small, testable phases:

```text
Stable content models
    ↓
Automatic manifests
    ↓
Patient Story video support
    ↓
Admin interface
    ↓
Authentication and deployment
    ↓
Usability improvements
    ↓
Reusable clinic configuration
    ↓
Bilingual content
```

This direction is ambitious enough to become a strong portfolio project, but limited enough to remain achievable.
