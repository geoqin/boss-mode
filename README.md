# Boss Mode 👔

A personal accountability task manager with stern motivation. Stay on track, get things done, and receive no-nonsense feedback when you slack off.

## Features

- 😤 **Boss Personality** - Dynamic face & messages based on productivity (gets angry if you slack!)
- ✅ **Task Management** - Create, edit, and delete tasks with subtasks
- 💬 **Comments** - Add context to your tasks, including daily notes for recurring tasks
- 📅 **Recurring Tasks** - Smart recurrence with single-instance list view and 30-day timeline
- 📁 **Categories** - Organize tasks with custom color-coded categories
- 🌓 **Light/Dark Mode** - Beautifully designed themes
- 🔔 **Push Notifications** - Browser notifications for upcoming deadlines

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL + Auth)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project

### Setup

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd boss-mode
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.local.example .env.local
   ```
   Add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Set up database**
   
   Run the schema in your Supabase SQL Editor:
   ```bash
   # Copy contents of supabase/schema.sql to Supabase SQL Editor
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── auth/         # AuthProvider
│   │   ├── boss/         # BossMessage
│   │   ├── dashboard/    # Header, FilterBar, ProgressBar
│   │   ├── tasks/        # TaskForm, TaskList
│   │   └── timeline/     # TimelineView
│   ├── dashboard/        # Main dashboard page
│   ├── account/          # Account settings
│   ├── login/            # Auth page
│   └── types/            # TypeScript interfaces
├── hooks/                # useNotifications, useBossReminders
└── lib/supabase/         # Supabase client utilities
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run lint` | Run ESLint |

## License

MIT
