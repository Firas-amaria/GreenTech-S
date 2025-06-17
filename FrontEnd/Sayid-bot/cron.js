import cron from 'node-cron';
import { crawlAndSave } from './crawler.js';

console.log('⏳ Starting 12-hour article collection service...');

// Run once at startup
crawlAndSave();

// Schedule every 12 hours
cron.schedule('0 */12 * * *', () => {
  console.log('🔁 Running scheduled crawl...');
  crawlAndSave();
});
