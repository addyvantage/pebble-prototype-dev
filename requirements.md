# PebbleCode — Product Requirements Document

## Executive Summary

PebbleCode is an AI-powered coding practice platform built around a core insight: the hardest part of learning to code is not writing the first attempt—it's recovering productively after failure. While traditional platforms optimize for final acceptance, PebbleCode treats recovery as the primary learning moment, providing context-aware mentorship, structured guidance tiers, and growth-oriented analytics that help learners understand, fix, and improve after every failed run.

This document defines the product requirements for the PebbleCode prototype submitted to AI for Bharat / Hack2Skill, reflecting the current implementation state and design philosophy.

## Problem Statement

### The Recovery Gap in Coding Education

Existing coding practice platforms focus heavily on problem discovery and final submission outcomes, but provide minimal support during the critical recovery phase—the period between a failed run and the next attempt. This creates several pain points:

1. **Shallow feedback loops**: Generic "Wrong Answer" or "Runtime Error" messages don't help learners understand what went wrong or how to fix it
2. **Context loss**: When learners get stuck, they must leave the coding environment to search for help, losing session context
3. **Fragmented experience**: Discovery, practice, reflection, and progress tracking happen across disconnected tools
4. **Generic AI assistance**: General-purpose coding assistants lack grounding in the specific problem, current code state, and failing test case
5. **Vanity metrics**: Platforms track problems solved but ignore recovery quality, autonomy development, or learning velocity
6. **Language barriers**: Most platforms are English-only, limiting accessibility for non-English speakers in India

### Why This Matters for India

India has one of the largest populations of aspiring software developers globally, but many learners face:
- Limited access to personalized mentorship
- Language barriers that slow comprehension
- Need for structured, self-paced learning environments
- Pressure to demonstrate coding proficiency for placement and career advancement

PebbleCode addresses these challenges by providing an accessible, multilingual, mentor-guided practice environment that emphasizes recovery and growth over raw problem counts.

## Target Users

### Primary Audience
- **Beginner to intermediate coders** preparing for technical interviews and placement tests
- **Self-learners** who need structured guidance without live instructor access
- **Non-English speakers** who benefit from multilingual UI and problem statements
- **Students** seeking to build coding confidence through recovery-oriented practice

### User Characteristics
- Comfortable with basic programming concepts but struggle with problem-solving under pressure
- Need contextual help during practice, not just after submission
- Value understanding their growth trajectory and weak areas
- Prefer calm, focused interfaces over gamified or competitive environments
- May be practicing in regional Indian languages

## Core Product Philosophy

### Recovery as the Primary Metric

PebbleCode measures success not by problems solved, but by:
- **Recovery effectiveness**: How quickly and autonomously users fix failing code
- **Autonomy rate**: Percentage of recoveries achieved without heavy mentor reliance
- **Issue pattern recognition**: Identifying recurring error types (syntax, logic, runtime)
- **Streak maintenance**: Consistent daily practice and momentum

### Context-Aware Mentorship

The Pebble Coach is not a generic chatbot. It:
- Knows the current problem, language, code, and failing test case
- Provides tiered help (Hint → Explain → Next Step) to preserve autonomy
- Adapts guidance based on struggle level and error history
- Stays grounded in session state rather than providing generic advice

### Separation of Learning Track and Editor Language

Unlike platforms that lock users into a single language:
- **Learning track** (Python, JavaScript, C++, Java, C) sets the curriculum focus and placement level
- **Editor language** remains user-selectable per session, allowing flexibility and experimentation
- This separation supports learners who want to practice in multiple languages while maintaining a coherent progression path

## Product Requirements

### 1. Problem Discovery & Browsing

**Requirement**: Users must be able to discover and select coding problems efficiently.

