# AI Course Builder

A powerful, AI-driven application that generates personalized learning courses instantly. Built with React, Node.js, Express, and PostgreSQL.

## 📋 Prerequisites

*   [Node.js](https://nodejs.org/) (v16 or higher)
*   [PostgreSQL](https://www.postgresql.org/) (or a cloud provider like [Neon](https://neon.tech))
*   [Google Gemini API Key](https://aistudio.google.com/app/apikey)

## 🚀 Quick Setup (Windows & macOS)

### 1. Installation

**Root (Frontend) Dependencies:**
```bash
npm install
```

**Backend Dependencies:**
```bash
cd backend
npm install
cd ..
```

### 2. Environment Configuration

1.  Copy the example environment file in the **root** directory:
    *   **Windows:** `copy .env.example .env`
    *   **Mac/Linux:** `cp .env.example .env`
2.  Open `.env` and fill in your details:
    *   `DATABASE_URL`: Your PostgreSQL connection string (keep `sslmode=require` for Neon).
    *   `GEMINI_API_KEY`: Your Google AI Studio key.
    *   `JWT_SECRET`: Any random string.

### 3. Database Initialization

Initialize the database schema from the backend directory:

```bash
cd backend
npm run init-db
cd ..
```

## 🏃‍♂️ Running the Application

You need to run the backend and frontend in separate terminals.

**Terminal 1: Backend**
```bash
cd backend
npm run dev
# Server starts on http://localhost:5000
```

**Terminal 2: Frontend (Root)**
```bash
npm run dev
# App opens at http://localhost:8080 (or similar)
```

## 🛠️ Tech Stack
*   **Frontend**: React, TypeScript, Vite, Tailwind CSS
*   **Backend**: Node.js, Express, TypeScript, PostgreSQL
*   **AI**: Google Gemini

## 📄 License
ISC License
