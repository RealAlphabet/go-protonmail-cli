let currentSessionId = null;
let currentPage = 0;

// DOM Elements
const loginForm = document.getElementById('loginForm');
const emailList = document.getElementById('emailList');
const emailView = document.getElementById('emailView');
const captchaContainer = document.getElementById('captchaContainer');
const totpContainer = document.getElementById('totpContainer');

// Login Form Handler
document.getElementById('login').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const captchaToken = document.getElementById('captchaToken').value;
    const totpCode = document.getElementById('totpCode').value;
    const totpSecret = document.getElementById('totpSecret').value;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                password,
                captchaToken,
                totpCode,
                totpSecret
            }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            if (data.type === 'CAPTCHA_REQUIRED') {
                captchaContainer.classList.remove('hidden');
                document.getElementById('captchaUrl').href = data.captcha_url;
                alert('CAPTCHA requis. Veuillez ouvrir le lien et entrer le token.');
            } else if (data.type === 'TOTP_REQUIRED') {
                totpContainer.classList.remove('hidden');
                alert('Code TOTP requis.');
            } else {
                alert(data.message || 'Erreur de connexion');
            }
            return;
        }
        
        currentSessionId = data.session_id;
        loginForm.classList.add('hidden');
        emailList.classList.remove('hidden');
        loadEmails();
        
    } catch (error) {
        alert('Erreur de connexion: ' + error.message);
    }
});

// Logout Handler
document.getElementById('logout').addEventListener('click', async () => {
    try {
        await fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId: currentSessionId
            }),
        });
        
        currentSessionId = null;
        emailList.classList.add('hidden');
        emailView.classList.add('hidden');
        loginForm.classList.remove('hidden');
        
        // Reset forms
        document.getElementById('login').reset();
        captchaContainer.classList.add('hidden');
        totpContainer.classList.add('hidden');
        
    } catch (error) {
        alert('Erreur de déconnexion: ' + error.message);
    }
});

// Load Emails
async function loadEmails() {
    try {
        const response = await fetch(`/api/emails?sessionId=${currentSessionId}&page=${currentPage}`);
        const data = await response.json();
        
        const emailsList = document.getElementById('emails');
        emailsList.innerHTML = '';
        
        data.mails.forEach(mail => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="px-4 py-4 sm:px-6 hover:bg-gray-50 cursor-pointer">
                    <div class="flex items-center justify-between">
                        <p class="text-sm font-medium text-indigo-600 truncate">${mail.subject}</p>
                        <div class="ml-2 flex-shrink-0 flex">
                            <p class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                ${new Date(mail.timestamp * 1000).toLocaleString()}
                            </p>
                        </div>
                    </div>
                    <div class="mt-2 sm:flex sm:justify-between">
                        <div class="sm:flex">
                            <p class="flex items-center text-sm text-gray-500">
                                ${mail.sender}
                            </p>
                        </div>
                    </div>
                </div>
            `;
            
            li.addEventListener('click', () => viewEmail(mail.id));
            emailsList.appendChild(li);
        });
        
    } catch (error) {
        alert('Erreur de chargement des emails: ' + error.message);
    }
}

// View Email
async function viewEmail(emailId) {
    try {
        const response = await fetch(`/api/emails/${emailId}?sessionId=${currentSessionId}`);
        const mail = await response.json();
        
        document.getElementById('emailSubject').textContent = mail.subject;
        document.getElementById('emailSender').textContent = mail.sender;
        document.getElementById('emailDate').textContent = new Date(mail.timestamp * 1000).toLocaleString();
        document.getElementById('emailContent').innerHTML = mail.content;
        
        emailList.classList.add('hidden');
        emailView.classList.remove('hidden');
        
    } catch (error) {
        alert('Erreur de chargement de l\'email: ' + error.message);
    }
}

// Back to List Handler
document.getElementById('backToList').addEventListener('click', () => {
    emailView.classList.add('hidden');
    emailList.classList.remove('hidden');
});

// Pagination Handlers
document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 0) {
        currentPage--;
        loadEmails();
    }
});

document.getElementById('nextPage').addEventListener('click', () => {
    currentPage++;
    loadEmails();
});
