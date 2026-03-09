require("dotenv").config();
const db = require("../services/db");

async function main() {
  const res = await db.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);
  const tables = {};
  for (const row of res.rows) {
    if (!tables[row.table_name]) tables[row.table_name] = [];
    tables[row.table_name].push(`${row.column_name} (${row.data_type})`);
  }
  for (const [table, cols] of Object.entries(tables)) {
    console.log(`\n[${table}]`);
    cols.forEach(c => console.log(`  ${c}`));
  }
  process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });