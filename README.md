# AssetFlow

AssetFlow is a modern asset management application structured as a monorepo.

## Project Structure
- `/client`: React + Vite + Tailwind CSS v4 frontend.
- `/server`: Node.js + Express + Socket.io + PostgreSQL backend.

## Quick Start

### 1. Install Dependencies
Run the following command at the root of the project to install all dependencies for both the client and server:
```bash
npm run install-all
```

### 2. Configure Environment Variables
Create a file named `.env` in the `/server` directory and define your `DATABASE_URL` and desired port:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/assetflow
```
*(Make sure to adjust the credentials, host, and database name to match your local PostgreSQL instance.)*

### 3. Run the Development Environment
Start both the client and server concurrently with:
```bash
npm run dev
```

## Database Management
No manual SQL scripts need to be run to set up the schema. 
- On server start, `server/db/init.js` automatically initializes all 13 core tables if they do not exist:
  `departments`, `categories`, `users` (representing employees/users), `assets`, `allocations`, `transfers`, `resources`, `bookings`, `maintenance_requests`, `audit_cycles`, `audit_items`, `activity_log`, and `notifications`.
- Demo data from `seed.sql` will be automatically populated if the `departments` table is empty.
