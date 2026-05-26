import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const requiredFiles = [
    // Root files
    'package.json',
    '.env',
    'index.js',
    'db.js',
    'rbac.js',

    // Models
    'models/User.js',
    'models/Role.js',
    'models/task.js',
    'models/payment.js',
    'models/message.js',
    'models/index.js',

    // Controllers
    'controllers/auth.js',
    'controllers/payment.js',
    'controllers/task.js',
    'controllers/message.js',
    'controllers/profile.js',
    'controllers/dashboard.js',

    // Middleware
    'middleware/auth.js',

    // Routes
    'routes/auth.js',
    'routes/users.js',
    'routes/roles.js',
    'routes/tasks.js',
    'routes/payments.js',
    'routes/messages.js',
    'routes/profile.js',
    'routes/dashboard.js',

    // Seed
    'seed/seedRoles.js',

    // Services
    'services/geoService.js',
    'services/paymentGateway.js',
    'services/notification.js',
    'services/scheduler.js',
];

console.log('🔍 Verifying Backend Structure...\n');

let allFilesExist = true;
let missingFiles = [];

// Check each file
for (const file of requiredFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - MISSING`);
        allFilesExist = false;
        missingFiles.push(file);
    }
}

console.log('\n📊 Verification Results:');
if (allFilesExist) {
    console.log('🎉 All required files are present!');
} else {
    console.log(`⚠️  Missing ${missingFiles.length} file(s):`);
    missingFiles.forEach(file => console.log(`   - ${file}`));
}

// Check package.json scripts
console.log('\n📦 Checking package.json scripts...');
try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    const requiredScripts = ['start', 'dev', 'seed'];
    const missingScripts = requiredScripts.filter(script => !packageJson.scripts?.[script]);

    if (missingScripts.length === 0) {
        console.log('✅ All required scripts found in package.json');
    } else {
        console.log(`❌ Missing scripts: ${missingScripts.join(', ')}`);
    }

    // Check for type: module
    if (packageJson.type === 'module') {
        console.log('✅ ES6 modules enabled (type: "module")');
    } else {
        console.log('❌ ES6 modules not enabled. Add "type": "module" to package.json');
    }
} catch (error) {
    console.log('❌ Could not read package.json');
}

// Check .env file
console.log('\n🔐 Checking .env configuration...');
try {
    const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

    const requiredEnvVars = [
        'DB_NAME',
        'DB_USER',
        'DB_HOST',
        'DB_PORT',
        'DB_DIALECT',
        'JWT_SECRET'
    ];

    const envVars = {};
    envLines.forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) envVars[key.trim()] = value.trim();
    });

    const missingEnvVars = requiredEnvVars.filter(varName => !envVars[varName]);

    if (missingEnvVars.length === 0) {
        console.log('✅ All required environment variables found');
    } else {
        console.log(`❌ Missing environment variables: ${missingEnvVars.join(', ')}`);
    }

} catch (error) {
    console.log('❌ .env file not found or cannot be read');
}

console.log('\n🚀 Running functionality tests...\n');
