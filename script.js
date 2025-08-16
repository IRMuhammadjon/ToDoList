// Google Apps Script Web App URL (keyinroq sozlanadi)
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzwNCmnae3f1gyYl4-wlVkvZRras9TqXvR-Cq2GAgqRi2T_aVw8_tEdZimfAwHIM1_k7g/exec';

document.getElementById('taskForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        priority: document.getElementById('priority').value,
        deadline: document.getElementById('deadline').value,
        created: new Date().toLocaleString('uz-UZ')
    };
    
    try {
        showMessage('Task yuborilmoqda...', 'info');
        
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        // no-cors rejimida response.ok ishlamaydi
        showMessage('Task muvaffaqiyatli qo\'shildi!', 'success');
        document.getElementById('taskForm').reset();
        
    } catch (error) {
        console.error('Xatolik:', error);
        showMessage('Xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.', 'error');
    }
});

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.style.display = 'block';
    
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }
}
