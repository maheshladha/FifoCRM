import sql from "mssql/msnodesqlv8.js";

// Connect to the same SQL Server database used by V2.
// Windows Authentication means no SQL username or password is stored here.
const connectionSettings = {
  connectionString:
    "Driver={ODBC Driver 18 for SQL Server};" +
    "Server=MAHESH-RANCE\\SQL2019;" +
    "Database=NEWDEMO;" +
    "Trusted_Connection=Yes;" +
    "TrustServerCertificate=Yes;" +
    "Encrypt=No;",
};

let connectionPromise;

export function getDatabase() {
  if (!connectionPromise) {
    connectionPromise = sql.connect(connectionSettings).catch((error) => {
      connectionPromise = undefined;
      throw error;
    });
  }

  return connectionPromise;
}
