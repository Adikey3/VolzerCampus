// auth.js - Gestionnaire d'authentification professionnel
class AuthManager {
    constructor() {
        this.isProcessing = false;
        this.security = new SecurityManager();
        this.analytics = new AuthAnalytics();
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkExistingSession();
        this.setupPerformanceMonitoring();
        console.log('🔐 AuthManager initialisé');
    }

    bindEvents() {
        // Gestionnaire d'inscription
        const registerForm = document.getElementById('registration-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
            this.setupRealTimeValidation(registerForm);
        }

        // Gestionnaire de connexion
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

      
    }

    setupRealTimeValidation(form) {
        const fields = {
            password: form.querySelector('#password'),
            confirmPassword: form.querySelector('#confirmPassword'),
            email: form.querySelector('#email')
        };

        // Validation en temps réel du mot de passe
        if (fields.confirmPassword) {
            fields.confirmPassword.addEventListener('input', () => {
                this.validatePasswordMatch(fields.password, fields.confirmPassword);
            });
        }

        // Validation email en temps réel
        if (fields.email) {
            fields.email.addEventListener('blur', () => {
                this.validateEmail(fields.email);
            });
        }
    }

    validatePasswordMatch(passwordField, confirmField) {
        if (confirmField.value && passwordField.value !== confirmField.value) {
            this.showFieldError(confirmField, 'Les mots de passe ne correspondent pas');
        } else {
            this.clearFieldError(confirmField);
        }
    }

    validateEmail(emailField) {
        const email = emailField.value.trim();
        if (email && !this.isValidEmail(email)) {
            this.showFieldError(emailField, 'Format d\'email invalide');
        } else {
            this.clearFieldError(emailField);
        }
    }

    showFieldError(field, message) {
        this.clearFieldError(field);
        field.classList.add('error-field');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        field.parentNode.appendChild(errorDiv);
    }

