// Firebase config
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAhjN9W_65iyf_Y-6Mi-Tk05hiaq5PGkkQ",
  authDomain: "dfcp-system.firebaseapp.com",
  projectId: "dfcp-system",
  storageBucket: "dfcp-system.firebasestorage.app",
  messagingSenderId: "479660967900",
  appId: "1:479660967900:web:903df7b9b76593bbe93119",
  measurementId: "G-NXX2XXQJZL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Google Translate API (free via proxy)
async function translateText(text, toLang) {
  if (toLang === 'en') return text;
  const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${toLang}&dt=t&q=${encodeURIComponent(text)}`);
  const data = await res.json();
  return data[0].map(pair => pair[0]).join('');
}

// Highlight function (Safe DOM-based)
function emphasizeSafe(text, keyword) {
  const frag = document.createDocumentFragment();
  if (!keyword) {
    frag.appendChild(document.createTextNode(text));
    return frag;
  }

  const regex = new RegExp(`(${keyword})`, 'gi');
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    const mark = document.createElement('mark');
    mark.innerText = match[0];
    frag.appendChild(mark);
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    frag.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  return frag;
}

function escapeHTML(str) {
  return str.replace(/[&<>"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[tag]));
}

function sanitizeInput(input) {
  return input.replace(/[<>/"'`;$]/g, '');
}

let allDocs = [];
let renderIndex = 0;
const batchSize = 5;

async function renderArticles(lang = 'en', query = '', initial = true) {
  const container = document.getElementById('articles-container');
  const sanitizedQuery = sanitizeInput(query);

  if (initial) {
    container.innerHTML = '';
    allDocs = [];
    renderIndex = 0;

    try {
      const snapshot = await getDocs(collection(db, 'articles'));
      const normalizedQuery = sanitizedQuery.toLowerCase().trim();

      allDocs = snapshot.docs.filter(doc => {
        const data = doc.data();
        const combined = `
          ${data.title || ''} 
          ${data.summary || ''} 
          ${data.howToPrevent || ''} 
          ${(data.indicators || []).join(' ')}`.toLowerCase();
        return normalizedQuery === '' || combined.includes(normalizedQuery);
      });
    } catch (err) {
      console.error("Error fetching articles:", err);
      container.innerHTML = `<p style="color:red;">⚠️ Failed to load articles</p>`;
      return;
    }
  }

  const currentBatch = allDocs.slice(renderIndex, renderIndex + batchSize);

  for (const doc of currentBatch) {
    const data = doc.data();
    const normalizedQuery = sanitizedQuery.toLowerCase().trim();

    const translatedSummary = await translateText(data.summary || '', lang);
    const translatedHowTo = await translateText(data.howToPrevent || '', lang);
    const translatedIndicators = await Promise.all(
      (data.indicators || []).map(i => translateText(i, lang))
    );

    const card = document.createElement('div');
    card.className = 'card';

    const titleEl = document.createElement('h3');
    titleEl.innerText = data.title || 'No Title';

    const summaryP = document.createElement('p');
    summaryP.innerHTML = '<strong>Summary:</strong> ';
    summaryP.appendChild(emphasizeSafe(translatedSummary, normalizedQuery));

    const typeP = document.createElement('p');
    typeP.innerHTML = `<strong>Attack Type:</strong> ${escapeHTML(data.attackType || 'N/A')}`;

    const severityP = document.createElement('p');
    severityP.innerHTML = `<strong>Severity:</strong> ${escapeHTML(data.severityLevel || 'N/A')}`;

    const rarityP = document.createElement('p');
    rarityP.innerHTML = `<strong>Rarity:</strong> ${escapeHTML(data.rarity || 'N/A')}`;

    const howToP = document.createElement('p');
    howToP.innerHTML = '<strong>How to Prevent:</strong> ';
    howToP.appendChild(emphasizeSafe(translatedHowTo, normalizedQuery));

    const indicatorsP = document.createElement('p');
    indicatorsP.innerHTML = '<strong>Indicators:</strong>';
    const ul = document.createElement('ul');
    translatedIndicators.forEach(ind => {
      const li = document.createElement('li');
      li.appendChild(emphasizeSafe(ind, normalizedQuery));
      ul.appendChild(li);
    });
    indicatorsP.appendChild(ul);

    card.appendChild(titleEl);
    card.appendChild(summaryP);
    card.appendChild(typeP);
    card.appendChild(severityP);
    card.appendChild(rarityP);
    card.appendChild(howToP);
    card.appendChild(indicatorsP);

    container.appendChild(card);
  }

  renderIndex += batchSize;
}

// Initial render
renderArticles('en', '', true);

const searchInput = document.getElementById('search-input');
const langSelect = document.getElementById('lang');

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const query = sanitizeInput(searchInput.value);
    renderArticles(langSelect.value, query, true);
  }
});

langSelect.addEventListener('change', (e) => {
  const query = sanitizeInput(searchInput.value);
  renderArticles(e.target.value, query, true);
});

// Lazy load on scroll
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY + window.innerHeight;
  const threshold = document.body.offsetHeight - 200;
  if (scrollY >= threshold) {
    const query = sanitizeInput(searchInput.value);
    renderArticles(langSelect.value, query, false);
  }
});
