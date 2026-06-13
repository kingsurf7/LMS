// =====================================================
// GESTION DE LA RÉUNION VISIOCONFÉRENCE
// WebRTC, Socket.io, Chat, Partage d'écran, Tableau blanc
// =====================================================

// =====================================================
// CONFIGURATION WebRTC
// =====================================================

// Serveurs STUN pour la connexion P2P (permet de contourner les NAT)
const configurationWebRTC = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Variables globales pour la gestion de la réunion
let fluxLocal;              // Flux vidéo/audio local
let connexionPeer;          // Connexion WebRTC
let idReunion;              // ID de la réunion en cours
let idUtilisateur;          // ID de l'utilisateur connecté
let nomUtilisateur;         // Nom de l'utilisateur
let roleUtilisateur;        // Rôle de l'utilisateur
let socket;                 // Connexion Socket.io
let partageEcranActif = false;      // Indique si l'écran est partagé
let enregistrementActif = false;    // Indique si l'enregistrement est actif
let enregistreurMedia;              // Enregistreur MediaRecorder
let extraitsEnregistres = [];        // Extraits vidéo enregistrés
let outilDessin = 'stylo';          // Outil pour le tableau blanc
let enCoursDessin = false;          // Indique si l'utilisateur est en train de dessiner
let dernierX = 0, dernierY = 0;     // Dernières coordonnées du dessin

// =====================================================
// INITIALISATION DE LA RÉUNION
// =====================================================

/**
 * Fonction principale d'initialisation
 * Récupère les paramètres, initialise WebRTC et Socket.io
 */
async function initialiserReunion() {
    // Récupération de l'utilisateur depuis le localStorage
    const utilisateur = JSON.parse(localStorage.getItem('utilisateur'));
    if (!utilisateur) {
        // Redirection vers la page de connexion si non connecté
        window.location.href = 'index.html';
        return;
    }
    
    // Initialisation des variables globales
    idUtilisateur = utilisateur.id;
    nomUtilisateur = utilisateur.nom;
    roleUtilisateur = utilisateur.role;
    
    // Récupération des paramètres depuis l'URL
    const parametresURL = new URLSearchParams(window.location.search);
    idReunion = parametresURL.get('id');
    
    // Étape 1: Enregistrer la participation dans la base de données
    await enregistrerParticipation();
    
    // Étape 2: Initialiser WebRTC (caméra + micro)
    await initialiserWebRTC();
    
    // Étape 3: Initialiser Socket.io pour les messages en temps réel
    initialiserSocket();
    
    // Étape 4: Charger les détails de la réunion
    await chargerDetailsReunion();
    
    // Étape 5: Charger l'historique du chat
    await chargerHistoriqueChat();
    
    // Étape 6: Démarrer le polling pour les mises à jour périodiques
    demarrerRafraichissement();
}

/**
 * Enregistre la participation de l'utilisateur dans la base
 */
async function enregistrerParticipation() {
    try {
        const reponse = await fetch(`/api/reunions/${idReunion}/rejoindre`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!reponse.ok) {
            throw new Error('Impossible de rejoindre la réunion');
        }
        
        console.log('✅ Participation enregistrée avec succès');
    } catch (erreur) {
        console.error('❌ Erreur participation:', erreur);
        alert('Erreur lors de la connexion à la réunion');
    }
}

// =====================================================
// INITIALISATION WebRTC (CAMÉRA + MICRO)
// =====================================================

/**
 * Initialise le flux vidéo/audio local et la connexion WebRTC
 */
