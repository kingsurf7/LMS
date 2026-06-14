// =====================================================
// TABLEAU DE BORD ENSEIGNANT
// =====================================================

const URL_API = 'http://localhost:5000/api';

// Vérification de l'authentification
const utilisateur = getUtilisateur();
if (!utilisateur || utilisateur.role !== 'enseignant') {
    window.location.href = 'index.html';
}

// Affichage du nom de l'utilisateur
document.getElementById('nomEnseignant').innerText = utilisateur.nom;

// =====================================================
// CHARGEMENT DES DONNÉES
// =====================================================

/**
 * Charge tous les cours
 */
async function chargerCours() {
    try {
        const reponse = await fetch(`${URL_API}/cours`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (reponse.ok) {
            const cours = await reponse.json();
            afficherCours(cours);
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
    
    conteneur.innerHTML = cours.map(c => `
        <div class="element-cours">
            <div class="info-cours">
                <h4>${c.titre}</h4>
                <p>${c.description || 'Aucune description'}</p>
                <small>📚 ${c.nombre_lecons || 0} leçons | 👥 ${c.nombre_etudiants || 0} étudiants</small>
            </div>
            <div class="actions-cours">
                <button class="btn btn-petit" onclick="voirCours(${c.id})">Voir</button>
                <button class="btn btn-petit btn-secondaire" onclick="ajouterLecon(${c.id})">+ Leçon</button>
            </div>
        </div>
    `).join('');
}

/**
 * Charge les réunions de l'enseignant
 */
async function chargerReunions() {
    try {
        const reponse = await fetch(`${URL_API}/reunions/enseignant`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (reponse.ok) {
            const reunions = await reponse.json();
            afficherReunions(reunions);
        }
    } catch (erreur) {
        console.error('Erreur chargement réunions:', erreur);
    }
}

/**
 * Affiche les réunions
 */
function afficherReunions(reunions) {
    const conteneur = document.getElementById('listeReunions');
    if (!conteneur) return;
    
    if (reunions.length === 0) {
        conteneur.innerHTML = '<p class="texte-centre">Aucune réunion programmée</p>';
        return;
    }
    
    conteneur.innerHTML = reunions.map(r => `
        <div class="element-reunion">
            <div class="info-reunion">
                <h4>${r.titre}</h4>
                <p>${r.description || ''}</p>
                <small>📅 ${new Date(r.heure_programmee).toLocaleString()}</small>
                <small>👥 ${r.nombre_participants || 0} participants</small>
            </div>
            <div class="actions-reunion">
                ${r.statut === 'programmee' ? 
                    `<button class="btn btn-principal btn-petit" onclick="demarrerReunion(${r.id})">Démarrer</button>` : 
                    r.statut === 'en_cours' ?
                    `<button class="btn btn-principal btn-petit" onclick="rejoindreReunion(${r.id})">Rejoindre</button>` :
                    `<button class="btn btn-secondaire btn-petit" onclick="voirEnregistrement('${r.url_enregistrement}')">Voir enregistrement</button>`
                }
                <button class="btn btn-danger btn-petit" onclick="annulerReunion(${r.id})">Annuler</button>
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
            chargerCours();
        } else {
            const erreur = await reponse.json();
            alert('Erreur: ' + erreur.erreur);
        }
    } catch (erreur) {
        console.error('Erreur création cours:', erreur);
        alert('Erreur lors de la création du cours');
    }
}

// =====================================================
// GESTION DES LEÇONS
// =====================================================

let coursActuelId = null;

/**
 * Ouvre le modal d'ajout de leçon
 */
function ajouterLecon(coursId) {
    coursActuelId = coursId;
    const modal = document.getElementById('modalLecon');
    if (modal) modal.style.display = 'block';
}

/**
 * Crée une nouvelle leçon avec upload de fichier
 */
async function creerLecon() {
    const titre = document.getElementById('titreLecon').value;
    const contenu = document.getElementById('contenuLecon').value;
    const type = document.getElementById('typeLecon').value;
    const fichier = document.getElementById('fichierLecon').files[0];
    
    if (!titre || !type) {
        alert('Veuillez remplir tous les champs');
        return;
    }
    
    try {
        let urlFichier = null;
        
        // Upload du fichier si présent
        if (fichier) {
            const formData = new FormData();
            formData.append('fichier', fichier);
            
            const uploadReponse = await fetch(`${URL_API}/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}` },
                body: formData
            });
            
            if (uploadReponse.ok) {
                const uploadData = await uploadReponse.json();
                urlFichier = uploadData.url;
            }
        }
        
        // Création de la leçon
        const reponse = await fetch(`${URL_API}/lecons`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                coursId: coursActuelId,
                titre,
                contenu,
                type,
                urlFichier
            })
        });
        
        if (reponse.ok) {
            alert('Leçon créée avec succès');
            fermerModal('modalLecon');
            document.getElementById('formLecon').reset();
            voirCours(coursActuelId);
        } else {
            const erreur = await reponse.json();
            alert('Erreur: ' + erreur.erreur);
        }
    } catch (erreur) {
        console.error('Erreur création leçon:', erreur);
        alert('Erreur lors de la création de la leçon');
    }
}

// =====================================================
// GESTION DES RÉUNIONS
// =====================================================

/**
 * Ouvre le modal de création de réunion
 */
async function ouvrirModalReunion() {
    // Charger les cours pour le select
    try {
        const reponse = await fetch(`${URL_API}/cours`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (reponse.ok) {
            const cours = await reponse.json();
            const select = document.getElementById('coursReunion');
            select.innerHTML = '<option value="">Sélectionner un cours</option>' +
                cours.map(c => `<option value="${c.id}">${c.titre}</option>`).join('');
        }
    } catch (erreur) {
        console.error('Erreur chargement cours:', erreur);
    }
    
    const modal = document.getElementById('modalReunion');
    if (modal) modal.style.display = 'block';
}

/**
 * Crée une nouvelle réunion
 */
async function creerReunion() {
    const titre = document.getElementById('titreReunion').value;
    const description = document.getElementById('descriptionReunion').value;
    const coursId = document.getElementById('coursReunion').value;
    const heureProgrammee = document.getElementById('heureReunion').value;
    const duree = document.getElementById('dureeReunion').value;
    
    if (!titre || !coursId || !heureProgrammee) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
    }
    
    try {
        const reponse = await fetch(`${URL_API}/reunions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                titre,
                description,
                coursId,
                heureProgrammee,
                duree: duree || 60
            })
        });
        
        if (reponse.ok) {
            alert('Réunion créée avec succès');
            fermerModal('modalReunion');
            chargerReunions();
        } else {
            const erreur = await reponse.json();
            alert('Erreur: ' + erreur.erreur);
        }
    } catch (erreur) {
        console.error('Erreur création réunion:', erreur);
        alert('Erreur lors de la création de la réunion');
    }
}

