# 🏥 ICU AI Monitoring System — Complete Full-Stack Project

## Tech Stack
- Frontend: React + Vite + React Router + Recharts + Socket.IO Client
- Backend: Node.js + Express.js + Socket.IO
- Storage: JSON Files + CSV Files (No MongoDB needed)
- Auth: JWT + bcryptjs

## Quick Start

### Terminal 1 — Backend
```bash
cd icu-system/backend
npm install
node server.js
```

### Terminal 2 — Frontend
```bash
cd icu-system/frontend
npm install
npm run dev
```
Open: http://localhost:3000

## Login Credentials
| Role   | Email             | Password   |
|--------|-------------------|------------|
| Admin  | admin@icu.med     | admin123   |
| Doctor | doctor@icu.med    | doctor123  |
| Nurse  | nurse@icu.med     | nurse123   |

## Data Storage
- backend/data/users.json          — All registered users
- backend/data/patients.json       — All patient records
- backend/data/alerts.json         — Emergency alerts
- backend/data/settings.json       — System settings
- backend/data/login_activity.json — Security/login log
- backend/data/vitals-csv/         — One CSV per vital sign
  - heart_rate.csv
  - oxygen_level.csv
  - blood_pressure.csv
  - temperature.csv
  - respiratory_rate.csv
  - all_vitals.csv

## Pages
- /           Login
- /register   Register
- /dashboard  ICU Live Monitor
- /patients/:id  Patient Details + CSV Download
- /analytics  AI Analytics + Charts + CSV Download
- /alerts     Alert Center + Acknowledgement
- /security   Login Activity + User Management (admin)
- /settings   System Config + CSV Management
