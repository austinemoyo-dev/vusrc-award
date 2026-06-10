# VUSRC Awards Platform — Complete Setup Guide

This guide will walk you through everything you need to do to get the VUSRC Awards voting platform running on your computer. **Read each step carefully before doing anything.** Do not skip steps.

---

## What This App Does

This is a web application that lets Vision University students vote for awards during Student Week. Students log in with their matric number and a PIN, then cast one vote per award category. The results are shown live on a display screen at the event.

---

## What You Need Before You Start

Before touching any code, make sure you have these things installed on your computer. If you already have them, skip to the next section.

### 1. Node.js

Node.js is the engine that runs this app. You need **version 18 or higher**.

- Go to: **https://nodejs.org**
- Click the big green button that says **"LTS"** (do NOT pick "Current")
- Download and run the installer
- Click Next → Next → Install → Finish
- To confirm it worked, open a terminal (see below) and type:
  ```
  node --version
  ```
  You should see something like `v20.11.0`. If you do, Node.js is installed.

### 2. How to Open a Terminal

A terminal is a text window where you type commands. Here is how to open one:

- **Windows:** Press the `Windows` key, type `cmd`, and press Enter. Or press `Windows + R`, type `cmd`, press Enter.
- **Mac:** Press `Command + Space`, type `Terminal`, press Enter.

You will be typing all commands in this terminal window.

### 3. A Supabase Account (Free)

Supabase is the database service this app uses to store student data, votes, and results. It is free.

- Go to: **https://supabase.com**
- Click **"Start your project"**
- Sign up with your GitHub or Google account (or create a new account)
- Once you are logged in, you are ready

---

## Step-by-Step Setup

### STEP 1 — Get the Project Files onto Your Computer

Open your terminal. Navigate to where you want to keep this project. For example, to put it on your Desktop:

**Windows:**
```
cd Desktop
```

**Mac:**
```
cd ~/Desktop
```

Then run:
```
cd "c:\Users\CEMEX\Music\vusrc\vusrc-awards"
```

> **Note:** The project folder `vusrc-awards` already exists on this computer at `c:\Users\CEMEX\Music\vusrc\vusrc-awards`. If you are setting this up on a **different computer**, you would clone it from GitHub first (your developer will give you the link).

---

### STEP 2 — Install the App's Dependencies

Think of dependencies like ingredients a recipe needs. The app needs certain packages to work. To install them, run:

```
npm install
```

This will download everything the app needs. It may take 1–3 minutes. You will see a lot of text scrolling — that is normal. Wait for it to finish. You will know it is done when you see your cursor blinking again on a new line.

> **Do NOT close the terminal while this is running.**

---

### STEP 3 — Create Your Supabase Project (Database)

This is where the student data, votes, and results will be stored.

1. Go to **https://supabase.com** and log in
2. Click the green **"New project"** button
3. Fill in the details:
   - **Name:** `vusrc-awards` (or anything you like)
   - **Database Password:** Type a strong password and **save it somewhere safe** — you will need it later
   - **Region:** Choose the one closest to Nigeria (e.g. `West EU (Ireland)` is usually fine — there is no African region yet)
4. Click **"Create new project"**
5. Wait about 1–2 minutes while Supabase sets up your database. You will see a loading screen.

---

### STEP 4 — Get Your Supabase Keys

Your "keys" are secret codes that allow the app to talk to the database. You need three of them.

1. In your Supabase project, click **"Project Settings"** in the left sidebar (it looks like a gear icon ⚙️)
2. Click **"API"** in the submenu
3. You will see a page with several codes. Find and copy these three:

   | What it's called on the page | What we call it |
   |---|---|
   | **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` |
   | **anon / public** key (under "Project API keys") | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
   | **service_role** key (under "Project API keys") | `SUPABASE_SERVICE_ROLE_KEY` |

   > **WARNING:** The `service_role` key is extremely sensitive. It gives full access to your database. Never share it, never post it online, never put it in a public place.

4. Leave this browser tab open — you will need to paste these values in the next step.

---

### STEP 5 — Set Up Your Environment File

The environment file is like a private settings file that holds your secret keys. The app reads this file to know how to connect to your database.

1. In your terminal, make sure you are in the project folder:
   ```
   cd "c:\Users\CEMEX\Music\vusrc\vusrc-awards"
   ```

2. Open the file called `.env.local` in any text editor. You can use Notepad (Windows) or TextEdit (Mac). The file is at:
   ```
   c:\Users\CEMEX\Music\vusrc\vusrc-awards\.env.local
   ```

   > **Tip (Windows):** Open File Explorer, go to that folder, and look for `.env.local`. If you cannot see it, click **View → Show → Hidden items** in File Explorer.

3. The file looks like this:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   JWT_SECRET=
   ```

