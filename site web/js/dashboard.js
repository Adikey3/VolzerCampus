// Gestion du bouton "Accéder au réseau social"
document.addEventListener('DOMContentLoaded', function() {
    const continueBtn = document.getElementById('continueBtn');
    
    if (continueBtn) {
        continueBtn.addEventListener('click', function() {
            // Redirection vers la page profil
            window.location.href = '/profil';
        });
    }

    // Remplir les informations utilisateur
    loadUserData();
    
    // Gestion de la déconnexion
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            logoutUser();
        });
    }
});

// Charger les données utilisateur
async function loadUserData() {
    try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();

        if (data.success && data.user) {
            // Mettre à jour l'interface
            document.getElementById('headerUserName').textContent = data.user.prenom;
            document.getElementById('userName').textContent = `${data.user.prenom} ${data.user.nom}`;
            document.getElementById('userEmail').textContent = data.user.email;
            document.getElementById('detailEmail').textContent = data.user.email;
            document.getElementById('detailStatus').textContent = data.user.role;
            
            // Avatar avec initiales
            const initials = (data.user.prenom?.charAt(0) || '') + (data.user.nom?.charAt(0) || '');
            document.getElementById('userAvatar').textContent = initials.toUpperCase();
            
            // Charger les détails supplémentaires si besoin
            loadUserDetails(data.user.id);
        } else {
            // Rediriger vers login si pas connecté
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Erreur chargement données:', error);
    }
}

// Charger les détails supplémentaires de l'utilisateur
async function loadUserDetails(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();
        
        if (data.success && data.user) {
            const user = data.user;
            
            // Mettre à jour les informations supplémentaires
            if (user.specialite) {
                document.getElementById('userFiliere').textContent = `Filière: ${user.specialite}`;
                document.getElementById('detailFiliere').textContent = user.specialite;
            }
            
            if (user.date_inscription) {
                const date = new Date(user.date_inscription).toLocaleDateString('fr-FR');
                document.getElementById('detailJoinDate').textContent = date;
            }
        }
    } catch (error) {
        console.error('Erreur détails utilisateur:', error);
    }
}

// Déconnexion
async function logoutUser() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Redirection vers la page d'accueil
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Erreur déconnexion:', error);
        // Redirection forcée
        window.location.href = '/';
    }
}