async function initialiserWebRTC() {
    try {
        // Demande l'accès à la caméra et au micro
        fluxLocal = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
        });
        
        // Affiche le flux local dans la vidéo
        document.getElementById('lecteurVideoLocale').srcObject = fluxLocal;
        
        // Crée une nouvelle connexion Peer-to-Peer
        connexionPeer = new RTCPeerConnection(configurationWebRTC);
        
        // Ajoute toutes les pistes (audio/vidéo) à la connexion
        fluxLocal.getTracks().forEach(piste => {
            connexionPeer.addTrack(piste, fluxLocal);
        });
        
        // Gère les flux distants (vidéos des autres participants)
        connexionPeer.ontrack = (evenement) => {
            const videoDistante = document.createElement('video');
            videoDistante.autoplay = true;
            videoDistante.playsInline = true;
            videoDistante.id = `video-${evenement.streams[0].id}`;
            videoDistante.srcObject = evenement.streams[0];
            document.getElementById('videosDistantes').appendChild(videoDistante);
        };
        
        // Gère les candidats ICE (pour la connexion P2P)
        connexionPeer.onicecandidate = (evenement) => {
            if (evenement.candidate) {
                socket.emit('candidat-ice', {
                    reunionId: idReunion,
                    candidat: evenement.candidate
                });
            }
        };
        
        // Crée une offre de connexion
        const offre = await connexionPeer.createOffer();
        await connexionPeer.setLocalDescription(offre);
        
        // Envoie l'offre via Socket.io
        socket.emit('rejoindre-salle', {
            reunionId: idReunion,
            utilisateurId: idUtilisateur,
            nomUtilisateur: nomUtilisateur,
            offre: connexionPeer.localDescription
        });
        
        console.log('✅ WebRTC initialisé avec succès');
    } catch (erreur) {
        console.error('❌ Erreur WebRTC:', erreur);
        alert("Impossible d'accéder à la caméra/micro. Vérifiez vos permissions.");
    }
}

// =====================================================
// INITIALISATION SOCKET.IO (COMMUNICATION TEMPS RÉEL)
// =====================================================

/**
 * Initialise la connexion Socket.io pour les messages en temps réel
 */
function initialiserSocket() {
    // Connexion au serveur Socket.io
    socket = io('http://localhost:5000', {
        auth: {
            token: localStorage.getItem('token')
        }
    });
    
    // Événement: connexion réussie
    socket.on('connect', () => {
        console.log('✅ Socket.io connecté');
    });
    
    // Événement: un utilisateur a rejoint
    socket.on('utilisateur-rejoint', async (donnees) => {
        console.log(`👤 ${donnees.nomUtilisateur} a rejoint la réunion`);
        await ajouterFluxDistant(donnees.utilisateurId, donnees.offre);
        mettreAJourParticipants();
    });
    
    // Événement: un utilisateur a quitté
    socket.on('utilisateur-parti', (donnees) => {
        console.log(`👋 ${donnees.nomUtilisateur} a quitté la réunion`);
        supprimerFluxDistant(donnees.utilisateurId);
        mettreAJourParticipants();
    });
    
    // Événement: nouveau message dans le chat
    socket.on('message-chat', (donnees) => {
        afficherMessageChat(donnees);
    });
    
    // Événement: partage d'écran activé/désactivé
    socket.on('partage-ecran', (donnees) => {
        gererPartageEcran(donnees);
    });
    
    // Événement: mise à jour du tableau blanc
    socket.on('mise-jour-tableau', (donnees) => {
        dessinerSurTableau(donnees);
    });
    
    // Événement: effacement du tableau blanc
    socket.on('effacer-tableau', () => {
        effacerTableauComplet();
    });
    
    // Événement: nouveau candidat ICE
    socket.on('candidat-ice', async (donnees) => {
        try {
            await connexionPeer.addIceCandidate(new RTCIceCandidate(donnees.candidat));
        } catch (erreur) {
            console.error('❌ Erreur ICE:', erreur);
        }
    });
}

// =====================================================
// GESTION DU CHAT
// =====================================================

/**
 * Envoie un message dans le chat
 */
async function envoyerMessageChat() {
    const saisie = document.getElementById('saisieChat');
    const message = saisie.value.trim();
    
    if (message) {
        try {
            // Envoi via l'API REST
            const reponse = await fetch(`/api/reunions/${idReunion}/chat`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });
            
            if (reponse.ok) {
                saisie.value = '';
                
                // Diffusion via Socket.io pour les autres participants
                socket.emit('message-chat', {
                    reunionId: idReunion,
                    utilisateurId: idUtilisateur,
                    nomUtilisateur: nomUtilisateur,
                    message: message
                });
            }
        } catch (erreur) {
            console.error('❌ Erreur envoi message:', erreur);
        }
    }
}

/**
 * Affiche un message dans la zone de chat
 */
function afficherMessageChat(donnees) {
    const conteneurChat = document.getElementById('messagesChat');
    const divMessage = document.createElement('div');
    divMessage.className = 'message-chat';
    divMessage.innerHTML = `
        <strong>${donnees.nomUtilisateur}:</strong> ${donnees.message}
        <small>${new Date().toLocaleTimeString()}</small>
    `;
    conteneurChat.appendChild(divMessage);
    
    // Scroll automatique vers le bas
    conteneurChat.scrollTop = conteneurChat.scrollHeight;
}

