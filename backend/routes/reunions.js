// =====================================================
// ROUTES POUR LES RÉUNIONS (VISIOCONFÉRENCE)
// =====================================================

const express = require('express');
const routeur = express.Router();
const Reunion = require('../modeles/Reunion');
const { verifierToken, verifierRoles } = require('../middlewares/authentification');

/**
 * CRÉER UNE RÉUNION - Réservé aux enseignants et promoteurs
 * POST /api/reunions
 */
routeur.post('/', verifierToken, verifierRoles('enseignant', 'promoteur'), async (req, res) => {
    try {
        const { titre, description, coursId, heureProgrammee, duree } = req.body;
        
        const reunion = await Reunion.creer({
            titre,
            description,
            enseignantId: req.utilisateur.id,
            coursId,
            heureProgrammee,
            duree: duree || 60
        });
        
        res.json(reunion);
    } catch (erreur) {
        console.error('Erreur création réunion:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

/**
 * RÉCUPÉRER LES RÉUNIONS D'UN ENSEIGNANT
 * GET /api/reunions/enseignant
 */
routeur.get('/enseignant', verifierToken, verifierRoles('enseignant'), async (req, res) => {
    try {
        const reunions = await Reunion.trouverParEnseignant(req.utilisateur.id);
        res.json(reunions);
    } catch (erreur) {
        console.error('Erreur récupération réunions:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

/**
 * RÉCUPÉRER LES RÉUNIONS D'UN ÉTUDIANT
 * GET /api/reunions/etudiant
 */
routeur.get('/etudiant', verifierToken, verifierRoles('etudiant'), async (req, res) => {
    try {
        const reunions = await Reunion.trouverParEtudiant(req.utilisateur.id);
        res.json(reunions);
    } catch (erreur) {
        console.error('Erreur récupération réunions:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

/**
 * RÉCUPÉRER LES DÉTAILS D'UNE RÉUNION
 * GET /api/reunions/:id
 */
routeur.get('/:id', verifierToken, async (req, res) => {
    try {
        const reunion = await Reunion.trouverParId(req.params.id);
        if (!reunion) {
            return res.status(404).json({ erreur: 'Réunion non trouvée' });
        }
        res.json(reunion);
    } catch (erreur) {
        console.error('Erreur récupération réunion:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

/**
 * REJOINDRE UNE RÉUNION
 * POST /api/reunions/:id/rejoindre
 */
routeur.post('/:id/rejoindre', verifierToken, async (req, res) => {
    try {
        await Reunion.rejoindreReunion(req.params.id, req.utilisateur.id);
        res.json({ succes: true });
    } catch (erreur) {
        console.error('Erreur pour rejoindre:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

/**
 * QUITTER UNE RÉUNION
 * POST /api/reunions/:id/quitter
 */
routeur.post('/:id/quitter', verifierToken, async (req, res) => {
    try {
        const resultat = await Reunion.quitterReunion(req.params.id, req.utilisateur.id);
        res.json(resultat);
    } catch (erreur) {
        console.error('Erreur pour quitter:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

/**
 * ENVOYER UN MESSAGE DANS LE CHAT
 * POST /api/reunions/:id/chat
 */
routeur.post('/:id/chat', verifierToken, async (req, res) => {
    try {
        const { message, estQuestion } = req.body;
        const messageChat = await Reunion.ajouterMessageChat(
            req.params.id,
            req.utilisateur.id,
            message,
            estQuestion || false
        );
        res.json(messageChat);
    } catch (erreur) {
        console.error('Erreur envoi message:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

/**
 * RÉCUPÉRER L'HISTORIQUE DU CHAT
 * GET /api/reunions/:id/chat
 */
routeur.get('/:id/chat', verifierToken, async (req, res) => {
    try {
        const messages = await Reunion.getMessagesChat(req.params.id);
        res.json(messages);
    } catch (erreur) {
        console.error('Erreur récupération messages:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

/**
 * RÉCUPÉRER LES PARTICIPANTS D'UNE RÉUNION
 * GET /api/reunions/:id/participants
 */
routeur.get('/:id/participants', verifierToken, async (req, res) => {
    try {
        const participants = await Reunion.getParticipants(req.params.id);
        res.json(participants);
    } catch (erreur) {
        console.error('Erreur récupération participants:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

/**
 * TERMINER UNE RÉUNION (Enseignant uniquement)
 * POST /api/reunions/:id/terminer
 */
routeur.post('/:id/terminer', verifierToken, verifierRoles('enseignant'), async (req, res) => {
    try {
        const reunion = await Reunion.terminerReunion(req.params.id);
        res.json(reunion);
    } catch (erreur) {
        console.error('Erreur fin réunion:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

/**
 * SAUVEGARDER L'ENREGISTREMENT D'UNE RÉUNION
 * POST /api/reunions/:id/enregistrement
 */
routeur.post('/:id/enregistrement', verifierToken, verifierRoles('enseignant'), async (req, res) => {
    try {
        const { urlEnregistrement } = req.body;
        const reunion = await Reunion.sauvegarderEnregistrement(req.params.id, urlEnregistrement);
        res.json(reunion);
    } catch (erreur) {
        console.error('Erreur sauvegarde enregistrement:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

module.exports = routeur; 