    clearFieldError(field) {
        field.classList.remove('error-field');
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        if (this.isProcessing) return;
        if (this.security.checkLockoutStatus()) return;

        this.setProcessingState(true);
        this.analytics.trackEvent('register_attempt');

        const formData = new FormData(e.target);
        const data = this.processFormData(formData);

        // Validation avancée
        const validation = this.validateRegisterForm(data);
        if (!validation.isValid) {
            this.showMessage(validation.message, 'error');
            this.setProcessingState(false);
            return;
        }

        try {
            this.showLoader(true);
            
            const response = await this.makeRequest('/api/register', data);
            const result = await response.json();

            if (result.success) {
                this.analytics.trackEvent('register_success');
                this.showMessage('🎉 Compte créé avec succès! Redirection...', 'success');
                
                this.saveUserPreferences(data);
                this.security.resetFailedAttempts();
                
                setTimeout(() => {
                    window.location.href = '/login?new_user=true';
                }, 2000);
            } else {
                this.analytics.trackEvent('register_failed');
                this.showMessage(result.message, 'error');
            }
        } catch (error) {
            console.error('Erreur inscription:', error);
            this.showMessage('❌ Erreur de connexion au serveur', 'error');
            this.analytics.trackEvent('register_error');
        } finally {
            this.setProcessingState(false);
            this.showLoader(false);
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        if (this.isProcessing) return;
        if (this.security.checkLockoutStatus()) return;

        this.setProcessingState(true);
        this.analytics.trackEvent('login_attempt');

        const formData = new FormData(e.target);
        const data = {
            email: formData.get('email')?.trim().toLowerCase(),
            password: formData.get('password'),
            remember: formData.get('remember') === 'on'
        };

        if (!this.validateLoginForm(data)) {
            this.setProcessingState(false);
            return;
        }

        try {
            this.showLoader(true);
            
            const response = await this.makeRequest('/api/login', data);
            const result = await response.json();

            if (result.success) {
                await this.handleLoginSuccess(result, data);
            } else {
                await this.handleLoginFailure(data);
            }
        } catch (error) {
            await this.handleLoginError(error);
        } finally {
            this.setProcessingState(false);
            this.showLoader(false);
        }
    }

    async handleLoginSuccess(result, data) {
        this.analytics.trackEvent('login_success');
        this.showMessage('✅ Connexion réussie!', 'success');
        
        // Sauvegarder la session
        await this.saveUserSession(result.user, data.remember);
        
        // Redirection intelligente
        setTimeout(() => {
            const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
            window.location.href = redirectTo;
        }, 1000);
    }

    async handleLoginFailure(data) {
        this.security.recordFailedAttempt();
        this.analytics.trackEvent('login_failed', { email: data.email });
        
        const remainingAttempts = this.security.maxAttempts - this.security.failedAttempts;
        const message = remainingAttempts > 0 
            ? `❌ Identifiants incorrects. ${remainingAttempts} tentatives restantes.`
            : '🔒 Compte temporairement verrouillé. Réessayez dans 15 minutes.';
        
        this.showMessage(message, 'error');
        this.highlightErrorFields();
    }

    async handleLoginError(error) {
        console.error('Erreur connexion:', error);
        this.showMessage('❌ Erreur de connexion au serveur', 'error');
        this.analytics.trackEvent('login_error');
    }

    processFormData(formData) {
        return {
            nom: `${formData.get('prenom')} ${formData.get('nom')}`.trim(),
            prenom: formData.get('prenom')?.trim(),
            email: formData.get('email')?.trim().toLowerCase(),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword'),
            filiere: formData.get('filiere'),
            telephone: formData.get('telephone')?.trim(),
            newsletter: formData.get('newsletter') === 'on'
        };
    }

    validateRegisterForm(data) {
        const validations = [
            { condition: !data.nom || !data.prenom, message: 'Le nom complet est requis' },
            { condition: !data.email, message: 'L\'email est requis' },
            { condition: data.email && !this.isValidEmail(data.email), message: 'Format d\'email invalide' },
            { condition: !data.password, message: 'Le mot de passe est requis' },
            { condition: data.password && data.password.length < 6, message: 'Le mot de passe doit contenir au moins 6 caractères' },
            { condition: data.password !== data.confirmPassword, message: 'Les mots de passe ne correspondent pas' },
            { condition: !data.filiere, message: 'La filière est requise' }
        ];

        const failedValidation = validations.find(v => v.condition);
        return {
            isValid: !failedValidation,
            message: failedValidation?.message || ''
        };
    }

    validateLoginForm(data) {
        if (!data.email || !data.password) {
            this.showMessage('Veuillez remplir tous les champs', 'error');
            return false;
        }

        if (!this.isValidEmail(data.email)) {
            this.showMessage('Format d\'email invalide', 'error');
            return false;
        }

        return true;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async makeRequest(url, data) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
            return await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(data),
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async saveUserSession(user, remember) {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('last_used_email', user.email);
        localStorage.setItem('user_login_time', Date.now().toString());

        if (remember) {
            localStorage.setItem('remember_me', 'true');
        }

        // Sauvegarder les préférences utilisateur
        await this.saveUserPreferences(user);
    }

    saveUserPreferences(data) {
        const preferences = {
            theme: 'light',
            language: 'fr',
            notifications: true,
            last_activity: new Date().toISOString()
        };
        localStorage.setItem('user_preferences', JSON.stringify(preferences));
    }

    checkExistingSession() {
        const user = this.getCurrentUser();
        if (user && this.shouldRedirectToDashboard()) {
            console.log('🔄 Utilisateur déjà connecté, redirection...');
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 500);
        }
    }

    getCurrentUser() {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    }

    shouldRedirectToDashboard() {
        return window.location.pathname === '/login' || 
               window.location.pathname === '/register';
    }

    setProcessingState(processing) {
        this.isProcessing = processing;
        document.querySelectorAll('button[type="submit"]').forEach(button => {
            button.disabled = processing;
            button.style.opacity = processing ? '0.7' : '1';
        });
    }

    showLoader(show) {
        const loaders = document.querySelectorAll('.btn-loader');
        const btnTexts = document.querySelectorAll('.btn-text');
        
        loaders.forEach(loader => loader.style.display = show ? 'flex' : 'none');
        btnTexts.forEach(text => text.style.visibility = show ? 'hidden' : 'visible');
    }

    showMessage(message, type) {
        let messageDiv = document.getElementById('auth-message');
        
        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.id = 'auth-message';
            messageDiv.className = `auth-message ${type}`;
            document.querySelector('.auth-container')?.prepend(messageDiv);
        }

        messageDiv.innerHTML = `
            <div class="message-content">
                <span class="message-icon">${type === 'success' ? '✅' : '❌'}</span>
                <span class="message-text">${message}</span>
                <button class="message-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        messageDiv.style.display = 'block';
        this.animateMessage(messageDiv);

        if (type === 'error') {
            setTimeout(() => {
                if (messageDiv.parentElement) {
                    this.animateOut(messageDiv);
                }
            }, 5000);
        }
    }

    animateMessage(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(-20px)';
        
        requestAnimationFrame(() => {
            element.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        });
    }

    animateOut(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            if (element.parentElement) {
                element.remove();
            }
        }, 300);
    }

    highlightErrorFields() {
        document.querySelectorAll('input').forEach(input => {
            if (!input.value) {
                input.classList.add('error-field');
                setTimeout(() => input.classList.remove('error-field'), 2000);
            }
        });
    }

    setupSessionWatcher() {
        // Vérifier périodiquement la session
        setInterval(() => {
            const loginTime = localStorage.getItem('user_login_time');
            if (loginTime && Date.now() - parseInt(loginTime) > 24 * 60 * 60 * 1000) {
                this.showSessionWarning();
            }
        }, 5 * 60 * 1000); // Toutes les 5 minutes
    }

    showSessionWarning() {
        if (!document.getElementById('session-warning')) {
            const warning = document.createElement('div');
            warning.id = 'session-warning';
            warning.className = 'session-warning';
            warning.innerHTML = `
                <div class="warning-content">
                    <span>🕒 Votre session expire bientôt</span>
                    <button onclick="this.parentElement.parentElement.remove()">×</button>
                </div>
            `;
            document.body.appendChild(warning);
        }
    }

    setupPerformanceMonitoring() {
        // Mesurer le temps de chargement
        const authStartTime = performance.now();
        window.addEventListener('load', () => {
            const loadTime = performance.now() - authStartTime;
            this.analytics.trackPerformance('auth_page_load', loadTime);
        });
    }

    // Méthodes publiques
    logout() {
        if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
            this.analytics.trackEvent('user_logout');
            localStorage.removeItem('user');
            localStorage.removeItem('user_login_time');
            window.location.href = '/login';
        }
    }

    getAuthStatus() {
        const user = this.getCurrentUser();
        return {
            isAuthenticated: !!user,
            user: user,
            loginTime: localStorage.getItem('user_login_time')
        };
    }
}

// Gestionnaire de sécurité
class SecurityManager {
    constructor() {
        this.failedAttempts = parseInt(localStorage.getItem('failed_login_attempts')) || 0;
        this.maxAttempts = 5;
        this.lockoutTime = 15 * 60 * 1000; // 15 minutes
    }

    checkLockoutStatus() {
        const lockoutUntil = localStorage.getItem('auth_lockout_until');
        if (lockoutUntil && Date.now() < parseInt(lockoutUntil)) {
            this.showLockoutMessage(lockoutUntil);
            return true;
        }
        return false;
    }

    recordFailedAttempt() {
        this.failedAttempts++;
        localStorage.setItem('failed_login_attempts', this.failedAttempts);

        if (this.failedAttempts >= this.maxAttempts) {
            this.lockoutAccount();
        }
    }

    resetFailedAttempts() {
        this.failedAttempts = 0;
        localStorage.removeItem('failed_login_attempts');
        localStorage.removeItem('auth_lockout_until');
    }

    lockoutAccount() {
        const lockoutUntil = Date.now() + this.lockoutTime;
        localStorage.setItem('auth_lockout_until', lockoutUntil);
        this.showLockoutMessage(lockoutUntil);
    }

    showLockoutMessage(lockoutUntil) {
        const remainingTime = Math.ceil((lockoutUntil - Date.now()) / 60000);
        const message = `🔒 Trop de tentatives échouées. Compte verrouillé pour ${remainingTime} minutes.`;
        
        // Créer une overlay de sécurité
        this.createSecurityOverlay(message);
    }

    createSecurityOverlay(message) {
        const overlay = document.createElement('div');
        overlay.className = 'security-overlay';
        overlay.innerHTML = `
            <div class="security-modal">
                <div class="security-icon">🔒</div>
                <h3>Sécurité Renforcée</h3>
                <p>${message}</p>
                <div class="security-timer" id="security-timer"></div>
                <button onclick="location.reload()" class="security-retry-btn">Réessayer</button>
            </div>
        `;
        document.body.appendChild(overlay);
        
        this.startSecurityTimer(lockoutUntil);
    }

    startSecurityTimer(lockoutUntil) {
        const timerElement = document.getElementById('security-timer');
        const updateTimer = () => {
            const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
            if (remaining > 0) {
                timerElement.textContent = `Temps restant: ${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')}`;
                setTimeout(updateTimer, 1000);
            } else {
                location.reload();
            }
        };
        updateTimer();
    }
}

