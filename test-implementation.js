const fs = require("fs");
const path = require("path");

console.log("🧪 Testing Admin Panel Implementation...\n");

// Test 1: Check if required files exist
const requiredFiles = [
  "controllers/sessionController.js",
  "routes/sessions.js",
  "middleware/auth.js",
  "middleware/validation.js",
];

console.log("📁 Checking backend files:");
requiredFiles.forEach((file) => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
  }
});

// Test 2: Check frontend files
const frontendFiles = [
  "../ledger-vote-frontend/src/pages/Dashboard/CreateSessions.jsx",
  "../ledger-vote-frontend/src/pages/Dashboard/HandleVoters.jsx",
  "../ledger-vote-frontend/src/services/api.js",
];

console.log("\n📁 Checking frontend files:");
frontendFiles.forEach((file) => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
  }
});

// Test 3: Check package.json dependencies
console.log("\n📦 Checking dependencies:");
try {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const requiredDeps = ["multer", "csv-parser"];

  requiredDeps.forEach((dep) => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`✅ ${dep} v${packageJson.dependencies[dep]}`);
    } else {
      console.log(`❌ ${dep} - MISSING`);
    }
  });
} catch (error) {
  console.log("❌ Error reading package.json");
}

console.log("\n✨ Implementation check complete!");
