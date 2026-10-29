# PointFlow — FIFO Redemption Report

React + Node/Express application for a month-wise, customer-wise loyalty point redemption report. Redemptions are split across earned-point batches in FIFO order using live SQL Server data.

## Run locally

```powershell
npm install
npm run dev
```

Then open `http://localhost:5176`. The API runs on `http://localhost:3001`.

## Database

The Node backend connects to SQL Server using Windows Authentication:

- Server: `MAHESH-RANCE\SQL2019`
- Database: `NEWDEMO`

The FIFO calculation is implemented in `backend/src/repositories/redemptionRepository.js`.
