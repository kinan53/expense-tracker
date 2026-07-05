# Mobile-Friendly Expense Tracker

A simple, beautiful, and secure mobile-friendly expense tracker built with **Next.js**, **Tailwind CSS (v4)**, and **Supabase**. It generates instant Google Pay QR codes (UPI payments) and deep-links to WhatsApp to remind users to pay.

## 🚀 Key Features

1. **Dashboard Gate**: Simple password protection (stored in `.env.local` or customized directly in Settings).
2. **Add Expenses**: Rapidly add description, amount, payee name, and WhatsApp number.
3. **Responsive Entries Sidebar**: Collapses into a drawer on mobile devices, showing paid/pending status and totals.
4. **Google Pay QR Code Generator**: Generates client-side QR codes for any UPI ID using standard payment URI formats (`upi://pay`).
5. **Direct WhatsApp Sharing**: Send pre-filled payment reminders with active Google Pay payment links and QR codes via WhatsApp click-to-chat (`wa.me`).

---

## 🛠️ Step 1: Set up Supabase Database

1. Create a project at [Supabase](https://supabase.com).
2. Open your Supabase project dashboard, navigate to the **SQL Editor** in the left sidebar, and click **New Query**.
3. Paste and run the following database schema to create the `expenses` table:

```sql
-- Create expenses table
create table public.expenses (
  id uuid default gen_random_uuid() primary key,
  description text not null,
  amount numeric(10, 2) not null,
  person_name text,
  person_phone text,
  status text not null default 'pending', -- 'pending' or 'received'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.expenses enable row level security;

-- Create policy to allow all operations for public anon key
create policy "Allow all operations for anyone with public anon key"
on public.expenses for all
using (true)
with check (true);
```

---

## 🔑 Step 2: Configure Environment Variables

Create a `.env.local` file in the root of your project:

```env
# Supabase Keys (Found in Supabase Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Access Password (Defaults to admin123 if not set)
NEXT_PUBLIC_ADMIN_PASSWORD=admin123
```

---

## 💻 Step 3: Run Locally

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚡ Step 4: Deploying to Vercel

1. Push this repository to GitHub/GitLab.
2. Link it in [Vercel](https://vercel.com).
3. Under **Environment Variables**, add the environment variables defined in your `.env.local` file:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_ADMIN_PASSWORD`
4. Deploy!
