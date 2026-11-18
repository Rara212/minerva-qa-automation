# Minerva QA Test Automation Framework: Step-by-Step Implementation Roadmap

This document provides a structured, phase-by-phase engineering roadmap for building, expanding, and maintaining the production-grade Playwright + TypeScript test automation framework for Minerva.

---

## Phase 1: Infrastructure & Environment Setup (Completed)

- [x] **Project Initialization:** Set up Node.js, TypeScript in strict mode, Playwright, Prettier, and ESLint v10 (Flat Config).
- [x] **Cold-Start Resilience (Ground Rule #2):** Implement `globalSetup` script in `src/utils/globalSetup.ts` to poll `/api/health` before running test suites.
- [x] **Directory Layout:** Establish clean separation of concerns (`src/api`, `src/pages`, `src/fixtures`, `src/utils`, `tests/api`, `tests/e2e`, `docs/`).
- [x] **Documentation & Test Strategy:** Author and commit `docs/TEST_STRATEGY.md` with 43 risk-classified scenarios (P0/P1/P2) and complete Requirement Traceability Matrix (RTM).

---

## Phase 2: Core Abstractions & High-Risk (P0) Automation

Focus on initializing the foundational Page Object Models (POM), dynamic API data helpers, and high-priority regression tests.

### 2.1 API Helpers & Setup/Teardown Hooks
- [ ] Create `src/api/AuthClient.ts` to handle dynamic user registration, token generation, and account cleanup.
- [ ] Implement Playwright custom fixtures (`src/fixtures/authFixture.ts`) to inject valid user auth states into test contexts without repetitive UI log-ins.

### 2.2 Page Object Models (POM)
- [ ] **LoginPage (`src/pages/LoginPage.ts`):** Encapsulate selectors and actions for login, logout, password visibility, and error toasts.
- [ ] **RegistrationPage (`src/pages/RegistrationPage.ts`):** Support multi-step onboarding, profile setup, and input validation.
- [ ] **TokenPurchasePage (`src/pages/TokenPurchasePage.ts`):** Handle payment selection, package checkout, and mock card transactions.

### 2.3 High-Risk (P0) Test Suites
- [ ] **Login Suite (`tests/e2e/auth/login.spec.ts`):**
  - `TC_LOG_001`: Valid login & session logout.
  - `TC_LOG_002`: Invalid credentials rejection & error messaging.
  - `TC_LOG_003`: Protected route redirection after logout.
  - `TC_LOG_004`: SQL injection and XSS input sanitization checks.
- [ ] **Registration Suite (`tests/e2e/auth/register.spec.ts`):**
  - `TC_AUTH_001`: Full multi-step onboarding & profile creation.
  - `TC_AUTH_002`: Duplicate email registration block.
  - `TC_AUTH_003`: Terms of Service requirement validation.
  - `TC_AUTH_004` – `TC_AUTH_006`: Password complexity, refresh resilience, and boundary inputs.
- [ ] **Token Purchase Suite (`tests/e2e/monetization/tokens.spec.ts`):**
  - `TC_TOKN_001` – `TC_TOKN_003`: Successful credit additions, card decline error handling, and webhook integration drops.

---

## Phase 3: Medium-Risk (P1) AI & Feature Workflows

Automate core functional workflows while setting up boundaries for AI interaction.

### 3.1 Feature Page Objects
- [ ] **EssayReviewPage (`src/pages/EssayReviewPage.ts`):** Document upload, proofread triggering, token deduction checks, and export actions.
- [ ] **MentorBookingPage (`src/pages/MentorBookingPage.ts`):** Slot selection, timezone conversion, and appointment confirmations.
- [ ] **TodoTrackerPage (`src/pages/TodoTrackerPage.ts`):** Scholarship task creation, inline edits, status toggles, and deletions.

### 3.2 Medium-Risk (P1) Test Suites
- [ ] **Essay Review (`tests/e2e/features/essay.spec.ts`):** `TC_ESSY_001` – `TC_ESSY_004` (Proofread flow, zero-balance handling, context window limits, UTF-8 exports).
- [ ] **Mentor Booking (`tests/e2e/features/booking.spec.ts`):** `TC_BNKR_001` – `TC_BNKR_003` (Appointment creation, API double-booking concurrency block, cross-timezone schedules).
- [ ] **Scholarship To-Do (`tests/e2e/features/todo.spec.ts`):** `TC_TODO_001` – `TC_TODO_003` (Full task CUD lifecycle, empty input rejection, character length boundaries).
- [ ] **Chatbot API Verification (`tests/api/chatbot.spec.ts`):** `TC_BOT_003` (Rapid message burst rate-limiting).

---

## Phase 4: Low-Risk (P2) Search & Navigation Automation

Complete the automated coverage footprint across visual discovery and content navigation.

### 4.1 Discovery Page Objects
- [ ] **ScholarshipSearchPage (`src/pages/ScholarshipSearchPage.ts`):** Filter accordions, dynamic suitability scores, and keyword inputs.
- [ ] **WishlistPage (`src/pages/WishlistPage.ts`):** Bookmark toggles, list synchronization, and empty states.

### 4.2 Low-Risk (P2) Test Suites
- [ ] **Filter & Search (`tests/e2e/discovery/search.spec.ts`):** `TC_DISC_001` – `TC_DISC_004` (Multi-criteria search, zero-results state, special characters, rapid checkbox toggling).
- [ ] **Scholarship Detail & Wishlist (`tests/e2e/discovery/wishlist.spec.ts`):** `TC_PAGE_001` – `TC_PAGE_003` and `TC_WISH_001` – `TC_WISH_003` (Bookmark sync, 404 handling, external links, multi-tab sync).

---

## Phase 5: CI/CD Pipeline & Quality Reporting

Integrate the automated test suite into GitHub Actions for continuous quality validation.

- [ ] **GitHub Actions Workflow (`.github/workflows/playwright.yml`):**
  - Configure PR checks and nightly scheduled execution triggers.
  - Implement 2-shard parallel matrix execution for optimal build speed (< 8 minutes).
  - Cache Node.js modules and Playwright browser binaries.
- [ ] **Reporting & Artifacts:**
  - Configure HTML report generation and trace recording on retry/failure.
  - Set up build status notifications and artifact upload step (playwright-report).
- [ ] **Architecture Decision Records (ADRs):**
  - Commit `docs/adr/001-tool-selection.md` and `docs/adr/002-data-isolation.md`.

---

## Phase 6: Targeted Manual Testing & Exploratory Protocol

Execute and document non-deterministic AI media scenarios using structured test logs.

- [ ] **Mock-up Interview Session (`TC_MOCK_001` – `TC_MOCK_003`):** Manual browser microphone permissions check, audio stream verification, and background noise tolerance.
- [ ] **AI Chatbot Quality & Security (`TC_BOT_001`, `TC_BOT_002`):** Recommendation qualitative relevance and prompt injection exploratory probing.
- [ ] **IELTS Prep Modules (`TC_IELTS_LS_001` – `TC_IELTS_RD_002`):** Audio player controls, passage layout rendering, and timer enforcement.