**Acceptance Criteria**:
- Problems browser displays curated problem library with title, difficulty, acceptance rate, topics
- Search functionality filters by title, topic, and key skills
- Filter by difficulty (Easy/Medium/Hard), language support, solved status, and topics
- Sort by difficulty, acceptance rate, newest, topic, or last solved
- Topic cloud visualization shows problem distribution across data structures and algorithms
- Problem preview panel shows full statement, examples, constraints, and starter code before starting
- Solved state persists locally and displays in problem list
- Random problem picker for exploration

**Current Implementation Status**: ✅ Fully implemented with 50+ curated problems

---

### 2. Session IDE & Coding Workspace

**Requirement**: Users must have a professional, distraction-free coding environment.

**Acceptance Criteria**:
- Monaco-based code editor with syntax highlighting for Python, JavaScript, C++, Java, C, SQL
- Language switcher allows changing editor language mid-session
- Per-language draft persistence (code is saved separately for each language)
- Run button executes code against visible test cases with immediate feedback
- Submit button evaluates code against all test cases (including hidden tests)
- Test results panel shows pass/fail status, expected vs actual output, and diagnostic messages
- Compile errors, runtime errors, and timeouts are clearly distinguished
- Editor supports font size adjustment and word wrap toggle
- Session timer tracks time spent on current problem
- Problem statement panel displays full problem description, examples, and constraints
- Units drawer shows curriculum progression for track-based practice

**Current Implementation Status**: ✅ Fully implemented with Monaco editor integration

---

### 3. Multi-Language Code Execution

**Requirement**: Users must be able to run and test code in multiple languages reliably.

**Acceptance Criteria**:
- Support for Python 3, JavaScript (Node.js), C++17, Java 17, C (GNU), and SQL
- Local runner executes code with timeout enforcement (default 5 seconds)
- Remote runner fallback via AWS Lambda for cloud-based execution
- Toolchain probing detects missing language runtimes and provides clear error messages
- Function-mode execution supports method signature testing (e.g., `def twoSum(nums, target)`)
- Stdio-mode execution supports standard input/output testing
- Execution results include stdout, stderr, exit code, and execution time
- Diagnostic mapping translates compiler/runtime errors to user-friendly messages with line numbers
- Output truncation prevents excessive memory usage from infinite loops

**Current Implementation Status**: ✅ Fully implemented with local and remote execution modes

---

### 4. Pebble Coach (AI Mentor)

**Requirement**: Users must have access to context-aware AI guidance during practice.

**Acceptance Criteria**:
- Pebble Coach panel accessible from session workspace
- Three-tier help system:
  - **Hint**: Nudge in the right direction without revealing solution
  - **Explain**: Detailed explanation of the approach or concept
  - **Next Step**: Specific actionable guidance for current code state
- Coach responses are grounded in:
  - Current problem and language
  - User's code snapshot
  - Most recent run outcome (pass/fail, error type)
  - Struggle level and error history
- Safety layer prevents solution dumping and enforces pedagogical boundaries
- Responses are concise (target: 6 lines or less) to reduce cognitive load
- Coach adapts tone based on struggle level (encouraging when stuck, reinforcing when progressing)
- Integration with AWS Bedrock for production-grade LLM inference

**Current Implementation Status**: ✅ Fully implemented with Bedrock integration and tiered help system

---

### 5. Authentication & User Identity

**Requirement**: Users must be able to create accounts and maintain persistent identity.

**Acceptance Criteria**:
- Signup flow with email and password
- Email verification via confirmation code
- Login with email or username
- Forgot password flow
- Profile management (display name, username, bio, avatar upload)
- Username availability check before registration
- Session persistence across browser sessions
- Profile hydration on app load
- Integration with AWS Cognito for secure authentication

**Current Implementation Status**: ✅ Fully implemented with Cognito integration

---

### 6. Analytics & Insights Dashboard

**Requirement**: Users must be able to track their growth and identify improvement areas.

