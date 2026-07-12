<div align="center">

<img src="client/public/logo.png" alt="Briefcase" width="80" height="80" /><br>

<img src="https://readme-typing-svg.demolab.com?font=Poppins&size=22&duration=3000&pause=800&color=714B67&center=true&vCenter=true&width=650&lines=AssetFlow" alt="Typing SVG" />

<br/>

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=714B67)
![Node.js](https://img.shields.io/badge/Node.js-20232A?style=for-the-badge&logo=node.js&logoColor=714B67)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-20232A?style=for-the-badge&logo=postgresql&logoColor=714B67)
![Socket.io](https://img.shields.io/badge/Socket.io-20232A?style=for-the-badge&logo=socket.io&logoColor=714B67)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-20232A?style=for-the-badge&logo=tailwindcss&logoColor=714B67)

![Hackathon](https://img.shields.io/badge/Odoo%20Hackathon-2026-714B67?style=flat-square)
![Team](https://img.shields.io/badge/Team-Codinity-714B67?style=flat-square)
![Status](https://img.shields.io/badge/Status-Built%20in%208%20hours-714B67?style=flat-square)

</div>

---

## so what actually is this

Every college, hospital, factory, or office has the same problem — nobody actually knows where their stuff is. Someone took the projector three weeks ago and it's "somewhere in HR." A laptop got handed off twice and nobody updated the sheet. The conference room got double-booked again because two people were editing the same Excel tab.

**AssetFlow** is our answer to that. It's a single dashboard where an organization can register every physical asset they own, allocate it to people or departments, book shared resources without collisions, push maintenance requests through an actual approval chain, and run scheduled audits that catch what went missing — instead of finding out six months later.

We built this for the **Odoo Hackathon 2026** in 8 hours, following the official problem statement and mockup Odoo's mentors gave us. Not a toy demo — this is meant to survive a real walkthrough by judges clicking through every screen.

---

## table of contents

- [the problem, properly](#the-problem-properly)
- [what it does](#what-it-does)
- [tech stack](#tech-stack)
- [how it's structured](#how-its-structured)
- [screens](#screens)
- [running it yourself](#running-it-yourself)
- [the double-allocation block (our favorite part)](#the-double-allocation-block-our-favorite-part)
- [team](#team)
- [what we'd add with more time](#what-wed-add-with-more-time)
- [license](#license)

---

## the problem, properly

Odoo's brief for this hackathon was simple on paper: build an ERP module for tracking assets and shared resources, without touching purchasing or accounting. The catch was in the details — the system has to actually *prevent* bad states, not just log them after the fact:

- an asset can't be allocated to two people at once — it has to get blocked and offer a transfer request instead
- a meeting room can't be double-booked — overlapping time slots get rejected, but back-to-back ones are fine
- a maintenance repair can't start without going through an approval step first
- audits have to catch discrepancies automatically, not rely on someone remembering to check

So this isn't a CRUD app with extra steps. Every module has a rule sitting behind it that actually gets enforced server-side.

---

## what it does

<table>
<tr>
<td width="50%" valign="top">

**🔐 Login & Signup**
Signing up only ever creates a plain Employee account. Nobody self-promotes to Admin — roles get handed out later from the Employee Directory, by an Admin, on purpose.

**📊 Dashboard**
Live KPI cards — available assets, allocated, active bookings, pending transfers, upcoming returns — plus overdue items flagged separately in red so they don't get lost in the noise.

**🏢 Organization Setup**
Departments (with hierarchy), asset categories, and the employee directory all live here. This is also the *only* place an Admin can promote someone to Department Head or Asset Manager.

**📦 Asset Registry**
Register anything — laptop, chair, forklift, van. Auto-generated tag numbers (AF-0001, AF-0002...), full search by tag/serial/QR/location, and a status that actually reflects reality: Available, Allocated, Reserved, Under Maintenance, Lost, Retired, Disposed.

</td>
<td width="50%" valign="top">

**🔄 Allocation & Transfer**
Try to allocate something that's already taken and the system stops you cold, tells you who has it, and hands you a transfer request instead of letting you overwrite the record.

**📅 Resource Booking**
Time-slot booking for rooms, vehicles, shared equipment. Overlapping requests get rejected automatically; back-to-back slots go through fine.

**🛠️ Maintenance**
A kanban board — Pending → Approved → Technician Assigned → In Progress → Resolved. The asset's status flips to "Under Maintenance" automatically the moment a request gets approved, and back to "Available" the moment it's resolved.

**🔍 Audit Cycles**
Set a scope, assign auditors, and let them mark every asset Verified, Missing, or Damaged. Closing the cycle locks it and auto-updates anything confirmed missing to "Lost."

**📈 Reports & 🔔 Notifications**
Utilization charts, idle-asset lists, maintenance frequency — plus a live notification feed powered by Socket.io so nothing needs a page refresh to show up.

</td>
</tr>
</table>

---

## tech stack

| Layer | What we used | Why |
|---|---|---|
| Frontend | React + Vite + TailwindCSS | fast dev loop, no build config headaches during a timed hackathon |
| Backend | Node.js + Express | simple, everyone on the team already knew it |
| Database | PostgreSQL | relational data (departments → employees → assets → allocations) actually needs real foreign keys |
| Realtime | Socket.io | bookings, kanban drags, and notifications update live across everyone's screen without polling |
| Auth | JWT + bcrypt | stateless, no session store to manage under time pressure |

No purchasing, invoicing, or accounting logic — that was explicitly out of scope in the brief, and we kept it that way instead of scope-creeping into something half-finished.

---

## how it's structured

```
assetflow/
├── client/                 # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/           # one folder per screen (Dashboard, Assets, Booking...)
│   │   ├── components/
│   │   ├── context/          # auth context, socket context
│   │   └── api/               # axios calls, grouped by module
│
├── server/
│   ├── db/
│   │   ├── schema.sql        # CREATE TABLE IF NOT EXISTS for everything
│   │   ├── seed.sql          # demo departments/categories/assets
│   │   └── init.js           # runs schema + seed automatically on server start
│   ├── routes/
│   ├── controllers/
│   └── sockets/               # booking, maintenance, notification events
│
├── .env.example
└── README.md
```

We kept it a plain monorepo, no Docker, no ORM magic — partly because it's faster to explain to judges in 90 seconds, and partly because none of us wanted to debug a Docker network issue at 3am mid-hackathon.

---

## screens

> *(drop your actual screenshots or a short screen-recording GIF here before submission — this is the one section judges actually look at first)*

```
[ Login ]  →  [ Dashboard ]  →  [ Organization Setup ]  →  [ Asset Registry ]
     →  [ Allocation & Transfer ]  →  [ Resource Booking ]  →  [ Maintenance Kanban ]
     →  [ Audit Cycles ]  →  [ Reports & Analytics ]  →  [ Notifications ]
```

Every screen follows the same visual language — Odoo's purple (`#714B67`) as the accent, white everywhere else, status pills color-coded instead of buried in text.

---

## running it yourself

You genuinely don't need to touch Postgres by hand. Clone it, point it at a database, run it — the schema and demo data build themselves the first time the server starts.

```bash
git clone https://github.com/PDA-DP-Shop/assetflow.git
cd assetflow

# backend
cd server
npm install
cp .env.example .env        # set your own DATABASE_URL inside
npm run dev                 # tables + demo data auto-create here, watch the terminal log

# frontend, in a second terminal
cd client
npm install
npm run dev
```

Open `http://localhost:5173`, log in with the seeded demo admin account (check `seed.sql` for the exact credentials), and you're looking at a fully populated system — departments, categories, a handful of assets, a couple of bookings — no manual setup, no empty screens.

---

## the double-allocation block (our favorite part)

This is the one rule in the whole brief that actually makes the system feel "real" instead of "form with a database behind it," so it's worth calling out on its own.

Priya has Laptop AF-0114 allocated to her. Someone else — say Raj — tries to allocate the exact same laptop to himself. Instead of silently overwriting Priya's record (which is what a naive CRUD form would do), AssetFlow:

1. checks the asset's current status server-side before allowing the allocation
2. rejects it with a 409 and tells Raj exactly who currently holds it
3. swaps the "Allocate" button for a "Submit Transfer Request" flow instead

The transfer then has to go through an actual approval step (Asset Manager or Department Head) before the history updates and the asset moves to Raj. Same logic applies to resource bookings — overlapping time slots get rejected the same way, at the database query level, not just in the UI.

---

## team

Team Codinity built this end to end during the hackathon window — schema, backend, frontend, and the realtime layer, split by module so everyone owned a full vertical slice instead of stepping on each other's files.

| | Name | Role |
|---|---|---|
| 🧭 | **Devansh** | Lead — auth, dashboard, organization setup, integration |
| 🧩 | **Rudra Modi** | Asset registry, allocation & transfer |
| ⏱️ | **Udit Rana** | Resource booking, maintenance kanban, realtime layer |
| 📋 | **Mit Prajapati** | Audit cycles, reports & analytics, notifications |

---

## what we'd add with more time

Being honest about this instead of pretending it's finished:

- QR-code scanning for asset check-in/out instead of manual search
- email notifications alongside the in-app ones (Nodemailer's already in our other projects, just didn't fit in 8 hours)
- proper role-based UI hiding, not just route guards
- mobile-responsive pass — this was built desktop-first for the demo

---

## license

MIT — built for the Odoo Hackathon 2026, use whatever's useful out of it.

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=waving&color=714B67&height=120&section=footer" width="100%"/>
</div>
