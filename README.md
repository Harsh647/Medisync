
# MediSync 🏥

**AI-Powered Personal Health Record Management System with Disease Prediction**

MediSync is a centralized digital health platform designed to help users seamlessly manage their medical records, track daily vitals, monitor medication schedules, and leverage Artificial Intelligence for disease risk prediction and medical report analysis.

---

## ✨ Key Features

* **Secure Authentication:** User login and session management powered by Firebase.
* **Medicine Tracker:** Real-time dosage scheduling, stock management, and daily reset logic.
* **Digital Vault:** Secure storage for medical documents with upload filters and PDF previews.
* **Vitals Monitoring:** Log daily health metrics (BP, Sugar, etc.), visualize historical trends with charts, and export PDF reports.
* **AI Report Summarizer:** Intelligent medical document analysis using the Google Gemini AI API.
* **Disease Risk Prediction:** Machine learning models powered by a dedicated Python/FastAPI backend to assess health risks based on patient data.

## 💻 Tech Stack

**Frontend & Core API:**
* Next.js (App Router, SSR)
* React.js & Tailwind CSS
* Firebase (Authentication)

**Backend & ML:**
* FastAPI (Python microservice for ML models)
* Google Gemini AI API (NLP & Report Analysis)

**Database & ORM:**
* Supabase (PostgreSQL)
* Prisma (ORM)

---

## 🚀 Getting Started

To get a local copy up and running, follow these steps.

### Prerequisites
* Node.js (v18+)
* Python (3.9+)
* Git

### 1. Clone the repository
```bash
git clone https://github.com/Harsh-Yadav-079/MediSync.git
cd MediSync

2. Environment Variables
Create a .env file in the root directory and add the following keys:
# Database (Supabase / Prisma)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-SUPABASE-REF].supabase.co:5432/postgres"

# Firebase Authentication
NEXT_PUBLIC_FIREBASE_API_KEY="your_api_key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_auth_domain"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_project_id"

# AI Integration
GEMINI_API_KEY="your_gemini_api_key"

# FastAPI Backend URL
NEXT_PUBLIC_ML_BACKEND_URL="http://localhost:8000"

3. Install Frontend Dependencies
npm install

4. Setup Prisma Database
Push the schema to your Supabase database and generate the Prisma client:
npx prisma db push
npx prisma generate

5. Run the Application
Start the Next.js Frontend Development Server:
npm run dev

Open http://localhost:3000 with your browser to see the result.
Start the FastAPI Machine Learning Backend (Optional):
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

📈 Future Scope
 * Implementation of advanced input validation across all API routes.
 * Expanding the digital vault with secure download features.
 * Integrating a real-time health chatbot using Gemini AI.