**Acceptance Criteria**:
- Dashboard displays key performance indicators:
  - Recovery effectiveness score (0-100)
  - Average recovery time (seconds)
  - Breakpoints hit this week
  - Guidance reliance percentage
  - Autonomy rate percentage
  - Current streak (days)
- Skill radar chart shows growth across 6 dimensions: speed, accuracy, consistency, autonomy, debugging, complexity
- Issue profile bar chart clusters errors by type: syntax, runtime, logic, timeout, API failure
- Streak calendar visualizes daily completion history
- Growth ledger lists breakthrough moments, stability milestones, and autonomy gains
- Next actions widget recommends specific focus areas based on recent performance
- Problem contributions heatmap shows activity distribution over time
- All metrics derived from local event log (runs, submits, assists, solves)

**Current Implementation Status**: ✅ Fully implemented with local analytics derivation

---

### 7. Multilingual Support

**Requirement**: Users must be able to use PebbleCode in their preferred language.

**Acceptance Criteria**:
- UI supports 13 languages: English, Hindi, Bengali, Telugu, Marathi, Tamil, Urdu, Gujarati, Kannada, Malayalam, Odia, Punjabi, Assamese
- Language selector in settings allows switching UI language
- Problem statements, titles, and topics are localized where translations exist
- RTL (right-to-left) layout support for Urdu
- Fallback to English for untranslated content
- Language preference persists across sessions
- Coach responses can be requested in user's preferred language (when supported by LLM)

**Current Implementation Status**: ✅ Fully implemented with comprehensive localization system

---

### 8. Onboarding & Placement

**Requirement**: New users must be guided through initial setup and skill assessment.

**Acceptance Criteria**:
- Onboarding flow collects:
  - Preferred learning track language (Python, JavaScript, C++, Java, C)
  - Current skill level (Beginner, Intermediate, Advanced)
- Placement test includes:
  - Multiple-choice questions on programming concepts
  - Coding challenge with live evaluation
- Placement outcome determines starting curriculum unit
- Skip option available for users who want to self-select starting point
- Onboarding state persists to avoid re-prompting on subsequent visits

**Current Implementation Status**: ✅ Fully implemented with MCQ and coding evaluation

---

### 9. Submissions & History

**Requirement**: Users must be able to review past submission attempts.

**Acceptance Criteria**:
- Submissions tab in session workspace shows all previous attempts for current problem
- Each submission displays:
  - Timestamp
  - Language used
  - Pass/fail status
  - Test case results
  - Code snapshot
- Submissions persist locally across sessions
- Solved state updates when user achieves first accepted submission
- Submission count contributes to analytics and streak tracking

**Current Implementation Status**: ✅ Fully implemented with local persistence

---

### 10. Recovery Report Export

**Requirement**: Users must be able to export session summaries for review or sharing.

**Acceptance Criteria**:
- Export button generates downloadable PDF report
- Report includes:
  - User identity (name, username)
  - Problem metadata (title, difficulty, topics)
  - Session summary (time spent, attempts, outcome)
  - Key performance indicators (recovery time, autonomy, guidance reliance)
  - Insights and recommendations
- Report uses premium dark theme layout
- Filename is sanitized to avoid unsafe characters
- Server-side PDF generation using pdfkit

**Current Implementation Status**: ✅ Fully implemented with server-side PDF generation

---

### 11. Notifications Center

**Requirement**: Users must receive timely notifications about system events and achievements.

**Acceptance Criteria**:
- Notification bell icon in header shows unread count
- Notification panel displays recent notifications with:
  - Category (achievement, system, reminder, community)
  - Title and message
  - Timestamp
  - Read/unread state
- Mark all as read action
- Clear all action
- Individual notification actions (mark read, dismiss)
- Notifications persist locally per user
- Notification triggers include:
  - First problem solved
  - Streak milestones
  - Placement completion
  - System announcements

**Current Implementation Status**: ✅ Fully implemented with local persistence

---

### 12. Community & Peer Learning (Prototype)

