// =====================================================
// SERVEUR SOCKET.IO POUR LES COMMUNICATIONS TEMPS RÉEL
// =====================================================

const jwt = require('jsonwebtoken');
const { verifierToken } = require('./middlewares/authentification');

let io;
const CLE_SECRETE = process.env.JWT_SECRET || 'votre-cle-secrete-changez-moi';

/**
 * Initialise le serveur Socket.io
 * @param {Object} server - Serveur HTTP
 */
function initSocket(server) {
    io = require('socket.io')(server, {
        cors: {
            origin: "*",  // En production, restreindre aux domaines autorisés
            methods: ["GET", "POST"]
        }
    });
    
    // Middleware d'authentification Socket.io
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentification requise'));
        }
        
        try {
            const decoded = jwt.verify(token, CLE_SECRETE);
            socket.utilisateurId = decoded.id;
            socket.role = decoded.role;
            next();
        } catch (err) {
            next(new Error('Token invalide'));
        }
    });
    
    // Gestion des connexions
    io.on('connection', (socket) => {
        console.log('🔌 Utilisateur connecté:', socket.utilisateurId);
        
        // =====================================================
        // GESTION DES RÉUNIONS
        // =====================================================
        
        /**
         * Rejoindre une salle de réunion
         */
        socket.on('rejoindre-salle', ({ reunionId, utilisateurId, nomUtilisateur, offre }) => {
            socket.join(`reunion-${reunionId}`);
            socket.reunionId = reunionId;
            socket.nomUtilisateur = nomUtilisateur;
            
            // Notifier les autres participants
            socket.broadcast.to(`reunion-${reunionId}`).emit('utilisateur-rejoint', {
                utilisateurId,
                nomUtilisateur,
                offre
            });
            
            // Envoyer la liste des participants actuels
            const room = io.sockets.adapter.rooms.get(`reunion-${reunionId}`);
            if (room) {
                const participants = Array.from(room);
                socket.emit('participants-actuels', participants);
            }
            
            console.log(`👤 ${nomUtilisateur} a rejoint la réunion ${reunionId}`);
        });
        
        /**
         * Candidat ICE pour WebRTC
         */
        socket.on('candidat-ice', ({ reunionId, candidat }) => {
            socket.broadcast.to(`reunion-${reunionId}`).emit('candidat-ice', {
                candidat
            });
        });
        
        /**
         * Offre WebRTC
         */
        socket.on('offre-webrtc', ({ reunionId, offre }) => {
            socket.broadcast.to(`reunion-${reunionId}`).emit('offre-webrtc', {
                offre
            });
        });
        
        /**
         * Réponse WebRTC
         */
        socket.on('reponse-webrtc', ({ reunionId, reponse }) => {
            socket.broadcast.to(`reunion-${reunionId}`).emit('reponse-webrtc', {
                reponse
            });
        });
        
        // =====================================================
        // GESTION DU CHAT
        // =====================================================
        
        /**
         * Message de chat
         */
        socket.on('message-chat', ({ reunionId, utilisateurId, nomUtilisateur, message }) => {
            io.to(`reunion-${reunionId}`).emit('message-chat', {
                utilisateurId,
                nomUtilisateur,
                message,
                date: new Date()
            });
        });
        
        // =====================================================
        // GESTION DU PARTAGE D'ÉCRAN
        // =====================================================
        
        /**
         * Activation/désactivation du partage d'écran
         */
        socket.on('partage-ecran', ({ reunionId, utilisateurId, actif }) => {
            socket.broadcast.to(`reunion-${reunionId}`).emit('partage-ecran', {
                utilisateurId,
                actif
            });
        });
        
        // =====================================================
        // GESTION DU TABLEAU BLANC
        // =====================================================
        
        /**
         * Dessin sur le tableau blanc
         */
        socket.on('dessin-tableau', ({ reunionId, utilisateurId, x, y, dernierX, dernierY, outil }) => {
            socket.broadcast.to(`reunion-${reunionId}`).emit('mise-jour-tableau', {
                utilisateurId,
                x, y, dernierX, dernierY, outil
            });
        });
        
        /**
         * Effacement du tableau blanc
         */
        socket.on('effacer-tableau', ({ reunionId, utilisateurId }) => {
            socket.broadcast.to(`reunion-${reunionId}`).emit('effacer-tableau');
        });
        
        // =====================================================
        // GESTION DES SONDAGES
        // =====================================================
        
        /**
         * Création d'un sondage
         */
        socket.on('creer-sondage', ({ reunionId, utilisateurId, question, options }) => {
            io.to(`reunion-${reunionId}`).emit('nouveau-sondage', {
                utilisateurId,
                question,
                options,
                date: new Date()
            });
        });
        
        /**
         * Vote pour un sondage
         */
        socket.on('voter-sondage', ({ reunionId, utilisateurId, optionIndex }) => {
            socket.broadcast.to(`reunion-${reunionId}`).emit('resultat-sondage', {
                utilisateurId,
                optionIndex
            });
        });
        
        // =====================================================
        // GESTION DES DOCUMENTS PARTAGÉS
        // =====================================================
        
        /**
         * Partage de document
         */
        socket.on('partager-document', ({ reunionId, utilisateurId, document }) => {
            io.to(`reunion-${reunionId}`).emit('document-partage', {
                utilisateurId,
                document,
                date: new Date()
            });
        });
        
        // =====================================================
        // DÉCONNEXION
        // =====================================================
        
        /**
         * Quitter la réunion
         */
        socket.on('quitter-salle', ({ reunionId, utilisateurId }) => {
            if (socket.reunionId) {
                socket.leave(`reunion-${reunionId}`);
                socket.broadcast.to(`reunion-${reunionId}`).emit('utilisateur-parti', {
                    utilisateurId
                });
                console.log(`👋 Utilisateur ${socket.utilisateurId} a quitté la réunion ${reunionId}`);
            }
        });
        
        /**
         * Déconnexion
         */
        socket.on('disconnect', () => {
            if (socket.reunionId) {
                io.to(`reunion-${socket.reunionId}`).emit('utilisateur-parti', {
                    utilisateurId: socket.utilisateurId
                });
                console.log(`🔌 Utilisateur déconnecté: ${socket.utilisateurId}`);
            }
        });
    });
    
    return io;
}

/**
 * Récupère l'instance Socket.io
 * @returns {Object} Instance Socket.io
 */
function getIO() {
    return io;
}

module.exports = { initSocket, getIO };
