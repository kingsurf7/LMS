// =====================================================
// ROUTES POUR LA GESTION DES COURS
// =====================================================

const express = require('express');
const routeur = express.Router();
const Cours = require('../modeles/Cours');
const Lecon = require('../modeles/Lecon');
const Progression = require('../modeles/Progression');
const { verifierToken, verifierRoles } = require('../middlewares/authentification');

/**
 * CRÉER UN COURS - Réservé aux promoteurs
 * POST /api/cours
 */
routeur.post('/', verifierToken, verifierRoles('promoteur'), async (req, res) => {
    try {
        const { titre, description } = req.body;
        const cours = await Cours.creer({
            titre,
            description,
            promoteurId: req.utilisateur.id
        });
        res.json(cours);
    } catch (erreur) {
        console.error('Erreur création cours:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

/**
 * RÉCUPÉRER TOUS LES COURS
 * GET /api/cours
 */
routeur.get('/', verifierToken, async (req, res) => {
    try {
        const cours = await Cours.trouverTous();
        res.json(cours);
    } catch (erreur) {
        console.error('Erreur récupération cours:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

/**
 * RÉCUPÉRER UN COURS PAR SON ID
 * GET /api/cours/:id
 */
routeur.get('/:id', verifierToken, async (req, res) => {
    try {
        const cours = await Cours.trouverParId(req.params.id);
        if (!cours) {
            return res.status(404).json({ erreur: 'Cours non trouvé' });
        }
        
        // Récupérer les leçons du cours
        const lecons = await Lecon.trouverParCours(req.params.id);
        
        // Si l'utilisateur est un étudiant, récupérer sa progression
        let progression = null;
        if (req.utilisateur.role === 'etudiant') {
            progression = await Progression.calculerProgressionCours(req.utilisateur.id, req.params.id);
        }
        
        res.json({ ...cours, lecons, progression });
    } catch (erreur) {
        console.error('Erreur récupération cours:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

/**
 * METTRE À JOUR UN COURS
 * PUT /api/cours/:id
 */
routeur.put('/:id', verifierToken, verifierRoles('promoteur'), async (req, res) => {
    try {
        const { titre, description } = req.body;
        const cours = await Cours.mettreAJour(req.params.id, { titre, description });
        res.json(cours);
    } catch (erreur) {
        console.error('Erreur mise à jour cours:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

/**
 * SUPPRIMER UN COURS
 * DELETE /api/cours/:id
 */
routeur.delete('/:id', verifierToken, verifierRoles('promoteur'), async (req, res) => {
    try {
        await Cours.supprimer(req.params.id);
        res.json({ succes: true });
    } catch (erreur) {
        console.error('Erreur suppression cours:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

/**
 * RÉCUPÉRER LES COURS D'UN ÉTUDIANT
 * GET /api/cours/etudiant/mes-cours
 */
routeur.get('/etudiant/mes-cours', verifierToken, verifierRoles('etudiant'), async (req, res) => {
    try {
        const cours = await Cours.trouverParEtudiant(req.utilisateur.id);
        res.json(cours);
    } catch (erreur) {
        console.error('Erreur récupération cours étudiant:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

module.exports = routeur; 
