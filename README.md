# LoadFlow — Freight Brokerage Operations Suite

A production-grade multi-tenant freight brokerage platform with RBAC, load lifecycle management, carrier compliance, rate confirmations, and POD uploads.

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas (Mongoose ODM)
- **Auth:** JWT + bcrypt
- **Frontend:** Vanilla JS SPA with Chart.js visualizations
- **Icons:** FontAwesome 6 (with animated icons)
- **Fonts:** Outfit + Plus Jakarta Sans (Google Fonts)

## Features

- 🔐 **Multi-Tenant RBAC** — Broker, Carrier, and Shipper roles with org-scoped data isolation
- 📦 **Load Lifecycle** — Full state machine: Posted → Carrier Assigned → Rate Confirmed → Dispatched → In Transit → Delivered → POD Verified → Closed
- ✅ **Carrier Compliance** — Insurance expiry tracking, authority status validation, compliance flags on load assignment
- 💲 **Rate Confirmations** — Versioned rate agreements with dual-party signing (Broker + Carrier)
- 📄 **POD Upload** — Proof of Delivery document upload with automatic status progression
- 📊 **Visual Dashboards** — Chart.js doughnut charts, animated stat cards, and premium UI

## Quick Start

```bash
# Install dependencies
npm install

# Set environment variables (create .env file)
MONGODB_URI="mongodb+srv://..."
JWT_SECRET="your_secret_key"

# Seed the database with demo data
npm run seed

# Start the server
npm start
```

## Demo Accounts

| Role | Username | Password |
|------|----------|----------|
| Broker Admin | `brokeradmin` | `password123` |
| Dispatcher | `dispatcher1` | `password123` |
| Carrier Admin | `carrieradmin` | `password123` |
| Driver | `driver1` | `password123` |
| Shipper | `shipperuser` | `password123` |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new org + admin |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user context |
| GET/POST | `/api/loads` | List / Create loads |
| PUT | `/api/loads/:id/assign` | Assign carrier to load |
| PUT | `/api/loads/:id/status` | Update load status |
| GET/PUT | `/api/compliance` | Carrier compliance CRUD |
| POST | `/api/rates/:load_id` | Issue rate confirmation |
| PUT | `/api/rates/:load_id/:rate_id/confirm` | Sign rate confirmation |
| POST | `/api/loads/:id/pod` | Upload POD document |
| GET/POST | `/api/staff` | Manage org staff |
| GET/POST/DELETE | `/api/roles` | Manage custom roles |

## Project Structure

```
RBDesign/
├── public/                  # Frontend SPA
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   └── components/
│       ├── auth.js
│       ├── broker-dashboard.js
│       ├── carrier-dashboard.js
│       ├── shipper-dashboard.js
│       ├── admin-panel.js
│       ├── load-detail.js
│       └── modals.js
├── server/
│   ├── database.js          # MongoDB connection + constants
│   ├── seed.js              # Database seeding script
│   ├── middleware/
│   │   ├── auth.js          # JWT authentication
│   │   └── rbac.js          # Permission + org scoping
│   ├── models/              # Mongoose schemas
│   │   ├── Organization.js
│   │   ├── User.js
│   │   ├── Role.js
│   │   ├── Load.js
│   │   ├── LoadAudit.js
│   │   ├── RateConfirmation.js
│   │   ├── CarrierCompliance.js
│   │   └── PermissionLog.js
│   └── routes/
│       ├── auth.routes.js
│       ├── staff.routes.js
│       ├── roles.routes.js
│       ├── loads.routes.js
│       ├── compliance.routes.js
│       ├── rates.routes.js
│       └── pod.routes.js
├── server.js                # Express app entry point
├── package.json
└── .gitignore
```

## License

MIT
