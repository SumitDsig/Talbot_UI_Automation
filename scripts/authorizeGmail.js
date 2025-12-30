const { authorize } = require('../utils/gmailHelper');

async function main() {
  try {
    console.log('Starting Gmail authorization...\n');
    await authorize();
    console.log('\n✅ Authorization successful! You can now use Gmail API.');
  } catch (error) {
    console.error('❌ Authorization failed:', error.message);
    process.exit(1);
  }
}

main();

