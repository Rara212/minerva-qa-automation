# Minerva Software Test Strategy & Traceability Matrix Document

## 1. Executive Summary & Quality Objectives

### 1.1 Document Purpose
This Test Strategy outlines the quality assurance framework, risk classification, environment management, and test automation scope for the **Minerva Platform**. It provides end-to-end coverage across authentication, onboarding, monetization, AI services, scholarship tracking, and academic prep modules.

### 1.2 Quality Goals & Metrics
* **Automation Coverage:** 100% of High-Risk (P0) scenarios automated; 79% (34/43) overall suite automated.
* **Execution Efficiency:** Automated execution time kept under 8 minutes in CI sharded runners.
* **Quality Gate:** Zero open High-Risk (P0) defects or failing regression suites allowed prior to production release.

---

## 2. Risk-Based Testing Framework

Testing effort is allocated according to financial impact, security risk, system stability, and user acquisition friction.

```text
                     HIGH RISK (P0) - 13 Tests
       [Buying Token | Login & Auth | Sign-in & Onboarding]
   Financial revenue integrity, authentication tokens, security parameterization.
                            │
                            ▼
                    MEDIUM RISK (P1) - 16 Tests
     [Essay Review | Booking Mentor | Chatbot | Mock Interview | To-Do]
    Paid feature consumption, AI token quota validation, booking scheduling.
                            │
                            ▼
                    LOW RISK (P2) - 14 Tests
     [Scholarship Filter | Wishlist | Scholarship Page | IELTS Prep]
      UI state filters, navigation robustness, practice content player.
```

### 2.1 Risk Classification Criteria

| Risk Level | Impact Rationale | Test Breakdown | Execution Strategy |
| :--- | :--- | :--- | :--- |
| **High (P0)** | Revenue loss, data breaches, authentication failure, onboarding drop-off. | **13 Tests** (100% Automated) | **Automated in CI/CD:** Runs on every Pull Request and nightly build. |
| **Medium (P1)** | Core AI feature consumption, token balance leakage, calendar booking conflicts. | **16 Tests** (10 Automated, 6 Manual) | **Hybrid Execution:** Deterministic logic automated; AI voice/mic manual. |
| **Low (P2)** | Display glitches, search filter edge cases, static practice content. | **14 Tests** (11 Automated, 3 Manual) | **Regression & Exploratory:** Automated UI regression + manual audio checks. |

---

## 3. Test Execution Approach & Tooling Architecture

### 3.1 Automation Architecture (34 Automated Tests)
* **Framework:** Playwright with TypeScript.
* **Design Pattern:** Page Object Model (POM) + API Data Builders.
* **Test Isolation:** Independent sessions; dynamic test user creation via backend API setup/teardown hooks.
* **CI/CD Integration:** GitHub Actions running sharded parallel execution.

### 3.2 Manual Testing Scope (9 Manual Tests)
Manual testing is reserved for non-deterministic AI media features and browser permissions:
1. **Mock-up Interview (TC_MOCK_001 – 003):** Audio recording verification, background noise handling, and browser mic permission toggles.
2. **AI Chatbot (TC_BOT_001, TC_BOT_002):** Qualitative recommendation relevance and exploratory prompt injection testing.
3. **IELTS Practice Modules (TC_IELTS_LS_001, 002 & TC_IELTS_RD_001, 002):** Audio stream playback continuity, passage formatting, and manual session timing.

---

## 4. Requirement Traceability Matrix (RTM)

### 4.1 High-Risk Modules (P0) — 13 Tests

| Test Case ID | Feature / Module | Test Scenario Description | Type | Priority | Execution | Target Automation Layer |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC_TOKN_001** | Buying Token | Focus pack payment and credit verification | Positive | High | Automation | E2E / API Webhook |
| **TC_TOKN_002** | Buying Token | Short card number (&lt;16 digits) validation & error toast check | Negative | High | Automation | E2E UI |
| **TC_TOKN_003** | Buying Token | Network drop/timeout during webhook retry | Edge | High | Automation | API Integration |
| **TC_LOG_001** | Login & Auth | Valid credentials login & clean session logout | Positive | High | Automation | E2E Web |
| **TC_LOG_002** | Login & Auth | Invalid credentials reject & lockout threshold | Negative | High | Automation | E2E / API |
| **TC_LOG_003** | Login & Auth | Direct protected URL access post-logout | Negative | High | Automation | E2E Navigation |
| **TC_LOG_004** | Login & Auth | SQL Injection & XSS input sanitization | Edge | High | Automation | API Security / E2E |
| **TC_AUTH_001** | Sign-in & Onboarding | Multi-step sign-up and academic profile setup | Positive | High | Automation | E2E Flow |
| **TC_AUTH_002** | Sign-in & Onboarding | Duplicate registered email rejection | Negative | High | Automation | E2E / API |
| **TC_AUTH_003** | Sign-in & Onboarding | Registration attempt without ToS agreement | Negative | High | Automation | E2E Component |
| **TC_AUTH_004** | Sign-in & Onboarding | Password policy complexity rule check | Negative | High | Automation | E2E Component |
| **TC_AUTH_005** | Sign-in & Onboarding | Browser refresh recovery during multi-step flow | Edge | High | Automation | E2E State |
| **TC_AUTH_006** | Sign-in & Onboarding | Boundary length & GPA range validation | Edge | High | Automation | E2E Form |

