// =====================================================
// GESTION DE LA RÉUNION VISIOCONFÉRENCE
// WebRTC, Socket.io, Chat, Partage d'écran, Tableau blanc
// =====================================================

// Configuration WebRTC
const configurationWebRTC = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Variables globales
let fluxLocal;
let connexionPeer;
let idReunion;
let idUtilisateur;
let nomUtilisateur;
let roleUtilisateur;
let socket;
let partageEcranActif = false;
let enregistrementActif = false;
let enregistreurMedia;
let extraitsEnregistres = [];
let outilDessin = 'stylo';
let enCoursDessin = false;
let dernierX = 0, dernierY = 0;
let toileTableau;
let contexteTableau;

// =====================================================
// INITIALISATION DE LA RÉUNION
// =====================================================

async function initialiserReunion() {
    const utilisateur = getUtilisateur();
    if (!utilisateur) {
        window.location.href = 'index.html';
        return;
    }
    
    idUtilisateur = utilisateur.id;
    nomUtilisateur = utilisateur.nom;
    roleUtilisateur = utilisateur.role;
    
    const parametresURL = new URLSearchParams(window.location.search);
    idReunion = parametresURL.get('id');
    
    await enregistrerParticipation();
    await initialiserWebRTC();
    initialiserSocket();
    await chargerDetailsReunion();
    await chargerHistoriqueChat();
    demarrerRafraichissement();
}

async function enregistrerParticipation() {
    try {
        const reponse = await fetch(`${URL_API}/reunions/${idReunion}/rejoindre`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!reponse.ok) {
            throw new Error('Impossible de rejoindre la réunion');
        }
        
        console.log('✅ Participation enregistrée');
    } catch (erreur) {
        console.error('❌ Erreur:', erreur);
        alert('Erreur lors de la connexion à la réunion');
    }
}

// =====================================================
// INITIALISATION WebRTC
// =====================================================

async function initialiserWebRTC() {
    try {
        fluxLocal = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
        });
        
        document.getElementById('lecteurVideoLocale').srcObject = fluxLocal;
        
        connexionPeer = new RTCPeerConnection(configurationWebRTC);
        
        fluxLocal.getTracks().forEach(piste => {
            connexionPeer.addTrack(piste, fluxLocal);
        });
        
        connexionPeer.ontrack = (evenement) => {
            const videoDistante = document.createElement('video');
            videoDistante.autoplay = true;
            videoDistante.playsInline = true;
            videoDistante.id = `video-${evenement.streams[0].id}`;
            videoDistante.srcObject = evenement.streams[0];
            document.getElementById('videosDistantes').appendChild(videoDistante);
        };
        
        connexionPeer.onicecandidate = (evenement) => {
            if (evenement.candidate) {
                socket.emit('candidat-ice', {
                    reunionId: idReunion,
                    candidat: evenement.candidate
                });
            }
        };
        
        const offre = await connexionPeer.createOffer();
        await connexionPeer.setLocalDescription(offre);
        
        socket.emit('rejoindre-salle', {
            reunionId: idReunion,
            utilisateurId: idUtilisateur,
            nomUtilisateur: nomUtilisateur,
            offre: connexionPeer.localDescription
        });
        
        console.log('✅ WebRTC initialisé');
    } catch (erreur) {
        console.error('❌ Erreur WebRTC:', erreur);
        alert("Impossible d'accéder à la caméra/micro");
    }
}

// =====================================================
// INITIALISATION SOCKET.IO
// =====================================================

function initialiserSocket() {
    socket = io('http://localhost:5000', {
        auth: { token: getToken() }
    });
    
    socket.on('connect', () => {
        console.log('✅ Socket.io connecté');
    });
    
    socket.on('utilisateur-rejoint', async (donnees) => {
        console.log(`👤 ${donnees.nomUtilisateur} a rejoint`);
        await ajouterFluxDistant(donnees.utilisateurId, donnees.offre);
        mettreAJourParticipants();
    });
    
    socket.on('utilisateur-parti', (donnees) => {
        console.log(`👋 Utilisateur parti`);
        supprimerFluxDistant(donnees.utilisateurId);
        mettreAJourParticipants();
    });
    
    socket.on('message-chat', (donnees) => {
        afficherMessageChat(donnees);
    });
    
    socket.on('partage-ecran', (donnees) => {
        gererPartageEcran(donnees);
    });
    
    socket.on('mise-jour-tableau', (donnees) => {
        dessinerSurTableau(donnees);
    });
    
    socket.on('effacer-tableau', () => {
        effacerTableauComplet();
    });
    
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

async function envoyerMessageChat() {
    const saisie = document.getElementById('saisieChat');
    const message = saisie.value.trim();
    
    if (message) {
        try {
            const reponse = await fetch(`${URL_API}/reunions/${idReunion}/chat`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });
            
            if (reponse.ok) {
                saisie.value = '';
                socket.emit('message-chat', {
                    reunionId: idReunion,
                    utilisateurId: idUtilisateur,
                    nomUtilisateur: nomUtilisateur,
                    message: message
                });
            }
        } catch (erreur) {
            console.error('❌ Erreur:', erreur);
        }
    }
}

