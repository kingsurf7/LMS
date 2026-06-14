// =====================================================
// TABLEAU DE BORD PROMOTEUR
// =====================================================

const URL_API = 'http://localhost:5000/api';

// Vérification de l'authentification
const utilisateur = getUtilisateur();
if (!utilisateur || utilisateur.role !== 'promoteur') {
    window.location.href = 'index.html';
}

// Affichage du nom de l'utilisateur
document.getElementById('nomPromoteur').innerText = utilisateur.nom;

// =====================================================
// CHARGEMENT DES DONNÉES
// =====================================================

/**
 * Charge tous les cours
 */
async function chargerTousLesCours() {
    try {
        const reponse = await fetch(`${URL_API}/cours`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (reponse.ok) {
            const cours = await reponse.json();
            afficherCours(cours);
            document.getElementById('totalCours').innerText = cours.length;
        }
    } catch (erreur) {
        console.error('Erreur chargement cours:', erreur);
    }
}

/**
 * Affiche la liste des cours
 */
function afficherCours(cours) {
    const conteneur = document.getElementById('listeCours');
    if (!conteneur) return;
    
    if (cours.length === 0) {
        conteneur.innerHTML = '<p class="texte-centre">Aucun cours créé</p>';
        return;
    }
    
    conteneur.innerHTML = cours.map(c => `
        <div class="element-cours">
            <div class="info-cours">
                <h4>${c.titre}</h4>
                <p>${c.description || 'Aucune description'}</p>
                <small>👤 Promoteur: ${c.nom_promoteur}</small>
                <small>📚 ${c.nombre_lecons || 0} leçons</small>
                <small>👥 ${c.nombre_etudiants || 0} étudiants inscrits</small>
            </div>
            <div class="actions-cours">
                <button class="btn btn-secondaire btn-petit" onclick="modifierCours(${c.id})">Modifier</button>
                <button class="btn btn-danger btn-petit" onclick="supprimerCours(${c.id})">Supprimer</button>
            </div>
        </div>
    `).join('');
}

/**
 * Charge tous les étudiants
 */
async function chargerTousLesEtudiants() {
    try {
        const reponse = await fetch(`${URL_API}/utilisateurs/etudiants`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (reponse.ok) {
            const etudiants = await reponse.json();
            afficherEtudiants(etudiants);
            document.getElementById('totalEtudiants').innerText = etudiants.length;
            
            // Remplir le select du modal certificat
            const selectEtudiant = document.getElementById('etudiantCertificat');
            if (selectEtudiant) {
                selectEtudiant.innerHTML = '<option value="">Sélectionner un étudiant</option>' +
                    etudiants.map(e => `<option value="${e.id}">${e.nom} (${e.email})</option>`).join('');
            }
        }
    } catch (erreur) {
        console.error('Erreur chargement étudiants:', erreur);
    }
}

/**
 * Affiche la liste des étudiants
 */
function afficherEtudiants(etudiants) {
    const conteneur = document.getElementById('listeEtudiants');
    if (!conteneur) return;
    
    if (etudiants.length === 0) {
        conteneur.innerHTML = '<p class="texte-centre">Aucun étudiant inscrit</p>';
        return;
    }
    
    conteneur.innerHTML = etudiants.map(e => `
        <div class="element-etudiant">
            <div class="info-etudiant">
                <h4>${e.nom}</h4>
                <p>${e.email}</p>
                <small>📅 Inscrit depuis: ${new Date(e.date_creation).toLocaleDateString()}</small>
            </div>
            <div class="actions-etudiant">
                <button class="btn btn-secondaire btn-petit" onclick="voirProgressionEtudiant(${e.id})">Voir progression</button>
                <button class="btn btn-principal btn-petit" onclick="ouvrirModalCertificat(${e.id})">+ Certificat</button>
            </div>
        </div>
    `).join('');
}

// =====================================================
// GESTION DES COURS
// =====================================================

/**
 * Ouvre le modal de création de cours
 */
function ouvrirModalCours() {
    const modal = document.getElementById('modalCours');
    if (modal) modal.style.display = 'block';
}

/**
 * Crée un nouveau cours
 */
async function creerCours() {
    const titre = document.getElementById('titreCours').value;
    const description = document.getElementById('descriptionCours').value;
    
    if (!titre) {
        alert('Veuillez entrer un titre');
        return;
    }
    
    try {
        const reponse = await fetch(`${URL_API}/cours`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ titre, description })
        });
        
        if (reponse.ok) {
            alert('Cours créé avec succès');
            fermerModal('modalCours');
            document.getElementById('formCours').reset();
            chargerTousLesCours();
        } else {
            const erreur = await reponse.json();
            alert('Erreur: ' + erreur.erreur);
        }
    } catch (erreur) {
        console.error('Erreur création cours:', erreur);
        alert('Erreur lors de la création du cours');
    }
}

