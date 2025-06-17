import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export async function summarizeArticle(text) {
  const prompt = `Please provide:\n1. A 4-5 sentence summary\n2. The type of cyberattack (phishing, ransomware, DDoS, etc.)\n3. Severity level (Low, Medium, High, Critical)\n4. Rarity (Common, Rare, Zero-Day, Targeted)\n5. How to prevent this type of attack\n6. Key indicators of such an attack\n\nFormat the response as JSON with these keys:\nsummary, attackType, severityLevel, rarity, howToPrevent, indicators\n\nText:\n${text}`;

  const res = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  

  return JSON.parse(res.data.choices[0].message.content);
};


