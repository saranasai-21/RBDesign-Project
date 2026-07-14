# LoadFlow — Freight Brokerage Operations Suite

A production-grade, multi-tenant freight brokerage platform designed to streamline logistics operations. LoadFlow connects Shippers, Freight Brokers, and Carriers into a single unified ecosystem with robust Role-Based Access Control (RBAC), load lifecycle management, carrier compliance tracking, rate confirmations, and Proof of Delivery (POD) uploads.

---

## 🌟 Key Features

### 🔐 Multi-Tenant Architecture & RBAC
- **Three Core Organization Types:** Brokerages, Carrier/Trucking Companies, and Shippers.
- **Strict Data Isolation:** Users can only view and interact with data (loads, staff, compliance) that belongs to their specific organization.
- **Dynamic Roles:** Organizations can create custom roles with granular permissions (e.g., `load.create`, `load.view`, `staff.manage`, `compliance.manage`).

### 📦 Comprehensive Load Lifecycle Management
- **Full State Machine:** Loads progress through strict statuses: 
  `Posted` → `Carrier Assigned` → `Rate Confirmed` → `Dispatched` → `In Transit` → `Delivered` → `POD Verified` → `Closed`.
- **Real-Time Dashboards:** Tailored views for Brokers (to manage load boards), Carriers (to view assigned routes), and Shippers (to track active shipments).

### ✅ Automated Carrier Compliance
- **Compliance Tracking:** Monitors MC/DOT numbers, insurance expiry dates, and authority statuses.
- **Safety Flags:** Automatically flags loads if they are assigned to a carrier with expired insurance or suspended authority, preventing dispatch until compliance is resolved.

### 💲 Rate Confirmations & Document Management
- **Versioned Agreements:** Brokers can issue Rate Confirmations.
- **Dual-Party Signing:** Carriers must digitally sign/confirm the rate before a load can be dispatched.
- **POD Uploads:** Carriers can upload Proof of Delivery documents directly to the load record, advancing the status to `POD Verified`.

### 🎨 Premium UI/UX
- **Dynamic Dashboards:** Built with Chart.js for beautiful, interactive doughnut charts visualizing load distributions.
- **Modern Typography:** Uses Google's `Outfit` and `Plus Jakarta Sans` for a crisp, high-resolution aesthetic.
- **Micro-Animations:** Fluid CSS keyframe animations and animated FontAwesome icons ensure the interface feels responsive and alive.

---

## 💻 Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas (Mongoose ODM)
- **Authentication:** JSON Web Tokens (JWT) & bcrypt for secure password hashing
- **Frontend:** Vanilla JavaScript SPA (Single Page Application)
- **Visuals:** Chart.js, FontAwesome 6, Google Fonts
- **Deployment:** Render (Cloud Application Hosting)

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js (v18+)
- MongoDB cluster (local or MongoDB Atlas)

### 1. Clone & Install
```bash
git clone https://github.com/saranasai-21/RBDesign-Project.git
cd RBDesign-Project
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
MONGODB_URI="mongodb+srv://<username>:<password>@cluster.mongodb.net/loadflow"
JWT_SECRET="your_super_secret_jwt_key_here"
```

### 3. Database Seeding
To populate the database with demo organizations, roles, and loads:
```bash
npm run seed
```

### 4. Start the Server
```bash
npm start
```
The application will be available at `http://localhost:3000`.

---

## 🌐 Deployment (Render)

This application is configured for seamless deployment on [Render](https://render.com).

1. Connect your GitHub repository to a new Render **Web Service**.
2. **Build Command:** `npm install`
3. **Start Command:** `node server.js`
4. Add the `MONGODB_URI` and `JWT_SECRET` as environment variables.
5. Deploy!

*(Note: Ensure your MongoDB Atlas Network Access is set to `0.0.0.0/0` to allow Render's dynamic IPs to connect).*

---

## 🔑 Demo Accounts

If you have run the seed script, you can log in with the following test accounts (Password for all: `password123`):

| Organization Type | Role | Username |
|-------------------|------|----------|
| **Brokerage** | Admin | `brokeradmin` |
| **Brokerage** | Dispatcher | `dispatcher1` |
| **Carrier** | Admin | `carrieradmin` |
| **Carrier** | Driver | `driver1` |
| **Shipper** | User | `shipperuser` |

---

## 📂 Project Structure

```text
RBDesign-Project/
├── public/                  # Frontend SPA Assets
│   ├── index.html           # Main entry point
│   ├── styles.css           # Global CSS (Variables, Animations, Layout)
│   ├── app.js               # Core router and state management
│   └── components/          # UI Components
│       ├── auth.js
│       ├── broker-dashboard.js
│       ├── carrier-dashboard.js
│       ├── shipper-dashboard.js
│       ├── admin-panel.js
│       ├── load-detail.js
│       └── modals.js
├── server/                  # Backend API
│   ├── database.js          # MongoDB connection logic
│   ├── seed.js              # DB Seeding utility
│   ├── middleware/          # Express middlewares (Auth, RBAC)
│   ├── models/              # Mongoose Data Models (User, Load, Org, etc.)
│   └── routes/              # API Route Handlers
├── server.js                # Express app entry point
├── render.yaml              # Render deployment configuration
└── package.json             # Dependencies & Scripts
```
