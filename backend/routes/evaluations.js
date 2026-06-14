// =====================================================
// ROUTES POUR LA GESTION DES ÉVALUATIONS
// =====================================================

const express = require('express');
const routeur = express.Router();
const Evaluation = require('../modeles/Evaluation');
const Progression = require('../modeles/Progression');
const { verifierToken, verifierRoles } = require('../middlewares/authentification');

/**
 * CRÉER UNE ÉVALUATION - Réservé aux enseignants
 * POST /api/evaluations
 */
routeur.post('/', verifierToken, verifierRoles('enseignant'), async (req, res) => {
    try {
        const { leconId, titre, questions, scoreMinimum } = req.body;
        const evaluation = await Evaluation.creer({
            leconId,
            titre,
            questions,
            scoreMinimum
        });
        res.json(evaluation);
    } catch (erreur) {
        console.error('Erreur création évaluation:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

/**
 * RÉCUPÉRER L'ÉVALUATION D'UNE LEÇON
 * GET /api/evaluations/lecon/:leconId
 */
routeur.get('/lecon/:leconId', verifierToken, async (req, res) => {
    try {
        const evaluation = await Evaluation.trouverParLecon(req.params.leconId);
        if (!evaluation) {
            return res.status(404).json({ erreur: 'Aucune évaluation pour cette leçon' });
        }
        res.json(evaluation);
    } catch (erreur) {
        console.error('Erreur récupération évaluation:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

/**
 * SOUMETTRE UNE ÉVALUATION - Pour les étudiants
 * POST /api/evaluations/:id/soumettre
 */
routeur.post('/:id/soumettre', verifierToken, verifierRoles('etudiant'), async (req, res) => {
    try {
        const { reponses } = req.body;
        const evaluation = await Evaluation.trouverParId(req.params.id);
        
        if (!evaluation) {
            return res.status(404).json({ erreur: 'Évaluation non trouvée' });
        }
        
        // Calculer le score
        const score = Evaluation.calculerScore(evaluation, reponses);
        const reussi = score >= evaluation.score_minimum;
        
        // Enregistrer la progression
        await Progression.enregistrer({
            etudiantId: req.utilisateur.id,
            leconId: evaluation.lecon_id,
            score: score,
            terminee: reussi
        });
        
        res.json({
            score,
            reussi,
            message: reussi ? 'Félicitations ! Vous avez réussi l\'évaluation.' : 'Vous n\'avez pas atteint le score minimum requis.'
        });
    } catch (erreur) {
        console.error('Erreur soumission évaluation:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

/**
 * METTRE À JOUR UNE ÉVALUATION
 * PUT /api/evaluations/:id
 */
routeur.put('/:id', verifierToken, verifierRoles('enseignant'), async (req, res) => {
    try {
        const { titre, questions, scoreMinimum } = req.body;
        const evaluation = await Evaluation.mettreAJour(req.params.id, { titre, questions, scoreMinimum });
        res.json(evaluation);
    } catch (erreur) {
        console.error('Erreur mise à jour évaluation:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

module.exports = routeur;
