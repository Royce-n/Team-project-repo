const { Pool } = require("pg");

// Database configuration
const pool = new Pool({
  connectionString:
    "postgresql://postgres:SD2025COOLGROUP@localhost:5432/user_management",
  ssl: false,
});

const testUsers = [
  {
    email: "admin@test.com",
    name: "Admin User",
    role: "admin",
    status: "active",
  },
  {
    email: "manager@test.com",
    name: "Manager User",
    role: "manager",
    status: "active",
  },
  {
    email: "user@test.com",
    name: "Basic User",
    role: "basicuser",
    status: "active",
  },
];

async function addTestUsers() {
  try {
    console.log("Adding test users to database...");

    for (const user of testUsers) {
      // Check if user already exists
      const existingUser = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [user.email]
      );

      if (existingUser.rows.length > 0) {
        console.log(`User ${user.email} already exists, skipping...`);
        continue;
      }

      // Insert new user
      const result = await pool.query(
        "INSERT INTO users (email, name, role, status, azure_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role",
        [user.email, user.name, user.role, user.status, `test-${user.email}`]
      );

      console.log(
        `Added user: ${result.rows[0].email} (${result.rows[0].role})`
      );
    }

    console.log("Test users added successfully!");
    console.log("\nTest credentials:");
    console.log("Email: admin@test.com, Password: password123 (Admin)");
    console.log("Email: manager@test.com, Password: password123 (Manager)");
    console.log("Email: user@test.com, Password: password123 (Basic User)");
  } catch (error) {
    console.error("Error adding test users:", error);
  } finally {
    await pool.end();
  }
}

addTestUsers();