### 4.2 Medium-Risk Modules (P1) — 16 Tests

| Test Case ID | Feature / Module | Test Scenario Description | Type | Priority | Execution | Target Automation Layer |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC_ESSY_001** | Essay Review | AI proofread, edit merge & Word/PDF export | Positive | Medium | Automation | E2E / Document API |
| **TC_ESSY_002** | Essay Review | Zero token balance AI proofread block | Negative | Medium | Automation | API / E2E Modal |
| **TC_ESSY_003** | Essay Review | Exceed context window (>10k words) limit | Edge | Medium | Automation | E2E Validation |
| **TC_ESSY_004** | Essay Review | Export essay with emojis/UTF-8 symbols | Edge | Medium | Automation | Document Validation |
| **TC_BNKR_001** | Booking Mentor | Select mentor, slot & confirm appointment | Positive | Medium | Automation | E2E Flow |
| **TC_BNKR_002** | Booking Mentor | Concurrently occupied slot double-booking block | Negative | Medium | Automation | API Concurrency |
| **TC_BNKR_003** | Booking Mentor | Cross-timezone (GMT+7 vs GMT+0) conversion | Edge | Medium | Automation | E2E Timezone |
| **TC_TODO_001** | Scholarship To-Do | Full task CUD lifecycle (Add/Edit/Delete) | Positive | Medium | Automation | E2E / API |
| **TC_TODO_002** | Scholarship To-Do | Empty/whitespace task title rejection | Negative | Medium | Automation | E2E Component |
| **TC_TODO_003** | Scholarship To-Do | Max char (>200) & duplicate task handling | Edge | Medium | Automation | E2E Validation |
| **TC_BOT_001** | Chatbot | AI recommendation & guidance response | Positive | Medium | Manual | Manual Exploratory |
| **TC_BOT_002** | Chatbot | Out-of-scope & prompt injection check | Negative | Medium | Manual | Manual Security |
| **TC_BOT_003** | Chatbot | Rapid message bursts (10 msgs in 5 sec) | Edge | Medium | Automation | API Rate Limit |
| **TC_MOCK_001** | Mock-up Interview | Complete session with audio recording | Positive | Medium | Manual | Manual Functional |
| **TC_MOCK_002** | Mock-up Interview | Browser mic permission rejection handling | Negative | Medium | Manual | Manual Browser |
| **TC_MOCK_003** | Mock-up Interview | Heavy background noise / ambient silence | Edge | Medium | Manual | Manual Audio |

### 4.3 Low-Risk Modules (P2) — 14 Tests

| Test Case ID | Feature / Module | Test Scenario Description | Type | Priority | Execution | Target Automation Layer |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC_DISC_001** | Scholarship Filter | Multi-criteria filter & suitability score | Positive | Low | Automation | E2E Search |
| **TC_DISC_002** | Scholarship Filter | Conflicting parameters zero-result handling | Negative | Low | Automation | E2E Search |
| **TC_DISC_003** | Scholarship Filter | Search input special character robustness | Edge | Low | Automation | E2E Component |
| **TC_DISC_004** | Scholarship Filter | Rapid checkbox toggle race condition check | Edge | Low | Automation | E2E State |
| **TC_PAGE_001** | Scholarship Page | Detail page view & bookmark addition | Positive | Low | Automation | E2E Flow |
| **TC_PAGE_002** | Scholarship Page | Invalid URL (/scholarship/999999) 404 check | Negative | Low | Automation | E2E / Routing |
| **TC_PAGE_003** | Scholarship Page | Broken external application link handling | Edge | Low | Automation | E2E Link Checker |
| **TC_WISH_001** | Wishlist | Bookmark scholarships & verify list sync | Positive | Low | Automation | E2E Flow |
| **TC_WISH_002** | Wishlist | Unauthorized bookmarking permission block | Negative | Low | Automation | API Auth |
| **TC_WISH_003** | Wishlist | Multi-tab concurrent bookmark synchronization | Edge | Low | Automation | E2E Multi-context |
| **TC_IELTS_LS_001**| IELTS Listening | Audio stream playback & quiz submission | Positive | Low | Manual | Manual Media |
| **TC_IELTS_LS_002**| IELTS Listening | Network stream interruption recovery | Negative | Low | Manual | Manual Network |
| **TC_IELTS_RD_001**| IELTS Reading | Academic passage test completion | Positive | Low | Manual | Manual Functional |
| **TC_IELTS_RD_002**| IELTS Reading | Exceeding section timer force-submit | Edge | Low | Manual | Manual Timer |

---

## 5. Defect Management & Entry/Exit Criteria

### 5.1 Defect Severity Classification
* **S1 (Blocker):** System crash, authentication lock, failed payment webhook, or lost user token balance.
* **S2 (Critical):** Core feature broken (e.g., cannot submit essay, booking conflict unhandled).
* **S3 (Major):** Filter failure, UI component glitch, or missing validation message.
* **S4 (Minor):** Typo, alignment issue, or minor layout inconsistency.

### 5.2 Release Entry & Exit Criteria
* **Entry Criteria:** Deployment to Staging environment succeeds; `/api/health` returns `200 OK`.
* **Exit Criteria:** 100% execution of all 43 test cases; 0 open S1/S2 defects; minimum 95% pass rate across automated regression suites.