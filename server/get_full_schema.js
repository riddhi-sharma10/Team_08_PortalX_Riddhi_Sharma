import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "./.env") });

async function getSchema() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Get all tables
    const [tables] = await conn.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME",
    );

    console.log(`\n========== TOTAL TABLES: ${tables.length} ==========\n`);

    for (const tbl of tables) {
      const tableName = tbl.TABLE_NAME;
      console.log(`\n=== ${tableName} ===`);

      // Get columns
      const [columns] = await conn.query(
        `
                SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = ? AND TABLE_SCHEMA = DATABASE()
                ORDER BY ORDINAL_POSITION
            `,
        [tableName],
      );

      console.log(JSON.stringify(columns, null, 2));

      // Get foreign keys
      const [fks] = await conn.query(
        `
                SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_NAME = ? AND TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL
            `,
        [tableName],
      );

      if (fks.length > 0) {
        console.log("FOREIGN_KEYS:", JSON.stringify(fks, null, 2));
      }
    }

    await conn.end();
  } catch (error) {
    console.error("Error:", error.message);
  }
}

getSchema();
