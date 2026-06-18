# Deploy to Vercel (Frontend + Backend together)

This project runs entirely on Vercel:
- Frontend: Next.js (Vercel Edge)
- Backend:  Express as a Vercel Serverless Function (`api/index.js`)
- Database: MongoDB Atlas (external)

---

## One-time setup

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "initial"
git remote add origin https://github.com/YOUR_USERNAME/designer-craft.git
git push -u origin main
```

### 2. Deploy on Vercel
1. Go to https://vercel.com → **Add New Project**
2. Import your GitHub repo
3. Framework: **Next.js** (auto-detected)
4. **Environment Variables** — add these 2:

   | Name | Value |
   |------|-------|
   | `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/designer-craft?retryWrites=true&w=majority` |
   | `JWT_SECRET`  | Any long random string (64+ chars) |

   > ⚠️  Do NOT set `NEXT_PUBLIC_API_URL` — the app uses same-origin `/api` automatically on Vercel.

5. Click **Deploy**

### 3. Seed the database (first time only)
After deploy, open Vercel → Functions → or run locally:
```bash
MONGODB_URI="your-atlas-uri" JWT_SECRET="any" node api/seed.js
```

Demo accounts:
- `admin@designercraft.com` / `admin123`
- `gayani@designercraft.com` / `emp123`

---

## How it works on Vercel

```
https://your-app.vercel.app/          → Next.js frontend
https://your-app.vercel.app/api/*     → Express (api/index.js serverless function)
```

`vercel.json` routes all `/api/*` traffic to Express, everything else to Next.js.
No CORS issues because both are on the same domain.

---

## Local development

Run Express backend separately:
```bash
# Terminal 1 — backend (install backend deps first)
cd api && npm install express mongoose bcryptjs jsonwebtoken cors dotenv express-validator
node -e "require('dotenv').config({path:'../.env.local'}); require('./index.js').listen(5000)"
```
Or just use the full Next.js dev server which proxies `/api` to localhost:5000.

---

## MongoDB Atlas setup
1. Go to https://cloud.mongodb.com
2. Create a free cluster
3. Database Access → Add user with password
4. Network Access → Add `0.0.0.0/0` (allow all IPs — required for Vercel)
5. Connect → Drivers → copy the connection string
6. Paste into Vercel env var `MONGODB_URI`
