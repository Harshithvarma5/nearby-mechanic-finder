# Nearby Mechanic Finder

A full-stack web application to find nearby bike or car mechanic shops when your vehicle breaks down.

## Tech Stack
- Frontend: React (Vite)
- Backend: Python (FastAPI)
- Database: MongoDB
- Maps: Google Maps API

## Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- MongoDB (Running locally or MongoDB Atlas URI)

## Backend Setup
1. Open a terminal in the `backend` directory:
   `cd backend`
2. Create a virtual environment:
   `python -m venv venv`
3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`
4. Install dependencies:
   `pip install -r requirements.txt`
5. Set environment variables (create a `.env` file in `backend/`):
   `MONGO_URI=mongodb://localhost:27017`
6. Run the server:
   `uvicorn main:app --reload`
The backend runs at `http://localhost:8000`. Dummy data is inserted automatically on the first run.

## Frontend Setup
1. Open a terminal in the `frontend` directory:
   `cd frontend`
2. Install dependencies:
   `npm install`
3. Set environment variables (create a `.env` file in `frontend/`):
   ```
   VITE_API_BASE_URL=http://localhost:8000
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```
4. Run the development server:
   `npm run dev`
The frontend runs at `http://localhost:5173`.
