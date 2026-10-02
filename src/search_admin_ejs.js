const fs = require('fs');

const content = fs.readFileSync('views/dashboard-admin.ejs', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('test-email') || l.includes('test_email')) {
    console.log(`L${i+1}: ${l.trim()}`);
  }
});
