# Lumina Event Management

Lumina is a comprehensive, full-stack event management platform designed to provide tailored experiences for both event organizers and attendees. Featuring a modern, mobile-responsive UI with glassmorphism design, dark/light mode, and smooth animations, it seamlessly bridges the gap between hosting events and attending them.

## ✨ Key Features

### 🏢 For Organizations (Event Hosts & Admins)
- **Command Dashboard**: Overview of total events, revenue, registrations, and pending tasks.
- **Event Management**: Create, edit, and publish events with details like capacity, pricing, media, and payment instructions.
- **Registration Tracking**: Monitor ticket sales, view attendee details, and approve/reject pending offline payments.
- **Team Collaboration**: Super Admins can add admin accounts, assign tasks, and track admin productivity.
- **Analytics & Reports**: Visual bar charts for event performance and one-click PDF report generation.

### 🎟️ For Attendees (Users)
- **Event Discovery**: Browse, search, and filter upcoming events by category, status, or date.
- **Seamless Booking**: Book tickets for free or paid events (supports Card or custom instructions like Cash/UPI).
- **Digital Passes**: Access an integrated "My Tickets" panel featuring auto-generated QR codes.
- **Notifications & Favorites**: Receive booking status updates and save favorite events for later.
- **Export Options**: Download PDF ticket receipts or export event dates directly to calendar (`.ics`).

### 🎨 UI & UX Highlights
- **Fully Responsive**: Optimized for desktop, tablet, and mobile viewing.
- **Theming**: Native Light & Dark mode support.
- **Animations**: Fluid page transitions and interactions powered by Framer Motion.

## 📂 Project Structure

```text
c:\event-app\
├── backend/                      # Node.js + Express API Backend
│   ├── models/                   # Mongoose schemas (e.g., User, Event, Booking)
│   ├── routes/                   # Express routers (Auth, Events, Bookings)
│   ├── clearData.js              # Utility script to clear MongoDB database
│   ├── package.json              # Backend dependencies
│   └── index.js                  # API entry point & DB connection
├── frontend/                     # React + Vite Frontend Application
│   ├── public/                   # Static public assets (Favicon, etc.)
│   ├── src/                      # Source code
│   │   ├── App.jsx               # Main React application & components
│   │   ├── App.css               # Application layout & specific styles
│   │   ├── ics.js                # iCalendar (.ics) generation utility
│   │   ├── index.css             # Global design system, CSS variables & mobile media queries
│   │   └── main.jsx              # React DOM render entry point
│   ├── index.html                # Main HTML template
│   ├── update_animations.js      # Utility script for CSS animation updates
│   ├── vite.config.js            # Vite configuration
│   └── package.json              # Frontend dependencies
├── .gitignore                    # Global git ignore file (protects .env)
├── package.json                  # Root dependencies & workspace scripts
└── README.md                     # Project documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (Local instance or MongoDB Atlas)

### Installation

1. **Clone the repository** (if applicable) and navigate to the project root:
   ```bash
   cd event-app
   ```

2. **Install Backend Dependencies**:
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**:
   ```bash
   cd ../frontend
   npm install
   ```

### Environment Variables

You will need to create `.env` files in both the `backend` and `frontend` directories.

**`backend/.env`**
```env
PORT=5000
MONGO_URI="mongodb://aryan_admin:Aryan@ac-pzjxdz1-shard-00-00.n45vlgv.mongodb.net:27017,ac-pzjxdz1-shard-00-01.n45vlgv.mongodb.net:27017,ac-pzjxdz1-shard-00-02.n45vlgv.mongodb.net:27017/?ssl=true&replicaSet=atlas-uvke4l-shard-0&authSource=admin&appName=Cluster0"
JWT_SECRET=your_secret_key_here
```

**`frontend/.env`**
```env
VITE_API_URL=http://localhost:5000
```

## 💻 Running the App

You can start the backend and frontend separately from the root using the provided npm scripts (assuming you have them set up in a root `package.json`), or run them in separate terminal windows:

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173` (default Vite port) and the backend API will run on `http://localhost:5000`.

## 🛠️ Root Commands

```bash
npm run backend    # Starts the backend server
npm run frontend   # Starts the frontend React app
npm run lint       # Runs ESLint checks
npm run build      # Builds the frontend for production
```

The frontend expects the backend at `http://localhost:5000`.
