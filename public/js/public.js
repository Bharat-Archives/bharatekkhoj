// Function to fetch all tabs/categories dynamically
async function loadArchiveData() {
  try {
    const res = await fetch('/api/categories');
    return await res.json();
  } catch (err) {
    console.error("Failed to load archive", err);
    return [];
  }
}