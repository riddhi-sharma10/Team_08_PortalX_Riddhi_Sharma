import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function verifySchema() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      enableKeepAlive: true,
      keepAliveInitialDelayMs: 0,
    });

    // Get all tables
    const [tables] = await connection.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME",
      [process.env.DB_NAME],
    );

    console.log("=== DATABASE TABLES ===\n");
    console.log(`Total Tables: ${tables.length}\n`);

    for (const table of tables) {
      const tableName = table.TABLE_NAME;

      // Get columns
      const [columns] = await connection.query(
        `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
         ORDER BY ORDINAL_POSITION`,
        [process.env.DB_NAME, tableName],
      );

      // Get foreign keys
      const [fks] = await connection.query(
        `SELECT 
          CONSTRAINT_NAME,
          COLUMN_NAME,
          REFERENCED_TABLE_NAME,
          REFERENCED_COLUMN_NAME
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
        [process.env.DB_NAME, tableName],
      );

      console.log(`\n📊 TABLE: ${tableName}`);
      console.log("─".repeat(80));

      console.log("\nColumns:");
      for (const col of columns) {
        const nullable = col.IS_NULLABLE === "YES" ? "nullable" : "NOT NULL";
        const key = col.COLUMN_KEY ? `[${col.COLUMN_KEY}]` : "";
        const extra = col.EXTRA ? `(${col.EXTRA})` : "";
        console.log(
          `  - ${col.COLUMN_NAME} | ${col.DATA_TYPE} | ${nullable} ${key} ${extra}`,
        );
      }

      if (fks.length > 0) {
        console.log("\nForeign Keys:");
        for (const fk of fks) {
          console.log(
            `  → ${fk.COLUMN_NAME} → ${fk.REFERENCED_TABLE_NAME}(${fk.REFERENCED_COLUMN_NAME})`,
          );
        }
      }

      // Get row count
      const [count] = await connection.query(
        `SELECT COUNT(*) as cnt FROM ${tableName}`,
      );
      console.log(`\nRow Count: ${count[0].cnt}`);
    }

    console.log("\n\n=== FOREIGN KEY RELATIONSHIPS ===\n");

    const [allFks] = await connection.query(
      `SELECT 
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME,
        CONSTRAINT_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
       ORDER BY TABLE_NAME`,
      [process.env.DB_NAME],
    );

    for (const fk of allFks) {
      console.log(
        `${fk.TABLE_NAME}.${fk.COLUMN_NAME} → ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`,
      );
    }
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

verifySchema();
