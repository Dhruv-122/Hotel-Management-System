# 🏨 Hotel Management System (MERN Stack Architecture)

A comprehensive, production-ready full-stack **Hotel Management System** designed for the MERN Stack Technical Assessment at **Kodemelon Technologies**.

This system implements all key management desks: **Rooms Management**, **Guests Registry**, **Booking Desk**, **Dining Room Services**, and a real-time analytical **Operations Dashboard**, coupled with automated CGST/SGST tax calculators and a **printer-friendly GST tax invoice** compiler.

---

## 🏗️ Technical Architecture & Design Decisions

### 1. Unified TypeScript Stack
We have decoupled from traditional separate JS runtimes and implemented **end-to-end type safety**. The types defined in `src/types.ts` are shared dynamically by both the Express API routes (backend) and the React layout nodes (frontend), preventing runtime drift and parameter mismatch.

```
       [ React Frontend ]  <--- (Type Checked via src/types.ts) --->  [ Express Backend ]
               |                                                              |
    (Tailwind v4 Styling)                                           (Durable JSON DataStore)
```

### 2. Database Design & Persistence Layer
For clean development-box execution and single-container portability, the application incorporates a durable, low-latency **Local DataStore Engine** (`server/db.ts`). It emulates MongoDB collection behavior with atomic file writes to local JSON schemas:
- **`rooms.json`**: Tracks Room configurations, nightly tariffs, and live occupancy status.
- **`guests.json`**: Captures guest names, emails, phones, and official ID configurations.
- **`bookings.json`**: Manages reservation dates, stay durations, occupancy counts, and check-in timelines.
- **`orders.json`**: Links room-service dining orders directly with checked-in occupancy IDs.
- **`invoices.json`**: Archives finalized billing transactions for tax audit ledgers.

### 3. Smart Validation and Business Logic
- **Booking Overlap Prevention**: The booking mechanism utilizes interval checking: `(StartA < EndB) && (EndA > StartB)`. If the room is already booked or occupied during the selected date bounds, the API throws a `400 Bad Request` with an explanatory error.
- **Room Capacity Guard**: Ensures that the number of scheduled occupants does not exceed the structural capacity of the selected room category.
- **Active Occupancy Enforcement**: Dining orders are strictly bounded to room bookings that are actively checked-in (`CheckedIn`).

---

## 🛠️ Key Functional Modules

### 1. Dashboard Analyzer
- Displays total rooms, available rooms, active checked-in bookings, and total system revenue.
- Animated dynamic SVG ring rendering real-time occupancy rates.
- Urgent maintenance warning panel if any room is marked as `Maintenance`.

### 2. Room Directory
- Complete CRUD interface supporting room categories (`Single`, `Double`, `Deluxe`, `Suite`).
- Automatic tariff recommendations based on configuration.
- Operational status locking (prevents room deletions if an active booking is scheduled).

### 3. Guest Directory
- High-performance contact lookups and identification verification tracking.
- **Visit History Explorer**: Dynamic popup displaying all past reservations, room histories, check-in timestamps, and paid bills.

### 4. Booking Desk
- Step-by-step reservation workflow with date validations.
- **One-click Check-in**: Instantly updates room states to `Occupied` and logs arrival.
- **Dynamic Check-out Console**: Review stay duration, adjust supplementary service charges (e.g. laundry/lounge), apply discounts, and generate final bills.

### 5. Dining Services (F&B)
- Full food menu editor allowing price modifications, description edits, and inventory availability switches.
- Multi-item room service ordering with automatic pricing aggregations.

### 6. Billing & GST Tax Invoices
- Automatic calculation of CGST and SGST at standard 18% tax brackets.
- **Printer-Friendly Tax Invoice Panel**: Formatted with standard invoice layouts (GSTIN, tax columns, company headers) that responds to `CTRL + P` or the print action by hiding sidebar navigation controls.

---

## ⚙️ Project Setup and Execution

To run this application locally, ensure you have **Node.js (v18+)** installed.

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
Launches the full-stack server using Vite's development middleware.
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

### 3. Compile Production Binaries
Bundles the React client into high-performance static pages and bundles the Express backend server with Esbuild.
```bash
npm run build
```

### 4. Execute Production Build
```bash
npm start
```

---

## 📂 Codebase Folder Structure

```
├── data/                    # Durable JSON collection archives
├── server/                  
│   └── db.ts                # Database Read/Write Persistence Engine
├── src/                     
│   ├── components/          # Modular React Components
│   │   ├── Dashboard.tsx    # Live analytical overview card sets
│   │   ├── Rooms.tsx        # Room configuration panels
│   │   ├── Guests.tsx       # Guest contact list & stay history
│   │   ├── Bookings.tsx     # Reservations & check-out bill console
│   │   ├── Dining.tsx       # Food menu catalog & dining ordering
│   │   └── Invoices.tsx     # Settlement ledgers and print panels
│   ├── App.tsx              # Main navigation and app entry shell
│   ├── index.css            # Tailwind custom colors & typography
│   ├── main.tsx             # React bootstrap node
│   └── types.ts             # Shared API & layout interfaces
├── server.ts                # Full-stack REST API and server router
├── tsconfig.json            # TypeScript configuration
└── vite.config.ts           # Bundler rules & proxy parameters
```

---

*Developed for the MERN Stack technical evaluation at Kodemelon Technologies.*
