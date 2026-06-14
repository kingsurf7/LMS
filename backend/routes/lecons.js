// =====================================================
// ROUTES POUR LA GESTION DES LEÇONS
// =====================================================

const express = require('express');
const routeur = express.Router();
const Lecon = require('../modeles/Lecon');
const { verifierToken, verifierRoles } = require('../middlewares/authentification');

/**
 * CRÉER UNE LEÇON - Réservé aux enseignants
 * POST /api/lecons
 */
routeur.post('/', verifierToken, verifierRoles('enseignant'), async (req, res) => {
    try {
        const { coursId, titre, contenu, type, urlFichier } = req.body;
        const lecon = await Lecon.creer({
            coursId,
            titre,
            contenu,
            type,
            urlFichier,
            enseignantId: req.utilisateur.id
        });
        res.json(lecon);
    } catch (erreur) {
        console.error('Erreur création leçon:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

/**
 * RÉCUPÉRER UNE LEÇON PAR SON ID
 * GET /api/lecons/:id
 */
routeur.get('/:id', verifierToken, async (req, res) => {
    try {
        const lecon = await Lecon.trouverParId(req.params.id);
        if (!lecon) {
            return res.status(404).json({ erreur: 'Leçon non trouvée' });
        }
        res.json(lecon);
    } catch (erreur) {
        console.error('Erreur récupération leçon:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

/**
 * METTRE À JOUR UNE LEÇON
 * PUT /api/lecons/:id
 */
routeur.put('/:id', verifierToken, verifierRoles('enseignant'), async (req, res) => {
    try {
        const { titre, contenu } = req.body;
        const lecon = await Lecon.mettreAJour(req.params.id, { titre, contenu });
        res.json(lecon);
    } catch (erreur) {
        console.error('Erreur mise à jour leçon:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

/**
 * SUPPRIMER UNE LEÇON
 * DELETE /api/lecons/:id
 */
routeur.delete('/:id', verifierToken, verifierRoles('enseignant'), async (req, res) => {
    try {
        await Lecon.supprimer(req.params.id);
        res.json({ succes: true });
    } catch (erreur) {
        console.error('Erreur suppression leçon:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

module.exports = routeur; 
