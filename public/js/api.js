// public/js/api.js - Helper for Archive API Calls
const ArchiveAPI = {
  async getCategories() {
    const res = await fetch('/api/categories');
    return res.json();
  },
  async getDocument(catId, docId) {
    const res = await fetch(`/api/document/${catId}/${docId}`);
    return res.json();
  }
};