// =====================================================
// TABLEAU DE BORD ÉTUDIANT
// =====================================================

const URL_API = 'http://localhost:5000/api';

// Vérification de l'authentification
const utilisateur = getUtilisateur();
if (!utilisateur || utilisateur.role !== 'etudiant') {
    window.location.href = 'index.html';
}

// Affichage du nom de l'utilisateur
document.getElementById('nomEtudiant').innerText = utilisateur.nom;

// Variables globales
let leconActuelle = null;
let evaluationActuelle = null;
let reponsesEtudiant = [];

// =====================================================
// CHARGEMENT DES DONNÉES
// =====================================================

/**
 * Charge les cours de l'étudiant
 */
async function chargerMesCours() {
    try {
        const reponse = await fetch(`${URL_API}/cours/etudiant/mes-cours`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (reponse.ok) {
            const cours = await reponse.json();
            afficherCours(cours);
            calculerProgressionGlobale(cours);
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
        conteneur.innerHTML = '<p class="texte-centre">Vous n\'êtes inscrit à aucun cours pour le moment.</p>';
        return;
    }
    
    conteneur.innerHTML = cours.map(c => {
        const progression = c.lecons_completees && c.total_lecons ? 
            Math.round((c.lecons_completees / c.total_lecons) * 100) : 0;
        
        return `
            <div class="element-cours">
                <div class="info-cours">
                    <h4>${c.titre}</h4>
                    <p>${c.description || 'Aucune description'}</p>
                    <small>📚 Progression: ${progression}%</small>
                    <div class="barre-progression">
                        <div class="remplissage-progression" style="width: ${progression}%"></div>
                    </div>
                </div>
                <div class="actions-cours">
                    <button class="btn btn-principal btn-petit" onclick="voirCours(${c.id})">Accéder au cours</button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Calcule la progression globale sur tous les cours
 */
function calculerProgressionGlobale(cours) {
    let totalLecons = 0;
    let totalCompletees = 0;
    
    cours.forEach(c => {
        totalLecons += c.total_lecons || 0;
        totalCompletees += c.lecons_completees || 0;
    });
    
    const progressionGlobale = totalLecons > 0 ? Math.round((totalCompletees / totalLecons) * 100) : 0;
    
    const barreProgression = document.getElementById('progressionGlobale');
    const texteProgression = document.getElementById('texteProgression');
    
    if (barreProgression) {
        const remplissage = barreProgression.querySelector('.remplissage-progression');
        if (remplissage) remplissage.style.width = `${progressionGlobale}%`;
    }
    if (texteProgression) {
        texteProgression.innerText = `${progressionGlobale}% complété`;
    }
}

/**
 * Voir le détail d'un cours
 */
async function voirCours(coursId) {
    try {
        const reponse = await fetch(`${URL_API}/cours/${coursId}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (reponse.ok) {
            const cours = await reponse.json();
            afficherModalCours(cours);
        }
    } catch (erreur) {
        console.error('Erreur chargement cours:', erreur);
    }
}

/**
 * Affiche le modal du cours avec ses leçons
 */
function afficherModalCours(cours) {
    const modal = document.getElementById('modalCoursDetail');
    const titre = document.getElementById('coursDetailTitre');
    const description = document.getElementById('coursDetailDescription');
    const conteneurLecons = document.getElementById('coursDetailLecons');
    
    if (titre) titre.innerText = cours.titre;
    if (description) description.innerText = cours.description || '';
    
    if (conteneurLecons) {
        conteneurLecons.innerHTML = `
            <h3>Leçons du cours</h3>
            <div class="liste-lecons">
                ${cours.lecons.map(lecon => `
                    <div class="element-lecon">
                        <div class="info-lecon">
                            <h4>${lecon.titre}</h4>
                            <p>${lecon.contenu || ''}</p>
                            <small>Type: ${lecon.type === 'video' ? '🎥 Vidéo' : '📄 PDF'}</small>
                        </div>
                        <div class="actions-lecon">
                            <button class="btn btn-principal btn-petit" onclick="voirLecon(${lecon.id})">
                                ${lecon.evaluation_id ? 'Voir la leçon' : 'Voir la leçon'}
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    if (modal) modal.style.display = 'block';
}

/**
 * Voir une leçon
 */
async function voirLecon(leconId) {
    try {
        const reponse = await fetch(`${URL_API}/lecons/${leconId}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (reponse.ok) {
            leconActuelle = await reponse.json();
            afficherModalLecon(leconActuelle);
        }
    } catch (erreur) {
        console.error('Erreur chargement leçon:', erreur);
    }
}

/**
 * Affiche le modal de la leçon
 */
function afficherModalLecon(lecon) {
    const modal = document.getElementById('modalLecon');
    const titre = document.getElementById('leconTitre');
    const contenu = document.getElementById('leconContenu');
    const evaluationDiv = document.getElementById('leconEvaluation');
    
    if (titre) titre.innerText = lecon.titre;
    
    if (contenu) {
        if (lecon.type === 'video') {
            contenu.innerHTML = `
                <video controls style="width: 100%; max-height: 400px;">
                    <source src="${URL_API}${lecon.url_fichier}" type="video/mp4">
                    Votre navigateur ne supporte pas la vidéo.
                </video>
                <p class="mt-2">${lecon.contenu || ''}</p>
            `;
        } else {
            contenu.innerHTML = `
                <iframe src="${URL_API}${lecon.url_fichier}" style="width: 100%; height: 500px;" frameborder="0"></iframe>
                <p class="mt-2">${lecon.contenu || ''}</p>
            `;
        }
    }
    
    // Vérifier s'il y a une évaluation
    if (evaluationDiv) {
        chargerEvaluation(lecon.id);
    }
    
    if (modal) modal.style.display = 'block';
}

/**
 * Charge l'évaluation d'une leçon
 */
async function chargerEvaluation(leconId) {
    try {
        const reponse = await fetch(`${URL_API}/evaluations/lecon/${leconId}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (reponse.ok) {
            const evaluation = await reponse.json();
            evaluationActuelle = evaluation;
            afficherBoutonEvaluation();
        }
    } catch (erreur) {
        console.log('Aucune évaluation pour cette leçon');
    }
}

/**
 * Affiche le bouton pour l'évaluation
 */
function afficherBoutonEvaluation() {
    const evaluationDiv = document.getElementById('leconEvaluation');
    if (evaluationDiv && evaluationActuelle) {
        evaluationDiv.innerHTML = `
            <div class="carte mt-2">
                <h4>📝 Évaluation: ${evaluationActuelle.titre}</h4>
                <button class="btn btn-principal" onclick="ouvrirEvaluation()">Commencer l'évaluation</button>
            </div>
        `;
    }
}

/**
 * Ouvre l'évaluation
 */
function ouvrirEvaluation() {
    if (!evaluationActuelle) return;
    
    const modal = document.getElementById('modalEvaluation');
    const titre = document.getElementById('evaluationTitre');
    const conteneurQuestions = document.getElementById('questionsEvaluation');
    
    if (titre) titre.innerText = evaluationActuelle.titre;
    
    if (conteneurQuestions && evaluationActuelle.questions) {
        reponsesEtudiant = [];
        conteneurQuestions.innerHTML = evaluationActuelle.questions.map((q, index) => `
            <div class="question-card">
                <p><strong>Question ${index + 1}:</strong> ${q.texte}</p>
                <p><small>Points: ${q.points || 1}</small></p>
                ${q.type === 'qcm' ? `
                    <div class="options-qcm">
                        ${q.options.map((opt, optIndex) => `
                            <label>
                                <input type="radio" name="q_${index}" value="${optIndex}" onchange="repondreQuestion(${index}, ${optIndex})">
                                ${opt}
                            </label>
                        `).join('')}
                    </div>
                ` : `
                    <input type="text" placeholder="Votre réponse" onchange="repondreQuestion(${index}, this.value)">
                `}
            </div>
        `).join('');
    }
    
    if (modal) modal.style.display = 'block';
}

/**
 * Enregistre une réponse à une question
 */
function repondreQuestion(index, reponse) {
    reponsesEtudiant[index] = reponse;
}

/**
 * Soumet l'évaluation
 */
async function soumettreEvaluation() {
    if (!evaluationActuelle) return;
    
    // Vérifier que toutes les questions ont été répondues
    if (reponsesEtudiant.length !== evaluationActuelle.questions.length) {
        alert('Veuillez répondre à toutes les questions');
        return;
    }
    
    try {
        const reponse = await fetch(`${URL_API}/evaluations/${evaluationActuelle.id}/soumettre`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reponses: reponsesEtudiant })
        });
        
        const resultat = await reponse.json();
        
        if (reponse.ok) {
            alert(`Score: ${resultat.score}%\n${resultat.message}`);
            fermerModal('modalEvaluation');
            fermerModal('modalLecon');
            chargerMesCours(); // Recharger la progression
        } else {
            alert('Erreur: ' + resultat.erreur);
        }
    } catch (erreur) {
        console.error('Erreur soumission:', erreur);
        alert('Erreur lors de la soumission');
    }
}

// =====================================================
// GESTION DES RÉUNIONS
// =====================================================

/**
 * Charge les réunions de l'étudiant
 */
async function chargerMesReunions() {
    try {
        const reponse = await fetch(`${URL_API}/reunions/etudiant`, {
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
                <small>👨‍🏫 Enseignant: ${r.nom_enseignant}</small>
                <small>📅 ${new Date(r.heure_programmee).toLocaleString()}</small>
            </div>
            <div class="actions-reunion">
                ${new Date(r.heure_programmee) <= new Date() ? 
                    `<button class="btn btn-principal btn-petit" onclick="rejoindreReunion(${r.id})">Rejoindre</button>` :
                    `<button class="btn btn-secondaire btn-petit" disabled>À venir</button>`
                }
            </div>
        </div>
    `).join('');
}

/**
 * Rejoint une réunion
 */
function rejoindreReunion(reunionId) {
    window.location.href = `reunion.html?id=${reunionId}`;
}

// =====================================================
// GESTION DES CERTIFICATS
// =====================================================

/**
 * Charge les certificats de l'étudiant
 */
async function chargerMesCertificats() {
    try {
        const reponse = await fetch(`${URL_API}/certificats/etudiant`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (reponse.ok) {
            const certificats = await reponse.json();
            afficherCertificats(certificats);
        }
    } catch (erreur) {
        console.error('Erreur chargement certificats:', erreur);
    }
}

/**
 * Affiche les certificats
 */
function afficherCertificats(certificats) {
    const conteneur = document.getElementById('listeCertificats');
    if (!conteneur) return;
    
    if (certificats.length === 0) {
        conteneur.innerHTML = '<p class="texte-centre">Aucun certificat pour le moment</p>';
        return;
    }
    
    conteneur.innerHTML = certificats.map(c => `
        <div class="element-certificat">
            <div class="info-certificat">
                <h4>🎓 ${c.titre_cours}</h4>
                <p>${c.description_cours || ''}</p>
                <small>📅 Délivré le: ${new Date(c.date_emission).toLocaleDateString()}</small>
                <small>🔑 Code: ${c.code_certificat}</small>
            </div>
            <div class="actions-certificat">
                <button class="btn btn-principal btn-petit" onclick="telechargerCertificat('${c.code_certificat}')">Télécharger</button>
                <button class="btn btn-secondaire btn-petit" onclick="verifierCertificat('${c.code_certificat}')">Vérifier</button>
            </div>
        </div>
    `).join('');
}

/**
 * Télécharge le certificat (simulation)
 */
function telechargerCertificat(code) {
    alert(`Fonctionnalité: Téléchargement du certificat ${code}`);
    // Dans une vraie implémentation, générer un PDF
}

/**
 * Vérifie un certificat
 */
async function verifierCertificat(code) {
    try {
        const reponse = await fetch(`${URL_API}/certificats/verifier/${code}`);
        const resultat = await reponse.json();
        
        if (resultat.valide) {
            alert(`✅ Certificat valide!\nÉtudiant: ${resultat.certificat.nom_etudiant}\nCours: ${resultat.certificat.titre_cours}`);
        } else {
            alert('❌ Certificat invalide');
        }
    } catch (erreur) {
        console.error('Erreur vérification:', erreur);
        alert('Erreur lors de la vérification');
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
chargerMesCours();
chargerMesReunions();
