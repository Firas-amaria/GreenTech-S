// crawler.js
import Parser from 'rss-parser';
import { summarizeArticle } from './summarizer.js';
import { saveToFirebase } from './firebaseService.js';

const parser = new Parser();

// List of RSS feed URLs
const rssFeeds = [
  'https://news.google.com/rss/search?q=cyberattack',
  'https://www.bbc.com/news/topics/c2gzq9g4gxxt/cyber-attacks',
  'https://techcrunch.com/tag/cyberattack/feed/',
  'https://www.theverge.com/rss/frontpage',
  'https://www.zdnet.com/news/rss.xml',
  'https://krebsonsecurity.com/feed/',
  'https://www.cyberscoop.com/feed/',
  'https://www.darkreading.com/rss.xml'

];

// 🔁 Main function to crawl and save articles
export async function crawlAndSave() {
  let savedCount = 0;

  for (const feedUrl of rssFeeds) {
    try {
      const feed = await parser.parseURL(feedUrl);
      console.log(`📰 Fetched ${feed.items.length} articles from ${feed.title}`);

      for (const article of feed.items) {
        const publishedDate = new Date(article.pubDate || article.isoDate || Date.now());
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

        // ⏩ Skip articles older than 12 hours
        if (publishedDate < twelveHoursAgo) {
          console.log(`⏩ Skipped old article: ${article.title}`);
          continue;
        }

        // 🧠 Summarize the article using OpenAI
        const summary = await summarizeArticle(article.contentSnippet || article.content || article.title);

        const articleData = {
          title: article.title || 'No Title',
          url: article.link,
          sourceName: feed.title || 'Unknown',
          publishedDate: publishedDate.toISOString(),
          summary: summary.summary,
          contentEnglish: article.contentSnippet || article.title,
          attackType: summary.attackType,
          severityLevel: summary.severityLevel,
          rarity: summary.rarity,
          indicators: summary.indicators,
          howToPrevent: summary.howToPrevent,
          fetchedAt: new Date().toISOString()
        };

        // 💾 Save the summarized article to Firebase
        await saveToFirebase(articleData);
        console.log(`✅ Saved: ${article.title}`);
        savedCount++;
      }

    } catch (err) {
      console.error(`❌ Failed to process ${feedUrl}`, err.message);
    }
  }

  console.log(`\n📊 Done. Total new articles saved: ${savedCount}`);
}