function afficherMessageChat(donnees) {
    const conteneurChat = document.getElementById('messagesChat');
    const divMessage = document.createElement('div');
    divMessage.className = 'message-chat';
    divMessage.innerHTML = `
        <strong>${donnees.nomUtilisateur}:</strong> ${donnees.message}
        <small>${new Date().toLocaleTimeString()}</small>
    `;
    conteneurChat.appendChild(divMessage);
    conteneurChat.scrollTop = conteneurChat.scrollHeight;
}

async function chargerHistoriqueChat() {
    try {
        const reponse = await fetch(`${URL_API}/reunions/${idReunion}/chat`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
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
        console.error('❌ Erreur:', erreur);
    }
}

// =====================================================
// PARTAGE D'ÉCRAN
// =====================================================

async function basculerPartageEcran() {
    try {
        if (!partageEcranActif) {
            const fluxEcran = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const pisteVideo = fluxEcran.getVideoTracks()[0];
            const envoyeur = connexionPeer.getSenders().find(s => s.track.kind === 'video');
            await envoyeur.replaceTrack(pisteVideo);
            
            pisteVideo.onended = () => arreterPartageEcran();
            
            partageEcranActif = true;
            document.getElementById('boutonPartageEcran').classList.add('actif');
            
            socket.emit('partage-ecran', {
                reunionId: idReunion,
                utilisateurId: idUtilisateur,
                actif: true
            });
        } else {
            await arreterPartageEcran();
        }
    } catch (erreur) {
        console.error('❌ Erreur:', erreur);
    }
}

async function arreterPartageEcran() {
    const fluxOriginal = await navigator.mediaDevices.getUserMedia({ video: true });
    const pisteVideo = fluxOriginal.getVideoTracks()[0];
    const envoyeur = connexionPeer.getSenders().find(s => s.track.kind === 'video');
    await envoyeur.replaceTrack(pisteVideo);
    
    partageEcranActif = false;
    document.getElementById('boutonPartageEcran').classList.remove('actif');
    
    socket.emit('partage-ecran', {
        reunionId: idReunion,
        utilisateurId: idUtilisateur,
        actif: false
    });
}

// =====================================================
// ENREGISTREMENT
// =====================================================

async function basculerEnregistrement() {
    if (!enregistrementActif) {
        extraitsEnregistres = [];
        const flux = new MediaStream();
        
        connexionPeer.getSenders().forEach(envoyeur => {
            if (envoyeur.track) {
                flux.addTrack(envoyeur.track);
            }
        });
        
        enregistreurMedia = new MediaRecorder(flux);
        
        enregistreurMedia.ondataavailable = (evenement) => {
            if (evenement.data.size > 0) {
                extraitsEnregistres.push(evenement.data);
            }
        };
        
        enregistreurMedia.onstop = async () => {
            const blob = new Blob(extraitsEnregistres, { type: 'video/webm' });
            const formData = new FormData();
            formData.append('enregistrement', blob, `reunion-${idReunion}-${Date.now()}.webm`);
            
            // Dans une vraie implémentation, uploader le fichier
            alert('Enregistrement terminé');
        };
        
        enregistreurMedia.start(1000);
        enregistrementActif = true;
        document.getElementById('boutonEnregistrement').classList.add('enregistrement');
    } else {
        enregistreurMedia.stop();
        enregistrementActif = false;
        document.getElementById('boutonEnregistrement').classList.remove('enregistrement');
    }
}

// =====================================================
// TABLEAU BLANC
// =====================================================

function ouvrirTableauBlanc() {
    const modal = document.getElementById('modalTableauBlanc');
    modal.style.display = 'block';
    initialiserTableauBlanc();
}

function initialiserTableauBlanc() {
    toileTableau = document.getElementById('tableauBlanc');
    contexteTableau = toileTableau.getContext('2d');
    contexteTableau.strokeStyle = '#000';
    contexteTableau.lineWidth = 2;
    contexteTableau.lineCap = 'round';
    
    toileTableau.addEventListener('mousedown', commencerDessin);
    toileTableau.addEventListener('mousemove', dessiner);
    toileTableau.addEventListener('mouseup', arreterDessin);
    toileTableau.addEventListener('mouseleave', arreterDessin);
}

function commencerDessin(evenement) {
    enCoursDessin = true;
    const rect = toileTableau.getBoundingClientRect();
    dernierX = evenement.clientX - rect.left;
    dernierY = evenement.clientY - rect.top;
    contexteTableau.beginPath();
    contexteTableau.moveTo(dernierX, dernierY);
}

function dessiner(evenement) {
    if (!enCoursDessin) return;
    
    const rect = toileTableau.getBoundingClientRect();
    const courantX = evenement.clientX - rect.left;
    const courantY = evenement.clientY - rect.top;
    
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

function arreterDessin() {
    enCoursDessin = false;
    contexteTableau.beginPath();
}

function dessinerSurTableau(donnees) {
    contexteTableau.beginPath();
    contexteTableau.moveTo(donnees.dernierX, donnees.dernierY);
    
    if (donnees.outil === 'stylo') {
        contexteTableau.strokeStyle = '#000';
        contexteTableau.lineWidth = 2;
    } else {
        contexteTableau.strokeStyle = '#fff';
        contexteTableau.lineWidth = 20;
    }
    
    contexteTableau.lineTo(donnees.x, donnees.y);
    contexteTableau.stroke();
}

function effacerTableauComplet() {
    contexteTableau.clearRect(0, 0, toileTableau.width, toileTableau.height);
}

function effacerTableau() {
    effacerTableauComplet();
    socket.emit('effacer-tableau', {
        reunionId: idReunion,
        utilisateurId: idUtilisateur
    });
}

function sauvegarderTableau() {
    const dataURL = toileTableau.toDataURL();
    localStorage.setItem(`tableau-${idReunion}`, dataURL);
    alert('💾 Tableau blanc sauvegardé');
}

function definirOutil(outil) {
    outilDessin = outil;
}

// =====================================================
// FONCTIONS UTILITAIRES
// =====================================================

function basculerMicro() {
    const pisteAudio = fluxLocal.getAudioTracks()[0];
    pisteAudio.enabled = !pisteAudio.enabled;
    document.getElementById('boutonMicro').classList.toggle('muet');
}

function basculerVideo() {
    const pisteVideo = fluxLocal.getVideoTracks()[0];
    pisteVideo.enabled = !pisteVideo.enabled;
    document.getElementById('boutonVideo').classList.toggle('video-off');
}

function copierLienReunion() {
    const champLien = document.getElementById('lienReunion');
    champLien.select();
    document.execCommand('copy');
    alert('🔗 Lien copié');
}

async function chargerDetailsReunion() {
    try {
        const reponse = await fetch(`${URL_API}/reunions/${idReunion}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (reponse.ok) {
            const reunion = await reponse.json();
            document.getElementById('titreReunion').innerText = reunion.titre;
            document.getElementById('lienReunion').value = 
                `${window.location.origin}/reunion.html?id=${idReunion}`;
        }
    } catch (erreur) {
        console.error('❌ Erreur:', erreur);
    }
}

async function quitterReunion() {
    if (confirm('Voulez-vous vraiment quitter la réunion ?')) {
        try {
            await fetch(`${URL_API}/reunions/${idReunion}/quitter`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            
            socket.emit('quitter-salle', { 
                reunionId: idReunion, 
                utilisateurId: idUtilisateur 
            });
            
            if (fluxLocal) {
                fluxLocal.getTracks().forEach(piste => piste.stop());
            }
            if (connexionPeer) {
                connexionPeer.close();
            }
            
            window.location.href = roleUtilisateur === 'enseignant' ? 'enseignant.html' : 'etudiant.html';
        } catch (erreur) {
            console.error('❌ Erreur:', erreur);
        }
    }
}

function demarrerRafraichissement() {
    setInterval(async () => {
        await mettreAJourParticipants();
    }, 5000);
}

async function mettreAJourParticipants() {
    try {
        const reponse = await fetch(`${URL_API}/reunions/${idReunion}/participants`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (reponse.ok) {
            const participants = await reponse.json();
            document.getElementById('compteurParticipants').innerText = participants.length;
        }
    } catch (erreur) {
        console.error('❌ Erreur:', erreur);
    }
}

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
            alert('✅ Sondage créé');
        }
    }
}

function partagerDocument() {
    const fichier = prompt('📄 Nom du document à partager:');
    if (fichier) {
        socket.emit('partager-document', {
            reunionId: idReunion,
            utilisateurId: idUtilisateur,
            document: fichier
        });
        alert(`📄 Document "${fichier}" partagé`);
    }
}

// Fonctions placeholder pour les fonctionnalités non implémentées
async function ajouterFluxDistant(utilisateurId, offre) {}
function supprimerFluxDistant(utilisateurId) {}
function gererPartageEcran(donnees) {}

// =====================================================
// ÉVÉNEMENTS
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    initialiserReunion();
    
    document.getElementById('boutonMicro')?.addEventListener('click', basculerMicro);
    document.getElementById('boutonVideo')?.addEventListener('click', basculerVideo);
    document.getElementById('boutonPartageEcran')?.addEventListener('click', basculerPartageEcran);
    document.getElementById('boutonEnregistrement')?.addEventListener('click', basculerEnregistrement);
    document.getElementById('boutonQuitter')?.addEventListener('click', quitterReunion);
    document.getElementById('boutonEnvoyerChat')?.addEventListener('click', envoyerMessageChat);
    document.getElementById('boutonCopierLien')?.addEventListener('click', copierLienReunion);
    
    document.getElementById('saisieChat')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') envoyerMessageChat();
    });
});