4. Paste your Supabase values after the `=` sign on each line. Example of what it should look like when filled in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   JWT_SECRET=any-long-random-string-you-make-up-min-32-characters
   ```

5. For `JWT_SECRET`, make up any long random string of letters and numbers — at least 32 characters. For example:
   ```
   JWT_SECRET=vusrc2025awardsSecretKeyDoNotShare99
   ```

6. Save the file. **Do not add any spaces around the `=` sign.**

> **DO NOT:** Share this file with anyone. Do not upload it to GitHub. Do not send it over WhatsApp. It contains your database password.

---

### STEP 6 — Set Up the Database Tables

Now you need to create the actual tables inside your Supabase database (tables are like spreadsheets that store the data). You will do this by running 3 SQL files, one at a time, in a specific order.

**How to run a SQL file in Supabase:**
1. In your Supabase project, click **"SQL Editor"** in the left sidebar
2. Click **"New query"** (a blank editor will open)
3. Open the SQL file from your computer in Notepad (or any text editor), select all the text inside (`Ctrl+A`), copy it (`Ctrl+C`)
4. Click inside the Supabase SQL editor box and paste (`Ctrl+V`)
5. Click the green **"Run"** button
6. Wait for it to finish. You should see a success message at the bottom.

**Run these files IN THIS EXACT ORDER:**

#### 6a. Run `schema.sql` first
- File location: `c:\Users\CEMEX\Music\vusrc\vusrc-awards\supabase\schema.sql`
- This creates all the database tables (students, votes, categories, nominees, etc.)
- After running: you should see "Success. No rows returned."

#### 6b. Run `rls.sql` second
- File location: `c:\Users\CEMEX\Music\vusrc\vusrc-awards\supabase\rls.sql`
- This sets up security rules so that only the right people can read or write each table
- After running: you should see "Success. No rows returned."

#### 6c. Run `storage.sql` third
- File location: `c:\Users\CEMEX\Music\vusrc\vusrc-awards\supabase\storage.sql`
- This creates two file storage areas: one for nominee photos and one for category banner images
- After running: you should see "Success. No rows returned."

> **If you see an error in red:** Do not panic. Read the error message. The most common mistake is running the files in the wrong order. If that happens, you may need to delete the Supabase project and start Step 3 again.

---

### STEP 7 — Enable Realtime for the Display Screen

The live display screen (the one shown at the event on a projector) updates automatically without needing to refresh the page. For this to work, you need to turn on a feature called "Realtime" for the display table.

1. In Supabase, click **"Database"** in the left sidebar
2. Click **"Replication"**
3. Find the table called `display_state` in the list
4. Toggle it **ON** (the toggle should turn green/blue)
5. Click **"Save"** if there is a save button

---

### STEP 8 — Import the Student List

This step loads all the student data into the database so students can log in to vote.

**What you need:** A CSV file of students exported from CAMS (the university's student management system). The file must have these column headers exactly:

```
matric_number, full_name, department, level, phone_number
```

**Steps:**

1. Place your CSV file in this folder:
   ```
   c:\Users\CEMEX\Music\vusrc\vusrc-awards\scripts\data\
   ```
   Rename it to `students.csv` if it has a different name.

2. In your terminal, make sure you are in the project folder:
   ```
   cd "c:\Users\CEMEX\Music\vusrc\vusrc-awards"
   ```

3. Run the import command:
   ```
   npx ts-node scripts/import-students.ts --file scripts/data/students.csv
   ```

4. The script will print a summary like this:
   ```
   Processing 432 rows from scripts/data/students.csv...

   --- Import Summary ---
   Total rows:  432
   Inserted:    430
   Updated:     0
   Skipped:     2
   ```

   - **Inserted** = new students added
   - **Updated** = students that already existed and were refreshed
   - **Skipped** = rows with missing matric number or name (the script will tell you which ones)

5. You can run this command multiple times safely — it will not create duplicates. If the CSV file changes (e.g. more students added), just run it again.

> **DO NOT** commit or upload the `students.csv` file to GitHub — it contains personal student data. The `.gitignore` file already prevents this, but be careful.

---

### STEP 9 — Start the App

You are now ready to run the app on your computer.

In your terminal:
```
npm run dev
```

You will see output like:
```
▲ Next.js 16.2.7
- Local: http://localhost:3000
```

Open your browser and go to: **http://localhost:3000**

You should see the VUSRC Awards landing page. The app is running.

> **To stop the app:** Go to the terminal and press `Ctrl + C`. The app will shut down.

> **To start it again:** Run `npm run dev` again.

---

## All the Pages and What They Do

| Page URL | What it is for |
|---|---|
| `http://localhost:3000/` | The landing page students see first |
| `http://localhost:3000/login` | Where students enter their matric number and PIN |
| `http://localhost:3000/vote` | List of all open award categories |
| `http://localhost:3000/vote/[category-name]` | The voting page for one specific category |
| `http://localhost:3000/display` | The fullscreen live results screen (shown on projector at the event) |
| `http://localhost:3000/display/controller` | The controller page used to change what the projector shows |
| `http://localhost:3000/admin` | Admin dashboard |
| `http://localhost:3000/admin/categories` | Create and manage award categories |
| `http://localhost:3000/admin/nominees` | Add and manage nominees for each category |
| `http://localhost:3000/admin/students` | View imported students, reset PINs if students forget them |
| `http://localhost:3000/admin/results` | See live vote counts per category |
| `http://localhost:3000/admin/overrides` | Superadmin only — manual vote adjustments (fully logged) |

