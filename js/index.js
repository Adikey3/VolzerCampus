// Volzer Université - Mode Hors Ligne
class VolzerApp {
    constructor() {
        this.isOnline = false;
        this.localUsers = 0;
        this.init();
    }

    init() {
        this.setupLoadingAnimation();
        this.setupConnectionMonitoring();
        this.setupFeatureCards();
        this.setupServiceWorker();
        this.simulateLocalUsers();
    }

    setupLoadingAnimation() {
        const loadingContainer = document.getElementById('loadingContainer');
        const loadingProgress = document.getElementById('loadingProgress');
        const loadingText = document.getElementById('loadingText');
        const mainContent = document.getElementById('mainContent');
        
        if (!loadingContainer || !mainContent) {
            console.error('❌ Éléments de chargement non trouvés');
            return;
        }
        
        const loadingMessages = [
            "Initialisation du système Volzer...",
            "Chargement des modules hors ligne...",
            "Configuration du réseau local...",
            "Vérification des utilisateurs...",
            "Prêt à fonctionner hors ligne"
        ];
        
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 100) progress = 100;
            
            if (loadingProgress) {
                loadingProgress.style.width = `${progress}%`;
            }
            
            const messageIndex = Math.min(Math.floor(progress / 20), loadingMessages.length - 1);
            if (loadingText) {
                loadingText.textContent = loadingMessages[messageIndex];
            }
            
            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    loadingContainer.style.opacity = '0';
                    setTimeout(() => {
                        loadingContainer.style.display = 'none';
                        
                        // Afficher le contenu principal
                        mainContent.style.display = 'flex';
                        mainContent.style.opacity = '1';
                        mainContent.style.transform = 'translateY(0)';
                        
                        this.animateTechItems();
                    }, 500);
                }, 500);
            }
        }, 200);
    }

    animateTechItems() {
        const techItems = document.querySelectorAll('.tech-item');
        techItems.forEach((item, index) => {
            item.style.animation = `float 6s infinite ease-in-out ${index * 0.5}s`;
        });
    }

    setupConnectionMonitoring() {
        // Vérification initiale
        this.checkConnection();
        
        // Vérification périodique
        setInterval(() => this.checkConnection(), 10000);
        
        // Écouteurs d'événements de connexion réelle
        window.addEventListener('online', () => this.handleConnectionChange(true));
        window.addEventListener('offline', () => this.handleConnectionChange(false));
    }

    checkConnection() {
        // Simulation - dans la vraie app, ça vérifierait le serveur local
        const isLocalNetworkAvailable = Math.random() > 0.3; // 70% de chance d'être connecté
        
        if (isLocalNetworkAvailable) {
            this.handleConnectionChange(true);
        } else {
            this.handleConnectionChange(false);
        }
    }

    handleConnectionChange(online) {
        this.isOnline = online;
        const statusBar = document.getElementById('statusBar');
        const statusText = document.getElementById('statusText');
        const connectionStatus = document.getElementById('connectionStatus');

        if (!statusBar || !statusText || !connectionStatus) {
            console.error('❌ Éléments de statut non trouvés');
            return;
        }

        if (online) {
            statusBar.className = 'status-bar online';
            statusText.textContent = 'Connecté au réseau universitaire';
            connectionStatus.textContent = 'Connecté';
            
            // Notification temporaire
            this.showNotification('Réseau local détecté', 'success');
        } else {
            statusBar.className = 'status-bar';
            statusText.textContent = 'Mode hors ligne - Fonctionnement local';
            connectionStatus.textContent = 'Hors ligne';
        }

        // Afficher la barre de statut
        statusBar.style.display = 'flex';
        
        // Cacher la barre de statut après 5 secondes
        setTimeout(() => {
            statusBar.style.display = 'none';
        }, 5000);
    }

    setupFeatureCards() {
        const featureCards = document.querySelectorAll('.feature-card');
        featureCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const feature = card.dataset.feature;
                this.handleFeatureClick(feature, card);
            });
            
            // Ajouter l'effet hover via JS si nécessaire
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-8px)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
            });
        });
    }

    handleFeatureClick(feature, card) {
        // Animation de feedback
        card.style.transform = 'scale(0.95)';
        setTimeout(() => {
            card.style.transform = 'translateY(-8px)';
        }, 150);

        // Messages selon la fonctionnalité
        const messages = {
            messagerie: 'Messagerie hors ligne',
            fichiers: 'Partage de fichiers',
            agenda: 'Agenda académique'
        };

        if (messages[feature]) {
            this.showNotification(`Ouverture de ${messages[feature]}...`, 'info');
        }
    }

    simulateLocalUsers() {
        const usersCountElement = document.getElementById('usersCount');
        if (!usersCountElement) return;

        // Simulation d'utilisateurs connectés localement
        setInterval(() => {
            this.localUsers = Math.floor(Math.random() * 50) + 10; // 10-60 utilisateurs
            usersCountElement.textContent = this.localUsers;
        }, 5000);

        // Première mise à jour
        this.localUsers = Math.floor(Math.random() * 50) + 10;
        usersCountElement.textContent = this.localUsers;
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('✅ Service Worker Volzer enregistré');
                })
                .catch(error => {
                    console.log('❌ Service Worker non supporté:', error);
                });
        }
    }

    showNotification(message, type = 'info') {
        // Création d'une notification simple
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;
        
        // Styles pour la notification
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            z-index: 1002;
            animation: slideInRight 0.3s ease;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;

        document.body.appendChild(notification);

        // Supprimer après 3 secondes
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    getNotificationColor(type) {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[type] || '#3b82f6';
    }
}

// Ajouter les styles d'animation pour les notifications
function addNotificationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { 
                transform: translateX(100%); 
                opacity: 0; 
            }
            to { 
                transform: translateX(0); 
                opacity: 1; 
            }
        }
        
        @keyframes slideOutRight {
            from { 
                transform: translateX(0); 
                opacity: 1; 
            }
            to { 
                transform: translateX(100%); 
                opacity: 0; 
            }
        }
        
        .notification {
            font-family: system-ui, -apple-system, sans-serif;
            font-weight: 500;
        }
    `;
    document.head.appendChild(style);
}

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', () => {
    // Ajouter les styles d'animation
    addNotificationStyles();
    
    // Démarrer l'application
    new VolzerApp();
    
    console.log('🚀 Application Volzer Université initialisée');
});

// Gestion des erreurs globales
window.addEventListener('error', (e) => {
    console.error('❌ Erreur globale:', e.error);
});