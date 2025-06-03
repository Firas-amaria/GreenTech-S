  // When the page loads, fetch the email from /api/contact-info (for example)
  async function insertEmail() {


    try {
      const res = await fetch('http://localhost:4000/api/user/email-documents');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log('Email documents:', data);
      document.getElementById('email-documents').innerText = data.emailDocuments;
    } catch (err) {
      console.error('fetch failed:', err);
      document.getElementById('email-documents').innerText = 'something went wrong';
    }
  }

  window.addEventListener('DOMContentLoaded', insertEmail);