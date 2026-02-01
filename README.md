# AI Course Builder

A powerful, AI-driven application that generates personalized learning courses instantly. Built with React, Node.js, Express, and PostgreSQL, styled with Tailwind CSS.

## 🚀 Features

*   **AI Course Generation**: Generates comprehensive course structures with lessons, notes, and quizzes using Google Gemini AI.
*   **Interactive Learning**: Track progress, mark lessons as complete, and take quizzes.
*   **Modern UI**: Beautiful, responsive interface built with Tailwind CSS and Radix UI.
*   **Secure Authentication**: Custom JWT-based authentication system.
*   **PostgreSQL Database**: Robust data storage using Neon (or any PostgreSQL instance).

## 🛠️ Tech Stack

*   **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
*   **Backend**: Node.js, Express, TypeScript
*   **Database**: PostgreSQL (Neon Cloud)
*   **AI**: Google Gemini (Generative AI)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
*   [Node.js](https://nodejs.org/) (v16 or higher)
*   [PostgreSQL](https://www.postgresql.org/) (or a cloud provider like [Neon](https://neon.tech))
*   A [Google Gemini API Key](https://aistudio.google.com/app/apikey)

## ⚙️ Installation & Setup

### 1. Backend Setup

The backend handles the API, database connection, and AI integration.

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    *   Create a `.env` file based on the example:
        ```bash
        cp .env.example .env
        ```
    *   Open `.env` and populate it with your credentials:
        ```env
        PORT=5000
        # Your PostgreSQL connection string (Neon or Local)
        # Ensure 'sslmode=require' is present for Neon
        DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
        
        # A secret key for signing JWTs (can be any random string)
        JWT_SECRET=your_super_secret_key
        
        # Your Google Gemini API Key
        GEMINI_API_KEY=AIzaSy...
        ```

4.  **Initialize the Database:**
    *   Run the initialization script to create the necessary tables (`users`, `courses`, `lessons`, etc.):
        ```bash
        npm run init-db
        ```

5.  **Start the Server:**
    ```bash
    npm run dev
    ```
    The backend runs on `http://localhost:5000`.

### 2. Frontend Setup

The frontend is the user interface built with Vite.

1.  **Navigate to the root directory (in a new terminal):**
    ```bash
    cd .. 
    # Or just open the root directory if you aren't in backend/
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the Development Server:**
    ```bash
    npm run dev
    ```
    The app usually runs on `http://localhost:8080` (check terminal output).

## 🏃‍♂️ Usage Guide

1.  **Sign Up**: Create an account on the "Sign Up" page.
2.  **Create a Course**: Click "Create Course", enter a topic (e.g., "Python Basics"), and wait for the AI to generate it.
3.  **Learn**: Navigate through lessons, read notes, and watch video recommendations (if available).
4.  **Quiz**: Take quizzes at the end of lessons to test your knowledge.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