---

## Important Rules — Read These Carefully

### Things You Must NEVER Do

- **Never share your `.env.local` file.** It contains secret keys. If someone gets these keys, they can delete your entire database.
- **Never share the `service_role` key from Supabase.** This key bypasses all security. Treat it like a password to everything.
- **Never commit `.env.local` to GitHub.** The `.gitignore` file protects you from doing this by accident, but always double-check.
- **Never upload the student CSV file to GitHub or any public place.** It contains student personal information.
- **Never run `npm audit fix --force`** unless you know what you are doing — it can break the app.

### Things That Are Normal (Do Not Panic)

- Seeing a lot of text scroll when you run `npm install` — that is normal.
- The terminal showing warnings (yellow text) is usually fine. Only red errors need attention.
- The app taking a few seconds to load the first time — that is normal.

---

## If Something Goes Wrong

### "command not found: node" or "node is not recognized"
Node.js is not installed. Go back to **Step 1** and install it.

### "Cannot find module" error when starting the app
You skipped `npm install`. Go back to **Step 2** and run it.

### "Error: Missing environment variables"
Your `.env.local` file is empty or has a typo. Go back to **Step 5** and fill it in correctly.

### App loads but shows a database error
Your Supabase keys might be wrong, or the SQL files were not run. Check Step 4 and Step 6.

### Import script says "0 inserted"
Your CSV file column headers might be spelled differently. Make sure they are exactly: `matric_number`, `full_name`, `department`, `level`, `phone_number`.

### A page shows "501 Not Implemented"
That page's backend logic has not been built yet — this is expected in Phase 1. The full voting and admin features will be added in later phases.

---

## Quick Reference — Commands to Know

| What you want to do | Command to run |
|---|---|
| Install/reinstall everything | `npm install` |
| Start the app (development) | `npm run dev` |
| Build the app (production check) | `npm run build` |
| Import students from CSV | `npx ts-node scripts/import-students.ts --file scripts/data/students.csv` |
| Stop the running app | Press `Ctrl + C` in the terminal |

---

## Who to Contact If You're Stuck

If you have followed every step and something still does not work, take a screenshot of the error message and send it to your developer. Do not try to fix errors by randomly changing things — you may make it harder to debug.