// Analytics d'authentification
class AuthAnalytics {
    constructor() {
        this.events = [];
    }

    trackEvent(eventName, data = {}) {
        const event = {
            name: eventName,
            timestamp: new Date().toISOString(),
            data: data,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        this.events.push(event);
        console.log(`📊 Auth Event: ${eventName}`, event);
        
        // Sauvegarder en localStorage pour debug
        this.saveToStorage();
    }

    trackPerformance(metric, value) {
        this.trackEvent('performance', { metric, value });
    }

    saveToStorage() {
        if (this.events.length > 50) {
            this.events = this.events.slice(-50); // Garder seulement les 50 derniers events
        }
        localStorage.setItem('auth_analytics', JSON.stringify(this.events));
    }

    getEvents() {
        return this.events;
    }
}

// UI Manager pour l'authentification
class AuthUIManager {
    static init() {
        this.setupPasswordToggle();
        this.setupInputAnimations();
        this.setupRememberMe();
        this.setupThemeDetection();
        this.injectGlobalStyles();
    }

    static setupPasswordToggle() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.toggle-password')) {
                const button = e.target.closest('.toggle-password');
                const input = button.closest('.input-wrapper').querySelector('input');
                const icon = button.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                    button.setAttribute('aria-label', 'Cacher le mot de passe');
                } else {
                    input.type = 'password';
                    icon.className = 'fas fa-eye';
                    button.setAttribute('aria-label', 'Afficher le mot de passe');
                }
            }
        });
    }

    static setupInputAnimations() {
        // Animation des labels flottants
        document.querySelectorAll('.input-wrapper input, .input-wrapper select').forEach(input => {
            // État initial
            if (input.value) {
                input.parentElement.classList.add('focused');
            }
            
            // Gestion des événements
            input.addEventListener('focus', function() {
                this.parentElement.classList.add('focused', 'focused-animate');
            });
            
            input.addEventListener('blur', function() {
                this.parentElement.classList.remove('focused-animate');
                if (!this.value) {
                    this.parentElement.classList.remove('focused');
                }
            });

            // Animation au chargement
            setTimeout(() => {
                if (input.value) {
                    input.parentElement.classList.add('focused');
                }
            }, 100);
        });
    }

    static setupRememberMe() {
        const rememberCheckbox = document.getElementById('remember');
        if (rememberCheckbox && localStorage.getItem('remember_me') === 'true') {
            rememberCheckbox.checked = true;
        }
    }

    static setupThemeDetection() {
        // Détection du thème système
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }

        // Écouter les changements de thème
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        });
    }

    static injectGlobalStyles() {
        const styles = `
            <style>
                .auth-message {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    max-width: 400px;
                    border-radius: 12px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    overflow: hidden;
                }

                .message-content {
                    padding: 16px 20px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-weight: 500;
                }

                .auth-message.success {
                    background: #d4edda;
                    color: #155724;
                    border: 1px solid #c3e6cb;
                }

                .auth-message.error {
                    background: #f8d7da;
                    color: #721c24;
                    border: 1px solid #f5c6cb;
                }

                .message-close {
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    margin-left: auto;
                    opacity: 0.7;
                }

                .message-close:hover {
                    opacity: 1;
                }

                .security-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.8);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .security-modal {
                    background: white;
                    padding: 30px;
                    border-radius: 15px;
                    text-align: center;
                    max-width: 400px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                }

                .security-icon {
                    font-size: 48px;
                    margin-bottom: 16px;
                }

                .security-timer {
                    font-family: monospace;
                    font-size: 18px;
                    margin: 16px 0;
                    padding: 8px;
                    background: #f8f9fa;
                    border-radius: 6px;
                }

                .security-retry-btn {
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                }

                .field-error {
                    color: #dc3545;
                    font-size: 12px;
                    margin-top: 4px;
                    font-weight: 500;
                }

                .error-field {
                    border-color: #dc3545 !important;
                    background: #fff5f5 !important;
                }

                .session-warning {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: #fff3cd;
                    color: #856404;
                    padding: 12px 16px;
                    border-radius: 8px;
                    border: 1px solid #ffeaa7;
                    z-index: 9999;
                }

                .warning-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                /* Animations */
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }

                .error-field {
                    animation: shake 0.5s ease;
                }

                /* Responsive */
                @media (max-width: 768px) {
                    .auth-message {
                        left: 20px;
                        right: 20px;
                        max-width: none;
                    }
                    
                    .security-modal {
                        margin: 20px;
                        padding: 20px;
                    }
                }

                /* Thème sombre */
                [data-theme="dark"] {
                    --bg-primary: #1a1a1a;
                    --text-primary: #ffffff;
                }

                /* Accessibilité */
                @media (prefers-reduced-motion: reduce) {
                    * {
                        animation-duration: 0.01ms !important;
                        animation-iteration-count: 1 !important;
                        transition-duration: 0.01ms !important;
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }
}

// Initialisation globale
document.addEventListener('DOMContentLoaded', function() {
    // Initialiser l'UI
    AuthUIManager.init();
    
    // Initialiser le gestionnaire d'authentification
    window.authManager = new AuthManager();
    
    // Exposer les méthodes globales
    window.logout = () => window.authManager.logout();
    window.getAuthStatus = () => window.authManager.getAuthStatus();
    
    console.log('🎯 Système d\'authentification initialisé');
});

// Export pour les modules ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthManager, AuthUIManager, SecurityManager, AuthAnalytics };
}