/**
 * Démarre une réunion
 */
function demarrerReunion(reunionId) {
    window.location.href = `reunion.html?id=${reunionId}`;
}

/**
 * Rejoint une réunion en cours
 */
function rejoindreReunion(reunionId) {
    window.location.href = `reunion.html?id=${reunionId}`;
}

/**
 * Annule une réunion
 */
async function annulerReunion(reunionId) {
    if (!confirm('Voulez-vous vraiment annuler cette réunion ?')) return;
    
    try {
        const reponse = await fetch(`${URL_API}/reunions/${reunionId}/terminer`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (reponse.ok) {
            alert('Réunion annulée');
            chargerReunions();
        }
    } catch (erreur) {
        console.error('Erreur annulation:', erreur);
    }
}

// =====================================================
// GESTION DES ÉVALUATIONS
// =====================================================

let leconActuelleId = null;

/**
 * Ouvre le modal de création d'évaluation
 */
function ouvrirModalEvaluation(leconId) {
    leconActuelleId = leconId;
    const modal = document.getElementById('modalEvaluation');
    if (modal) modal.style.display = 'block';
    ajouterQuestion(); // Ajouter une première question par défaut
}

let questionsListe = [];

/**
 * Ajoute une question à l'évaluation
 */
function ajouterQuestion() {
    const conteneur = document.getElementById('questionsContainer');
    const index = questionsListe.length;
    
    const divQuestion = document.createElement('div');
    divQuestion.className = 'question-item';
    divQuestion.innerHTML = `
        <h4>Question ${index + 1}</h4>
        <input type="text" placeholder="Question" id="q_${index}_texte" class="mb-1">
        <select id="q_${index}_type" onchange="changerTypeQuestion(${index})">
            <option value="qcm">QCM</option>
            <option value="texte">Réponse texte</option>
        </select>
        <div id="q_${index}_options"></div>
        <input type="number" placeholder="Points" id="q_${index}_points" value="1" class="mt-1">
        <button class="btn btn-danger btn-petit" onclick="supprimerQuestion(${index})">Supprimer</button>
        <hr>
    `;
    conteneur.appendChild(divQuestion);
    
    questionsListe.push({});
    changerTypeQuestion(index);
}

/**
 * Change le type de question
 */
function changerTypeQuestion(index) {
    const type = document.getElementById(`q_${index}_type`).value;
    const container = document.getElementById(`q_${index}_options`);
    
    if (type === 'qcm') {
        container.innerHTML = `
            <label>Options (séparées par des virgules):</label>
            <input type="text" id="q_${index}_options_liste" placeholder="Option 1, Option 2, Option 3">
            <label>Réponse correcte (numéro):</label>
            <input type="number" id="q_${index}_reponse" placeholder="1">
        `;
    } else {
        container.innerHTML = `
            <label>Réponse correcte:</label>
            <input type="text" id="q_${index}_reponse" placeholder="Réponse attendue">
        `;
    }
}

/**
 * Supprime une question
 */
function supprimerQuestion(index) {
    questionsListe.splice(index, 1);
    rechargerQuestions();
}

/**
 * Recharge l'affichage des questions
 */
function rechargerQuestions() {
    const conteneur = document.getElementById('questionsContainer');
    conteneur.innerHTML = '';
    questionsListe.forEach((_, i) => {
        // Reconstruire chaque question
        const divQuestion = document.createElement('div');
        divQuestion.className = 'question-item';
        divQuestion.innerHTML = `
            <h4>Question ${i + 1}</h4>
            <input type="text" placeholder="Question" id="q_${i}_texte" class="mb-1">
            <select id="q_${i}_type" onchange="changerTypeQuestion(${i})">
                <option value="qcm">QCM</option>
                <option value="texte">Réponse texte</option>
            </select>
            <div id="q_${i}_options"></div>
            <input type="number" placeholder="Points" id="q_${i}_points" value="1" class="mt-1">
            <button class="btn btn-danger btn-petit" onclick="supprimerQuestion(${i})">Supprimer</button>
            <hr>
        `;
        conteneur.appendChild(divQuestion);
        changerTypeQuestion(i);
        
        // Restaurer les valeurs si elles existent
        if (questionsListe[i].texte) {
            document.getElementById(`q_${i}_texte`).value = questionsListe[i].texte;
        }
        if (questionsListe[i].type) {
            document.getElementById(`q_${i}_type`).value = questionsListe[i].type;
        }
    });
}

/**
 * Sauvegarde l'évaluation
 */
async function sauvegarderEvaluation() {
    const titre = document.getElementById('titreEvaluation').value;
    const scoreMinimum = document.getElementById('scoreMinimum').value;
    
    // Récupérer toutes les questions
    const questions = [];
    for (let i = 0; i < questionsListe.length; i++) {
        const texte = document.getElementById(`q_${i}_texte`).value;
        const type = document.getElementById(`q_${i}_type`).value;
        const points = parseInt(document.getElementById(`q_${i}_points`).value) || 1;
        
        let reponseCorrecte = null;
        let options = null;
        
        if (type === 'qcm') {
            const optionsTexte = document.getElementById(`q_${i}_options_liste`).value;
            options = optionsTexte.split(',').map(o => o.trim());
            reponseCorrecte = parseInt(document.getElementById(`q_${i}_reponse`).value) - 1;
        } else {
            reponseCorrecte = document.getElementById(`q_${i}_reponse`).value;
        }
        
        questions.push({
            texte,
            type,
            points,
            options,
            reponseCorrecte
        });
    }
    
    if (questions.length === 0) {
        alert('Ajoutez au moins une question');
        return;
    }
    
    try {
        const reponse = await fetch(`${URL_API}/evaluations`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                leconId: leconActuelleId,
                titre,
                questions,
                scoreMinimum: parseInt(scoreMinimum) || 60
            })
        });
        
        if (reponse.ok) {
            alert('Évaluation créée avec succès');
            fermerModal('modalEvaluation');
            questionsListe = [];
        } else {
            const erreur = await reponse.json();
            alert('Erreur: ' + erreur.erreur);
        }
    } catch (erreur) {
        console.error('Erreur création évaluation:', erreur);
        alert('Erreur lors de la création de l\'évaluation');
    }
}

// =====================================================
// FONCTIONS UTILITAIRES
// =====================================================

function fermerModal(idModal) {
    const modal = document.getElementById(idModal);
    if (modal) modal.style.display = 'none';
}

function voirCours(coursId) {
    // Navigation vers la page de détail du cours
    window.location.href = `cours.html?id=${coursId}`;
}

function voirEnregistrement(url) {
    if (url) {
        window.open(url, '_blank');
    } else {
        alert('Aucun enregistrement disponible');
    }
}

// Fermeture des modals au clic sur les boutons de fermeture
document.querySelectorAll('.fermer').forEach(btn => {
    btn.onclick = function() {
        this.closest('.modal').style.display = 'none';
    }
});

// Initialisation
chargerCours();
chargerReunions();
