import express from "express";
import cors from "cors";
import { getDatabase } from "./database.js";
import { findRedemptions } from "./repositories/redemptionRepository.js";

const app=express();
app.use(cors());app.use(express.json());
app.get("/api/health", async (_req, res) => {
  try {
    const database = await getDatabase();
    const result = await database.request().query("SELECT DB_NAME() AS databaseName");
    res.json({
      status: "ok",
      source: "sql-server",
      server: "MAHESH-RANCE\\SQL2019",
      database: result.recordset[0].databaseName,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});
app.get("/api/redemptions",async(req,res)=>{try{const records=await findRedemptions(req.query);res.json({fy:req.query.fy||"2026-27",count:records.length,records})}catch(error){res.status(500).json({message:"Unable to load redemption report",detail:error.message})}});
const port=process.env.PORT||3001;
app.listen(port,()=>console.log(`FIFO API listening on http://localhost:${port}`));
