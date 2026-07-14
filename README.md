# 🌌 StudyOS: The Ultimate Adaptive Study Planner

StudyOS is a state-of-the-art, high-performance **Study Management System & Learning Platform** designed to turn chaotic study schedules into structured, stress-free, and high-efficiency learning journeys. 

Unlike traditional calendar planners that break the moment you fall behind, StudyOS features an **adaptive engine** that dynamically reschedules your syllabus, integrates **spaced repetition (Leitner System)**, tracks previous year questions (PYQs) with live accuracy stats, and provides detailed analytics on your productivity.

While originally seeded with GATE CSE syllabus configurations, StudyOS is designed for **any student** preparing for **any exam** (e.g., UPSC, JEE, SAT, USMLE, CFA, university courses, or self-paced coding bootcamps).

---

## 📸 App Walkthrough & Page Previews

### 1. Unified Student Dashboard
An ultra-modern landing page showing your exam countdown, current syllabus progress via a neon circular dial, today's auto-generated study plan, and an overview of subject-wise completion rates.
![Dashboard Preview](public/screenshots/dashboard.jpg)

### 2. Adaptive Study Planner & Roadmap
A drag-and-drop roadmap calendar that maps out exactly what lectures to study each day based on your target exam finish date and daily target study hours. If you fall behind or study ahead, simply drag items to reorder them.
![Roadmap Planner Preview](public/screenshots/roadmap.jpg)

### 3. Spaced Repetition & Revision Dashboard
Never forget what you learn. Powered by the **Leitner Box System**, this view schedules your topics for review at increasing intervals based on how well you recall them.
![Revision Dashboard Preview](public/screenshots/revision.jpg)

### 4. Interactive PYQ (Previous Year Questions) Engine
Practice actual exam questions organized by subject and topic. Supports full LaTeX formula rendering for equations and detailed step-by-step solution viewing.
![PYQ Engine Preview](public/screenshots/pyqs.jpg)

### 5. Detailed Productivity Analytics
Interactive charts visualizing your weekly study hours distribution, subject completion rates, target efficiency logs, and test accuracy metrics.
![Productivity Analytics Preview](public/screenshots/analytics.jpg)

---

## 💡 Key Features & Benefits for Any Student

| Feature | How it Works | Core Benefit for Students |
| :--- | :--- | :--- |
| **Adaptive Roadmap Engine** | Distributes study lectures across days based on your Target Finish Date and Daily Hours Goal. | **Eliminates Planning Fatigue**: No more manually creating schedules. If you miss a day, the system instantly recalculates your timeline. |
| **Leitner Revision System** | Places completed lectures into revision boxes (Box 1-5). Cards move up as you recall them successfully, and reset to Box 1 if forgotten. | **Guarantees Long-Term Retention**: You spend time only on topics you are about to forget, saving hundreds of hours of redundant review. |
| **High-Priority Highlights** | Identifies and visually flags highly important modules and lectures with glowing micro-animations. | **Focuses Your Energy**: Helps you prioritize high-weightage topics first when time is short. |
| **LaTeX Question Engine** | Full markdown and LaTeX math notation renderer for practicing complex questions. | **Accurate STEM Learning**: Perfect for Engineering, Physics, Math, Finance, or Medical students who require precise formatting and equations. |
| **Custom Question Seeding** | Allows students to input custom questions, answers, and detailed step-by-step explanations. | **Extremely Flexible**: Can be adapted for any exam in the world by pasting your own syllabus, study notes, or question banks. |
| **Granular Analytics** | Tracks metrics like historical study times, PYQ accuracy percentages, and projected vs actual target dates. | **Data-Driven Improvement**: Pinpoint which subjects are dragging down your accuracy or which days you are most productive. |

---

## 🛠 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Turbopack)
- **Database / Auth**: [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security, SSR client helper, Realtime status synchronization)
- **Styling**: [TailwindCSS 4](https://tailwindcss.com/) with Vanilla CSS custom animations (glowing glitter cards, custom glassmorphism components)
- **Drag-and-Drop**: [@dnd-kit/core](https://docs.dndkit.com/) & `@dnd-kit/sortable`
- **Charts**: [Recharts](https://recharts.org/) for beautiful, responsive SVG analytics
- **Formula Rendering**: [KaTeX](https://katex.org/) for fast LaTeX mathematical equation typesetting
- **Date Handling**: [date-fns](https://date-fns.org/) for robust date calculation and formatting

---

## 🚀 Getting Started

### 📋 Prerequisites
Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v18.x or later)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### 🔧 Local Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/tanmayrajDTU/StudyOS.git
   cd StudyOS
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env.local` file in the root directory and specify your Supabase project keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   DATABASE_URL="postgresql://postgres.your_project_ref:your_password@aws-0-region.pooler.supabase.com:5432/postgres?sslmode=require"
   ```

4. **Initialize the Database Schema**
   You can easily push the database tables, triggers, and functions directly using the migration script:
   ```bash
   node supabase/migrate-and-seed.js
   ```

5. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to view your new workspace!

---

## 🔐 Development Credentials (Local Testing)
For local testing and verification, the middleware restricts access to authorized developers:
- **Developer Email**: `tanmayraj1705@gmail.com`
- **Password**: `Tanmay12@#`

*(Note: Sign in using the credentials above, or use the "New local setup? Sign Up instead" option to register this email with your local Supabase authentication instance).*
