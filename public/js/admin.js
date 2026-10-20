/* eslint-disable no-alert */
let currentCategories = [];

function getAdminToken() {
  return sessionStorage.getItem('adminToken') || '';
}

function getAuthHeaders(isFormData) {
  const headers = {
    'x-admin-token': getAdminToken()
  };
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

// 1. Initial auth check
window.addEventListener('DOMContentLoaded', async () => {
  const token = getAdminToken();
  if (token) {
    try {
      const res = await fetch('/api/admin/status', {
        headers: getAuthHeaders(false)
      });
      const data = await res.json();
      if (res.ok && data.loggedIn) {
        showWorkspace();
        return;
      }
    } catch (e) {
      console.warn('Session check failed:', e);
    }
  }

  const loginSec = document.getElementById('loginSection');
  const workSec = document.getElementById('workspaceSection');
  if (loginSec) loginSec.style.display = 'block';
  if (workSec) workSec.style.display = 'none';
});

// 2. Login action
window.handleLogin = async function handleLogin() {
  const passInput = document.getElementById('adminPassword');
  const submitBtn = document.getElementById('loginSubmitBtn');
  const password = passInput ? passInput.value.trim() : '';

  if (!password) {
    alert('कृपया पासवर्ड दर्ज करें (Please enter the passcode).');
    return;
  }

  if (submitBtn) {
    submitBtn.setAttribute('disabled', 'true');
    submitBtn.innerText = 'सत्यापित हो रहा है (Checking)...';
  }

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();

    if (res.ok && data.token) {
      sessionStorage.setItem('adminToken', data.token);
      showWorkspace();
    } else {
      alert(data.error || 'प्रवेश अस्वीकृत: गलत पासवर्ड (Incorrect Passcode)');
    }
  } catch (err) {
    alert('सर्वर से संपर्क नहीं हो पाया: ' + err.message);
  } finally {
    if (submitBtn) {
      submitBtn.removeAttribute('disabled');
      submitBtn.innerText = 'प्रवेश करें (Enter Portal)';
    }
  }
};

window.logout = function logout() {
  sessionStorage.removeItem('adminToken');
  window.location.reload();
};

function showWorkspace() {
  const loginSec = document.getElementById('loginSection');
  const workSec = document.getElementById('workspaceSection');
  const logoutBtn = document.getElementById('logoutBtn');

  if (loginSec) loginSec.style.display = 'none';
  if (workSec) workSec.style.display = 'block';
  if (logoutBtn) logoutBtn.style.display = 'inline-block';
  fetchAdminData();
}