**Requirement**: Users should have access to peer discussion and knowledge sharing.

**Acceptance Criteria**:
- Community page displays discussion threads
- Filter threads by: all, unanswered, helpful, trending, problem-linked
- Group shortcuts for topic-specific discussions
- Thread composer for creating new posts
- Thread detail view with replies
- Upvote/helpful marking
- Linked problem references
- Top helpers leaderboard
- Trending topics widget

**Current Implementation Status**: ⚠️ UI fully implemented, backed by static seed data (not live backend)

---

### 13. Premium Features (AWS-Backed)

**Requirement**: Advanced users should have access to premium analytics and narration.

**Acceptance Criteria**:
- **Streak Risk Prediction**: SageMaker model predicts likelihood of streak break based on recent activity patterns
- **Weekly Recap Narration**: AWS Polly generates audio summary of weekly progress in user's preferred language
- **Cohort Analytics**: Compare personal metrics against anonymized cohort averages
- **Live Mental State**: Real-time updates to recovery metrics via AppSync subscriptions

**Current Implementation Status**: ⚠️ Infrastructure and integration code exist, but require AWS configuration to activate

---

## Non-Functional Requirements

### Performance
- Page load time < 2 seconds on 3G connection
- Code execution response time < 5 seconds for typical problems
- Editor typing latency < 50ms
- Analytics dashboard renders < 1 second with 1000+ events

### Reliability
- Graceful degradation when AWS services unavailable (fall back to local execution/analytics)
- No data loss on browser refresh (local persistence)
- Timeout handling for long-running code
- Error boundaries prevent full app crashes

### Security
- No AWS credentials exposed in frontend
- Cognito-backed authentication with secure token handling
- Code execution sandboxed with timeout enforcement
- Input sanitization for user-generated content
- CORS configuration for avatar uploads

### Accessibility
- Keyboard navigation support
- Focus-visible states on interactive elements
- Semantic HTML structure
- ARIA labels for screen readers
- High contrast theme options

### Scalability
- Local-first architecture reduces backend load
- Optional cloud sync for multi-device support
- CDK infrastructure supports horizontal scaling
- Event-driven analytics pipeline

## Success Metrics

### User Engagement
- Daily active users
- Average session duration
- Problems attempted per session
- Return rate (7-day, 30-day)

### Learning Outcomes
- Recovery effectiveness improvement over time
- Autonomy rate growth
- Streak length distribution
- Problem difficulty progression

### Platform Health
- Code execution success rate
- Coach response quality (measured by retry rate)
- Authentication success rate
- Error rate by component

## Out of Scope (Current Prototype)

The following features are intentionally excluded from the current prototype:
- Live multiplayer coding sessions
- Video tutorials or course content
- Paid subscription tiers
- Mobile native apps (iOS/Android)
- Contest or competition modes
- Social features beyond basic community threads
- Code review or mentor matching
- Integration with external learning platforms
- Blockchain or NFT-based achievements

## Future Enhancements

Potential directions for post-prototype development:
- Expand problem library to 500+ curated problems
- Add hidden test coverage for all problems
- Implement live backend for community features
- Develop mobile-responsive PWA
- Add voice-based coaching for accessibility
- Integrate with placement portals and job boards
- Build curriculum paths for specific interview prep (FAANG, startups, etc.)
- Add collaborative debugging sessions
- Implement spaced repetition for problem review

## Conclusion

PebbleCode represents a paradigm shift in coding practice platforms—from acceptance-focused to recovery-focused learning. By treating failure as the primary learning moment and providing context-aware, tiered mentorship, PebbleCode helps users develop not just coding skills, but the resilience and problem-solving mindset required for real-world software development.

The current prototype demonstrates the viability of this approach through a polished, end-to-end implementation that includes professional IDE tooling, multi-language execution, AI-powered coaching, comprehensive analytics, and multilingual accessibility—all grounded in a serious technical architecture that can scale to production use.