/**
 * Modifie un cours
 */
async function modifierCours(coursId) {
    const nouveauTitre = prompt('Nouveau titre du cours:');
    if (!nouveauTitre) return;
    
    const nouvelleDescription = prompt('Nouvelle description:');
    
    try {
        const reponse = await fetch(`${URL_API}/cours/${coursId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ titre: nouveauTitre, description: nouvelleDescription })
        });
        
        if (reponse.ok) {
            alert('Cours modifié avec succès');
            chargerTousLesCours();
        }
    } catch (erreur) {
        console.error('Erreur modification:', erreur);
    }
}

/**
 * Supprime un cours
 */
async function supprimerCours(coursId) {
    if (!confirm('Voulez-vous vraiment supprimer ce cours ? Cette action est irréversible.')) return;
    
    try {
        const reponse = await fetch(`${URL_API}/cours/${coursId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (reponse.ok) {
            alert('Cours supprimé avec succès');
            chargerTousLesCours();
        }
    } catch (erreur) {
        console.error('Erreur suppression:', erreur);
    }
}

// =====================================================
// GESTION DES CERTIFICATS
// =====================================================

/**
 * Ouvre le modal de génération de certificat
 */
function ouvrirModalCertificat(etudiantId = null) {
    // Charger les cours pour le select
    chargerCoursPourSelect();
    
    if (etudiantId) {
        document.getElementById('etudiantCertificat').value = etudiantId;
    }
    
    const modal = document.getElementById('modalCertificat');
    if (modal) modal.style.display = 'block';
}

/**
 * Charge les cours pour le select
 */
async function chargerCoursPourSelect() {
    try {
        const reponse = await fetch(`${URL_API}/cours`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (reponse.ok) {
            const cours = await reponse.json();
            const selectCours = document.getElementById('coursCertificat');
            if (selectCours) {
                selectCours.innerHTML = '<option value="">Sélectionner un cours</option>' +
                    cours.map(c => `<option value="${c.id}">${c.titre}</option>`).join('');
            }
        }
    } catch (erreur) {
        console.error('Erreur chargement cours:', erreur);
    }
}

/**
 * Génère un certificat
 */
async function genererCertificat() {
    const etudiantId = document.getElementById('etudiantCertificat').value;
    const coursId = document.getElementById('coursCertificat').value;
    
    if (!etudiantId || !coursId) {
        alert('Veuillez sélectionner un étudiant et un cours');
        return;
    }
    
    try {
        const reponse = await fetch(`${URL_API}/certificats/generer`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ etudiantId, coursId })
        });
        
        const resultat = await reponse.json();
        
        if (reponse.ok) {
            alert(`Certificat généré avec succès!\nCode: ${resultat.code_certificat}`);
            fermerModal('modalCertificat');
            chargerTousLesEtudiants();
            
            // Mettre à jour le compteur
            const total = document.getElementById('totalCertificats');
            if (total) {
                const nouveauTotal = parseInt(total.innerText) + 1;
                total.innerText = nouveauTotal;
            }
        } else {
            alert('Erreur: ' + resultat.erreur);
        }
    } catch (erreur) {
        console.error('Erreur génération certificat:', erreur);
        alert('Erreur lors de la génération du certificat');
    }
}

// =====================================================
// STATISTIQUES
// =====================================================

/**
 * Charge les statistiques globales
 */
async function chargerStatistiques() {
    try {
        // Récupérer le nombre de certificats
        const reponse = await fetch(`${URL_API}/certificats/tous`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (reponse.ok) {
            const certificats = await reponse.json();
            document.getElementById('totalCertificats').innerText = certificats.length;
        }
    } catch (erreur) {
        console.error('Erreur chargement statistiques:', erreur);
    }
}

/**
 * Voir la progression d'un étudiant
 */
async function voirProgressionEtudiant(etudiantId) {
    try {
        const reponse = await fetch(`${URL_API}/progressions/etudiant/${etudiantId}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (reponse.ok) {
            const progressions = await reponse.json();
            let message = `Progression de l'étudiant:\n\n`;
            progressions.forEach(p => {
                message += `📚 ${p.titre_cours} - ${p.titre_lecon}: ${p.score || 0}% ${p.terminee ? '✅' : '❌'}\n`;
            });
            alert(message);
        }
    } catch (erreur) {
        console.error('Erreur chargement progression:', erreur);
        alert('Erreur lors du chargement de la progression');
    }
}

// Fonctions utilitaires
function fermerModal(idModal) {
    const modal = document.getElementById(idModal);
    if (modal) modal.style.display = 'none';
}

// Fermeture des modals au clic sur les boutons de fermeture
document.querySelectorAll('.fermer').forEach(btn => {
    btn.onclick = function() {
        this.closest('.modal').style.display = 'none';
    }
});

// Initialisation
chargerTousLesCours();
chargerTousLesEtudiants();
chargerStatistiques();