/**
 * Charge l'historique des messages depuis la base
 */
async function chargerHistoriqueChat() {
    try {
        const reponse = await fetch(`/api/reunions/${idReunion}/chat`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (reponse.ok) {
            const messages = await reponse.json();
            const conteneurChat = document.getElementById('messagesChat');
            conteneurChat.innerHTML = messages.map(msg => `
                <div class="message-chat">
                    <strong>${msg.nom_utilisateur}:</strong> ${msg.message}
                    <small>${new Date(msg.date_envoi).toLocaleTimeString()}</small>
                </div>
            `).join('');
        }
    } catch (erreur) {
        console.error('❌ Erreur chargement historique:', erreur);
    }
}

// =====================================================
// PARTAGE D'ÉCRAN
// =====================================================

/**
 * Active ou désactive le partage d'écran
 */
async function basculerPartageEcran() {
    try {
        if (!partageEcranActif) {
            // Démarre le partage d'écran
            const fluxEcran = await navigator.mediaDevices.getDisplayMedia({ 
                video: true 
            });
            
            // Remplace la piste vidéo
            const pisteVideo = fluxEcran.getVideoTracks()[0];
            const envoyeur = connexionPeer.getSenders().find(s => s.track.kind === 'video');
            await envoyeur.replaceTrack(pisteVideo);
            
            // Gère l'arrêt du partage
            pisteVideo.onended = () => {
                arreterPartageEcran();
            };
            
            partageEcranActif = true;
            document.getElementById('boutonPartageEcran').classList.add('actif');
            
            // Notifie les autres participants
            socket.emit('partage-ecran', {
                reunionId: idReunion,
                utilisateurId: idUtilisateur,
                actif: true
            });
        } else {
            await arreterPartageEcran();
        }
    } catch (erreur) {
        console.error('❌ Erreur partage écran:', erreur);
    }
}

/**
 * Arrête le partage d'écran
 */
async function arreterPartageEcran() {
    // Restaure le flux vidéo original
    const fluxOriginal = await navigator.mediaDevices.getUserMedia({ video: true });
    const pisteVideo = fluxOriginal.getVideoTracks()[0];
    const envoyeur = connexionPeer.getSenders().find(s => s.track.kind === 'video');
    await envoyeur.replaceTrack(pisteVideo);
    
    partageEcranActif = false;
    document.getElementById('boutonPartageEcran').classList.remove('actif');
    
    // Notifie les autres participants
    socket.emit('partage-ecran', {
        reunionId: idReunion,
        utilisateurId: idUtilisateur,
        actif: false
    });
}

// =====================================================
// ENREGISTREMENT DE LA RÉUNION
// =====================================================

/**
 * Démarre ou arrête l'enregistrement de la réunion
 */
async function basculerEnregistrement() {
    if (!enregistrementActif) {
        // Prépare l'enregistrement
        extraitsEnregistres = [];
        const flux = new MediaStream();
        
        // Ajoute toutes les pistes audio/vidéo
        connexionPeer.getSenders().forEach(envoyeur => {
            if (envoyeur.track) {
                flux.addTrack(envoyeur.track);
            }
        });
        
        enregistreurMedia = new MediaRecorder(flux);
        
        // Collecte les données
        enregistreurMedia.ondataavailable = (evenement) => {
            if (evenement.data.size > 0) {
                extraitsEnregistres.push(evenement.data);
            }
        };
        
        // Sauvegarde à la fin
        enregistreurMedia.onstop = async () => {
            const blob = new Blob(extraitsEnregistres, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            
            // Sauvegarde sur le serveur
            const formData = new FormData();
            formData.append('enregistrement', blob, `reunion-${idReunion}-${Date.now()}.webm`);
            
            await fetch(`/api/reunions/${idReunion}/enregistrement`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
            
            alert('✅ Enregistrement sauvegardé avec succès');
        };
        
        enregistreurMedia.start(1000); // Enregistre par segments de 1 seconde
        enregistrementActif = true;
        document.getElementById('boutonEnregistrement').classList.add('enregistrement');
    } else {
        enregistreurMedia.stop();
        enregistrementActif = false;
        document.getElementById('boutonEnregistrement').classList.remove('enregistrement');
    }
}

// =====================================================
// TABLEAU BLANC COLLABORATIF
// =====================================================

let toileTableau;
let contexteTableau;

/**
 * Ouvre le modal du tableau blanc
 */
function ouvrirTableauBlanc() {
    const modal = document.getElementById('modalTableauBlanc');
    modal.style.display = 'block';
    initialiserTableauBlanc();
}

/**
 * Initialise le tableau blanc (canvas)
 */
function initialiserTableauBlanc() {
    toileTableau = document.getElementById('tableauBlanc');
    contexteTableau = toileTableau.getContext('2d');
    contexteTableau.strokeStyle = '#000';
    contexteTableau.lineWidth = 2;
    contexteTableau.lineCap = 'round';
    
    // Événements de dessin
    toileTableau.addEventListener('mousedown', commencerDessin);
    toileTableau.addEventListener('mousemove', dessiner);
    toileTableau.addEventListener('mouseup', arreterDessin);
    toileTableau.addEventListener('mouseleave', arreterDessin);
}

/**
 * Commence le dessin (souris enfoncée)
 */
function commencerDessin(evenement) {
    enCoursDessin = true;
    const rect = toileTableau.getBoundingClientRect();
    dernierX = evenement.clientX - rect.left;
    dernierY = evenement.clientY - rect.top;
    contexteTableau.beginPath();
    contexteTableau.moveTo(dernierX, dernierY);
}

/**
 * Dessine en continu (souris déplacée)
 */
function dessiner(evenement) {
    if (!enCoursDessin) return;
    
    const rect = toileTableau.getBoundingClientRect();
    const courantX = evenement.clientX - rect.left;
    const courantY = evenement.clientY - rect.top;
    
    // Configure le style selon l'outil
    if (outilDessin === 'stylo') {
        contexteTableau.strokeStyle = '#000';
        contexteTableau.lineWidth = 2;
    } else if (outilDessin === 'gomme') {
        contexteTableau.strokeStyle = '#fff';
        contexteTableau.lineWidth = 20;
    }
    
    contexteTableau.lineTo(courantX, courantY);
    contexteTableau.stroke();
    contexteTableau.beginPath();
    contexteTableau.moveTo(courantX, courantY);
    
    // Diffuse le dessin aux autres participants
    socket.emit('dessin-tableau', {
        reunionId: idReunion,
        utilisateurId: idUtilisateur,
        x: courantX,
        y: courantY,
        dernierX: dernierX,
        dernierY: dernierY,
        outil: outilDessin
    });
    
    dernierX = courantX;
    dernierY = courantY;
}

/**
 * Arrête le dessin (souris relâchée)
 */
function arreterDessin() {
    enCoursDessin = false;
    contexteTableau.beginPath();
}

/**
 * Efface complètement le tableau blanc
 */
function effacerTableauComplet() {
    contexteTableau.clearRect(0, 0, toileTableau.width, toileTableau.height);
}

/**
 * Efface le tableau et notifie les autres
 */
function effacerTableau() {
    effacerTableauComplet();
    socket.emit('effacer-tableau', {
        reunionId: idReunion,
        utilisateurId: idUtilisateur
    });
}

/**
 * Sauvegarde le tableau blanc localement
 */
function sauvegarderTableau() {
    const dataURL = toileTableau.toDataURL();
    localStorage.setItem(`tableau-${idReunion}`, dataURL);
    alert('💾 Tableau blanc sauvegardé');
}

/**
 * Définit l'outil de dessin (stylo ou gomme)
 */
function definirOutil(outil) {
    outilDessin = outil;
}

// =====================================================
// GESTION DU MICRO ET DE LA CAMÉRA
// =====================================================

/**
 * Active/désactive le micro
 */
function basculerMicro() {
    const pisteAudio = fluxLocal.getAudioTracks()[0];
    pisteAudio.enabled = !pisteAudio.enabled;
    document.getElementById('boutonMicro').classList.toggle('muet');
}

/**
 * Active/désactive la caméra
 */
function basculerVideo() {
    const pisteVideo = fluxLocal.getVideoTracks()[0];
    pisteVideo.enabled = !pisteVideo.enabled;
    document.getElementById('boutonVideo').classList.toggle('video-off');
}

// =====================================================
// FONCTIONS UTILITAIRES
// =====================================================

/**
 * Copie le lien de la réunion dans le presse-papier
 */
function copierLienReunion() {
    const champLien = document.getElementById('lienReunion');
    champLien.select();
    document.execCommand('copy');
    alert('🔗 Lien copié dans le presse-papier');
}

/**
 * Charge les détails de la réunion (titre, etc.)
 */
async function chargerDetailsReunion() {
    try {
        const reponse = await fetch(`/api/reunions/${idReunion}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (reponse.ok) {
            const reunion = await reponse.json();
            document.getElementById('titreReunion').innerText = reunion.titre;
            document.getElementById('lienReunion').value = 
                `${window.location.origin}/reunion.html?id=${idReunion}&lien=${reunion.lien_reunion}`;
        }
    } catch (erreur) {
        console.error('❌ Erreur chargement détails:', erreur);
    }
}

/**
 * Quitte la réunion et nettoie les ressources
 */
async function quitterReunion() {
    if (confirm('Voulez-vous vraiment quitter la réunion ?')) {
        try {
            // Enregistre le départ
            await fetch(`/api/reunions/${idReunion}/quitter`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            // Notifie les autres participants
            socket.emit('quitter-salle', { 
                reunionId: idReunion, 
                utilisateurId: idUtilisateur 
            });
            
            // Arrête les flux vidéo
            if (fluxLocal) {
                fluxLocal.getTracks().forEach(piste => piste.stop());
            }
            
            // Ferme la connexion WebRTC
            if (connexionPeer) {
                connexionPeer.close();
            }
            
            // Redirection selon le rôle
            window.location.href = roleUtilisateur === 'enseignant' ? 'enseignant.html' : 'etudiant.html';
        } catch (erreur) {
            console.error('❌ Erreur départ:', erreur);
        }
    }
}

/**
 * Rafraîchit périodiquement les informations
 */
function demarrerRafraichissement() {
    setInterval(async () => {
        await mettreAJourParticipants();
        await chargerHistoriqueChat();
    }, 5000);
}

/**
 * Met à jour la liste des participants
 */
async function mettreAJourParticipants() {
    try {
        const reponse = await fetch(`/api/reunions/${idReunion}/participants`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (reponse.ok) {
            const participants = await reponse.json();
            document.getElementById('compteurParticipants').innerText = participants.length;
            // Ici on pourrait mettre à jour la liste détaillée
        }
    } catch (erreur) {
        console.error('❌ Erreur mise à jour participants:', erreur);
    }
}

/**
 * Crée un sondage rapide
 */
function creerSondage() {
    const question = prompt('📊 Question du sondage:');
    if (question) {
        const options = [];
        for (let i = 1; i <= 4; i++) {
            const option = prompt(`Option ${i}:`);
            if (option) options.push(option);
            else break;
        }
        
        if (options.length >= 2) {
            socket.emit('creer-sondage', {
                reunionId: idReunion,
                utilisateurId: idUtilisateur,
                question: question,
                options: options
            });
            alert('✅ Sondage créé et partagé avec les participants');
        }
    }
}

/**
 * Partage un document (simulation)
 */
function partagerDocument() {
    const fichier = prompt('📄 Entrez le nom du document à partager:');
    if (fichier) {
        socket.emit('partager-document', {
            reunionId: idReunion,
            utilisateurId: idUtilisateur,
            document: fichier
        });
        alert(`📄 Document "${fichier}" partagé avec les participants`);
    }
}

// =====================================================
// ASSOCIATION DES ÉVÉNEMENTS AU CHARGEMENT DE LA PAGE
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialisation
    initialiserReunion();
    
    // Association des boutons
    document.getElementById('boutonMicro')?.addEventListener('click', basculerMicro);
    document.getElementById('boutonVideo')?.addEventListener('click', basculerVideo);
    document.getElementById('boutonPartageEcran')?.addEventListener('click', basculerPartageEcran);
    document.getElementById('boutonEnregistrement')?.addEventListener('click', basculerEnregistrement);
    document.getElementById('boutonQuitter')?.addEventListener('click', quitterReunion);
    document.getElementById('boutonEnvoyerChat')?.addEventListener('click', envoyerMessageChat);
    document.getElementById('boutonCopierLien')?.addEventListener('click', copierLienReunion);
    
    // Envoi du message avec la touche Entrée
    document.getElementById('saisieChat')?.addEventListener('keypress', (evenement) => {
        if (evenement.key === 'Enter') envoyerMessageChat();
    });
});
