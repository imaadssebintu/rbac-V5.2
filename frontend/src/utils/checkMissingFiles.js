
import fs from 'fs';
import path from 'path';

const expectedStructure = {
  'src/components/common/Header.jsx': true,
  'src/components/common/Sidebar.jsx': true,
  'src/components/common/ThemeToggle.jsx': true,
  'src/components/auth/Login.jsx': true,
  'src/components/auth/Register.jsx': true,
  'src/components/dashboard/AdminDashboard.jsx': true,
  'src/components/dashboard/WalkerDashboard.jsx': true,
  'src/components/dashboard/WalkeeDashboard.jsx': true,
  'src/components/tasks/TaskList.jsx': true,
  'src/components/tasks/TaskMap.jsx': true,
  'src/components/messaging/ChatInterface.jsx': true,
  'src/components/messaging/MessageList.jsx': true,
  'src/components/payment/PaymentForm.jsx': true,
  'src/pages/Home.jsx': true,
  'src/pages/Profile.jsx': true,
  'src/pages/Tasks.jsx': true,
  'src/pages/Messages.jsx': true,
  'src/pages/Settings.jsx': true,
  'src/services/api.js': true,
  'src/services/socket.js': true,
  'src/services/mapService.js': true,
  'src/context/AuthContext.jsx': true,
  'src/context/ThemeContext.jsx': true,
  'src/context/SocketContext.jsx': true,
  'src/styles/theme.js': true,
  'src/styles/GlobalStyles.js': true,
  'src/styles/instagramStyles.js': true,
  'src/utils/constants.js': true,
  'src/App.jsx': true,
  'src/index.js': true,
  'public/index.html': true,
  'public/manifest.json': true,
  'package.json': true
};

function checkMissingFiles() {
  const missingFiles = [];
  const existingFiles = [];

  for (const [filePath, required] of Object.entries(expectedStructure)) {
    const absolutePath = path.resolve(filePath);
    if (required && !fs.existsSync(absolutePath)) {
      missingFiles.push(filePath);
    } else if (fs.existsSync(absolutePath)) {
      existingFiles.push(filePath);
    }
  }

  console.log('\n📁 FILE CHECK REPORT 📁');
  console.log('=====================\n');

  console.log('✅ EXISTING FILES:');
  existingFiles.forEach(file => console.log(`   ${file}`));

  console.log('\n❌ MISSING FILES:');
  if (missingFiles.length === 0) {
    console.log('   All files are present!');
  } else {
    missingFiles.forEach(file => console.log(`   ${file}`));
  }

  console.log('\n📊 SUMMARY:');
  console.log(`   Total expected: ${Object.keys(expectedStructure).length}`);
  console.log(`   Found: ${existingFiles.length}`);
  console.log(`   Missing: ${missingFiles.length}`);

  return { missingFiles, existingFiles };
}

// Run it!
checkMissingFiles();
