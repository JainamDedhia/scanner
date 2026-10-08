# BillScan

BillScan is a web prototype designed to digitize paper bills (such as handwritten, rotated, or multi-language invoices) into structured data using Gemini 3.5 Flash Lite.

## Features
- **Upload multiple bills**: Upload images via drag-and-drop or click to browse.
- **AI Extraction**: Extracts seller, merchant, total amount, dates, line items, and product data.
- **Review System**: Automatically flags bills missing data or having sum mismatches for review.
- **Editable Detail View**: Easily edit AI-extracted information in a side-by-side view with the image.
- **Summary & Analytics**: Group extractions by product and merchant for daily/monthly totals.
- **CSV Download**: Export data natively for Excel/Sheets.

## Getting Started

1. **Clone the repository** (or unzip files)
2. **Setup your environment variables**:
   Create a `.env.local` file in the root of the project (you can use `.env.example` as a template). Ensure you add your Google Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-3.5-flash-lite
   ```
3. **Install Dependencies**:
   ```bash
   npm install
   ```
4. **Run the Development Server**:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database
The app uses SQLite via `better-sqlite3`. The database file will be automatically created in `data/billscan.db` on your first run.

## Uploads
Uploaded images are stored locally in the `/uploads` directory (which is `.gitignore`d).

## Deployment
For production deployment, since `better-sqlite3` relies on a local file system and `uploads/` stores files locally, you need a traditional Node.js server (like a VPS or Docker container) rather than Vercel. 
Simply run `npm run build` and then `npm start` on your production server.
