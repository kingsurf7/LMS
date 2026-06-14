// =====================================================
// SCRIPT PRINCIPAL - PAGE D'ACCUEIL ET AUTHENTIFICATION
// =====================================================

const URL_API = 'http://localhost:5000/api';

// Vérifier si l'utilisateur est déjà connecté
const utilisateurStocke = localStorage.getItem('utilisateur');
if (utilisateurStocke) {
    const utilisateur = JSON.parse(utilisateurStocke);
    redirigerVersDashboard(utilisateur.role);
}

// =====================================================
// GESTION DES MODALS
// =====================================================

/**
 * Ouvre le modal de connexion
 */
function ouvrirModalConnexion() {
    document.getElementById('modalConnexion').style.display = 'block';
}

/**
 * Ouvre le modal d'inscription
 */
function ouvrirModalInscription() {
    document.getElementById('modalInscription').style.display = 'block';
}

// Fermeture des modals
document.querySelectorAll('.fermer').forEach(btnFermer => {
    btnFermer.onclick = function() {
        this.closest('.modal').style.display = 'none';
    }
});

// Fermeture en cliquant à l'extérieur
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// =====================================================
// GESTION DE LA CONNEXION
// =====================================================

document.getElementById('formulaireConnexion')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target[0].value;
    const motDePasse = e.target[1].value;
    
    try {
        const reponse = await fetch(`${URL_API}/auth/connexion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, motDePasse })
        });
        
        const donnees = await reponse.json();
        if (reponse.ok) {
            // Stocker le token et les infos utilisateur
            localStorage.setItem('token', donnees.token);
            localStorage.setItem('utilisateur', JSON.stringify(donnees.utilisateur));
            redirigerVersDashboard(donnees.utilisateur.role);
        } else {
            alert('Erreur de connexion: ' + (donnees.erreur || 'Identifiants incorrects'));
        }
    } catch (erreur) {
        console.error('Erreur:', erreur);
        alert('Erreur de connexion au serveur');
    }
});

// =====================================================
// GESTION DE L'INSCRIPTION
// =====================================================

document.getElementById('formulaireInscription')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nom = e.target[0].value;
    const email = e.target[1].value;
    const motDePasse = e.target[2].value;
    const role = e.target[3].value;
    
    if (!role) {
        alert('Veuillez sélectionner un rôle');
        return;
    }
    
    try {
        const reponse = await fetch(`${URL_API}/auth/inscription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nom, email, motDePasse, role })
        });
        
        const donnees = await reponse.json();
        if (reponse.ok) {
            localStorage.setItem('token', donnees.token);
            localStorage.setItem('utilisateur', JSON.stringify(donnees.utilisateur));
            redirigerVersDashboard(donnees.utilisateur.role);
        } else {
            alert('Erreur d\'inscription: ' + (donnees.erreur || 'Veuillez réessayer'));
        }
    } catch (erreur) {
        console.error('Erreur:', erreur);
        alert('Erreur de connexion au serveur');
    }
});

// =====================================================
// REDIRECTION VERS LE DASHBOARD APPROPRIÉ
// =====================================================

function redirigerVersDashboard(role) {
    if (role === 'enseignant') {
        window.location.href = 'enseignant.html';
    } else if (role === 'etudiant') {
        window.location.href = 'etudiant.html';
    } else if (role === 'promoteur') {
        window.location.href = 'promoteur.html';
    }
}

// =====================================================
// FONCTIONS UTILITAIRES
// =====================================================

/**
 * Déconnexion de l'utilisateur
 */
function deconnexion() {
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
    window.location.href = 'index.html';
}

/**
 * Récupère le token d'authentification
 */
function getToken() {
    return localStorage.getItem('token');
}

/**
 * Vérifie si l'utilisateur est connecté
 */
function estConnecte() {
    return localStorage.getItem('token') !== null;
}

/**
 * Récupère les informations de l'utilisateur connecté
 */
function getUtilisateur() {
    const utilisateur = localStorage.getItem('utilisateur');
    return utilisateur ? JSON.parse(utilisateur) : null;
}