async function fetchAdminData() {
  try {
    const res = await fetch('/api/categories');
    if (!res.ok) throw new Error('Could not load categories');
    currentCategories = await res.json();
    renderAdminCategories();
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderAdminCategories() {
  const container = document.getElementById('categoriesList');
  if (!container) return;

  if (!currentCategories || !currentCategories.length) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem; background: var(--bg-card); border: 1px dashed var(--border-aged); border-radius: 6px;">
        <p style="font-size: 1.15rem; color: var(--text-maroon); font-weight: bold;">कोई विषय नहीं मिला (No tabs created yet)</p>
        <p style="color: #6d432e; margin-top: 6px;">ऊपर दिए गए "+ नया विषय / Tab जोड़ें" बटन पर क्लिक करके अपना पहला विषय बनाएं।</p>
      </div>`;
    return;
  }

  container.innerHTML = currentCategories.map((cat, catIdx) => {
    const docList = cat.documents || [];
    return `
      <div class="category-management-box">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.2rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <span style="font-size: 0.75rem; background: var(--text-maroon); color: var(--gold-light); padding: 3px 10px; border-radius: 4px; font-weight: bold; letter-spacing: 0.5px;">
              ${escapeHtml(cat.tag)}
            </span>
            <h3 style="margin-top: 8px; color: var(--text-maroon); font-size: 1.6rem;">
              ${escapeHtml(cat.titleHi)} <span style="font-size: 1.1rem; color: #72422c;">(${escapeHtml(cat.titleEn)})</span>
            </h3>
            <p style="font-size: 0.9rem; color: #57331e; max-width: 700px; margin-top: 4px;">
              ${escapeHtml(cat.desc)}
            </p>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn-heritage" onclick="openUploadModal('${cat.id}')">+ Add PDF to Tab</button>
            <button class="btn-heritage btn-danger" onclick="deleteCategoryByIdx(${catIdx})">Delete Tab 🗑️</button>
          </div>
        </div>

        <div style="border-top: 1px dashed var(--border-aged); padding-top: 1rem;">
          <h5 style="color: var(--text-maroon); margin-bottom: 0.8rem; font-size: 1rem;">
            उपलब्ध अध्ययन सामग्री / Documents in this Tab (${docList.length}):
          </h5>
          ${docList.length === 0 
            ? '<p style="font-style: italic; font-size: 0.85rem; color: #875d45;">इस विषय में अभी कोई PDF नहीं है। "+ Add PDF to Tab" पर क्लिक करके सामग्री जोड़ें।</p>'
            : docList.map(doc => `
              <div class="doc-row">
                <div style="max-width: 65%;">
                  <strong style="color: var(--text-maroon); font-size: 1.05rem;">\${escapeHtml(doc.titleHi)}</strong> 
                  <span style="color: #7a5038;">/ \${escapeHtml(doc.titleEn)}</span>
                  <br>
                  <small style="color: #8c5b3d;">
                    फ़ाइल: \${escapeHtml(doc.fileName || 'document.pdf')} | लेखक: ${escapeHtml(doc.author \vert{}\vert{} 'Archive')} \vert{} काल/वर्ष: ${escapeHtml(doc.year || 'N/A')}
                  </small>
                </div>
                <div style="display: flex; gap: 8px; align-items: center; flex-shrink: 0;">
                  <a href="\${doc.fileUrl}" target="_blank" rel="noopener noreferrer" class="btn-heritage btn-outline" style="padding: 5px 12px; font-size: 0.8rem;">View</a>
                  <button class="btn-heritage btn-outline" style="padding: 5px 12px; font-size: 0.8rem;" onclick="openEditModal('${cat.id}', '${doc.id}')">Edit ✏️</button>
                  <button class="btn-heritage btn-danger" style="padding: 5px 12px; font-size: 0.8rem;" onclick="deleteDocument('${cat.id}', '${doc.id}')">Delete ✕</button>
                </div>
              </div>
            `).join('')
          }
        </div>
      </div>
    `;
  }).join('');
}

// 3. Tab Management
window.openAddTabModal = function openAddTabModal() {
  const form = document.getElementById('addTabForm');
  if (form) form.reset();
  const modal = document.getElementById('addTabModal');
  if (modal) modal.style.display = 'flex';
};

window.submitNewTab = async function submitNewTab() {
  const titleHi = document.getElementById('tabTitleHi').value.trim();
  const titleEn = document.getElementById('tabTitleEn').value.trim();
  const tag = document.getElementById('tabTag').value.trim();
  const desc = document.getElementById('tabDesc').value.trim();

  if (!titleHi || !titleEn) {
    alert('कृपया दोनों भाषाओं में नाम भरें (Please provide both Hindi and English titles).');
    return;
  }

  try {
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: getAuthHeaders(false),
      body: JSON.stringify({ titleHi, titleEn, tag, desc })
    });
    const result = await res.json();

    if (res.ok) {
      closeModals();
      await fetchAdminData();
    } else {
      alert('त्रुटि: ' + (result.error || 'Could not create tab.'));
    }
  } catch (err) {
    alert('सर्वर से संपर्क नहीं हो सका: ' + err.message);
  }
};

window.deleteCategoryByIdx = async function deleteCategoryByIdx(idx) {
  const cat = currentCategories[idx];
  if (!cat) return;

  if (!confirm(`क्या आप सच में "${cat.titleHi}" टैब और इसके सभी दस्तावेज़ हटाना चाहते हैं?\n(Delete tab "${cat.titleHi}" and all its PDFs?)`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/categories/${encodeURIComponent(cat.id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(false)
    });
    const data = await res.json();

    if (res.ok) {
      fetchAdminData();
    } else {
      alert(data.error || 'टैब हटाने में विफल (Could not delete tab)');
    }
  } catch (err) {
    alert('Connection error: ' + err.message);
  }
};

// 4. Document Management
window.openUploadModal = function openUploadModal(catId) {
  const form = document.getElementById('uploadDocForm');
  if (form) form.reset();

  document.getElementById('uploadCatId').value = catId;
  document.getElementById('editDocId').value = '';
  
  const titleElem = document.getElementById('uploadModalTitle');
  if (titleElem) titleElem.innerText = 'दस्तावेज़ जोड़ें (Upload PDF)';

  const labelElem = document.getElementById('fileInputLabel');
  if (labelElem) labelElem.innerText = 'PDF फ़ाइल चुनें (Select PDF Document)*';

  const fileInput = document.getElementById('docFile');
  if (fileInput) fileInput.required = true;

  const modal = document.getElementById('uploadPdfModal');
  if (modal) modal.style.display = 'flex';
};

window.openEditModal = function openEditModal(catId, docId) {
  const cat = currentCategories.find(c => c.id === catId);
  if (!cat) return;
  const doc = (cat.documents || []).find(d => d.id === docId);
  if (!doc) return;

  document.getElementById('uploadCatId').value = catId;
  document.getElementById('editDocId').value = docId;
  document.getElementById('docTitleHi').value = doc.titleHi || '';
  document.getElementById('docTitleEn').value = doc.titleEn || '';
  document.getElementById('docAuthor').value = doc.author || '';
  document.getElementById('docYear').value = doc.year || '';
  document.getElementById('docSummary').value = doc.summary || '';

  const titleElem = document.getElementById('uploadModalTitle');
  if (titleElem) titleElem.innerText = 'दस्तावेज़ संपादित करें (Edit Details / Replace PDF)';

  const labelElem = document.getElementById('fileInputLabel');
  if (labelElem) labelElem.innerText = 'नई PDF फ़ाइल चुनें (वैकल्पिक - यदि बदलना चाहते हैं)';

  const fileInput = document.getElementById('docFile');
  if (fileInput) fileInput.required = false;

  const modal = document.getElementById('uploadPdfModal');
  if (modal) modal.style.display = 'flex';
};

window.submitDocument = async function submitDocument() {
  const catId = document.getElementById('uploadCatId').value;
  const docId = document.getElementById('editDocId').value;
  const fileInput = document.getElementById('docFile');

  const titleHi = document.getElementById('docTitleHi').value.trim();
  const titleEn = document.getElementById('docTitleEn').value.trim();

  if (!titleHi || !titleEn) {
    alert('कृपया दस्तावेज़ का नाम हिंदी और अंग्रेज़ी दोनों में दें।');
    return;
  }

  const formData = new FormData();
  formData.append('titleHi', titleHi);
  formData.append('titleEn', titleEn);
  formData.append('author', document.getElementById('docAuthor').value.trim());
  formData.append('year', document.getElementById('docYear').value.trim());
  formData.append('summary', document.getElementById('docSummary').value.trim());

  if (fileInput && fileInput.files && fileInput.files[0]) {
    formData.append('pdfFile', fileInput.files[0]);
  }

  let url = `/api/admin/documents/${encodeURIComponent(catId)}`;
  let method = 'POST';

  if (docId) {
    url = `/api/admin/documents/${encodeURIComponent(catId)}/${encodeURIComponent(docId)}`;
    method = 'PUT';
  }

  const submitBtn = document.getElementById('uploadSubmitBtn');
  if (submitBtn) {
    submitBtn.setAttribute('disabled', 'true');
    submitBtn.innerText = 'सहेजा जा रहा है (Saving)...';
  }

  try {
    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(true),
      body: formData
    });
    const result = await res.json();

    if (res.ok) {
      closeModals();
      await fetchAdminData();
    } else {
      alert('दस्तावेज़ सहेजने में विफल: ' + (result.error || 'Check file size and PDF format.'));
    }
  } catch (err) {
    alert('Connection error: ' + err.message);
  } finally {
    if (submitBtn) {
      submitBtn.removeAttribute('disabled');
      submitBtn.innerText = 'Upload Document';
    }
  }
};

window.deleteDocument = async function deleteDocument(catId, docId) {
  if (!confirm('क्या आप सच में इस ऐतिहासिक दस्तावेज़ को हटाना चाहते हैं?\n(Delete this document?)')) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/documents/${encodeURIComponent(catId)}/${encodeURIComponent(docId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(false)
    });
    const result = await res.json();

    if (res.ok) {
      fetchAdminData();
    } else {
      alert(result.error || 'Could not delete document.');
    }
  } catch (err) {
    alert('Connection error: ' + err.message);
  }
};

// 5. Modal utility
window.closeModals = function closeModals() {
  const addModal = document.getElementById('addTabModal');
  const uploadModal = document.getElementById('uploadPdfModal');
  if (addModal) addModal.style.display = 'none';
  if (uploadModal) uploadModal.style.display = 'none';
};

window.addEventListener('click', (e) => {
  const addModal = document.getElementById('addTabModal');
  const uploadModal = document.getElementById('uploadPdfModal');
  if (e.target === addModal) addModal.style.display = 'none';
  if (e.target === uploadModal) uploadModal.style.display = 'none';
});