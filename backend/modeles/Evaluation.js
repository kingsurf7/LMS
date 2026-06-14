// =====================================================
// MODÈLE ÉVALUATION - GESTION DES QUIZ ET TESTS
// =====================================================

const pool = require('../config/baseDonnees');

class Evaluation {
    /**
     * Crée une nouvelle évaluation
     * @param {Object} donnees - Informations de l'évaluation
     * @returns {Promise<Object>} Évaluation créée
     */
    static async creer({ leconId, titre, questions, scoreMinimum }) {
        const resultat = await pool.query(
            `INSERT INTO evaluations (lecon_id, titre, questions, score_minimum) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [leconId, titre, JSON.stringify(questions), scoreMinimum || 60]
        );
        return resultat.rows[0];
    }

    /**
     * Récupère l'évaluation d'une leçon
     * @param {number} leconId - ID de la leçon
     * @returns {Promise<Object|null>} Évaluation trouvée
     */
    static async trouverParLecon(leconId) {
        const resultat = await pool.query(
            'SELECT * FROM evaluations WHERE lecon_id = $1',
            [leconId]
        );
        return resultat.rows[0];
    }

    /**
     * Récupère une évaluation par son ID
     * @param {number} id - ID de l'évaluation
     * @returns {Promise<Object|null>} Évaluation trouvée
     */
    static async trouverParId(id) {
        const resultat = await pool.query(
            'SELECT * FROM evaluations WHERE id = $1',
            [id]
        );
        return resultat.rows[0];
    }

    /**
     * Calcule le score d'un étudiant pour une évaluation
     * @param {Object} evaluation - Évaluation avec les questions
     * @param {Array} reponsesEtudiant - Réponses de l'étudiant
     * @returns {number} Score en pourcentage
     */
    static calculerScore(evaluation, reponsesEtudiant) {
        const questions = evaluation.questions;
        let pointsGagnes = 0;
        let pointsTotaux = 0;
        
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            const reponse = reponsesEtudiant[i];
            
            pointsTotaux += question.points || 1;
            
            if (question.type === 'qcm') {
                // Vérifie si la réponse est correcte (comparaison d'index)
                if (reponse === question.reponseCorrecte) {
                    pointsGagnes += question.points || 1;
                }
            } else if (question.type === 'texte') {
                // Pour les réponses texte, comparaison approximative
                if (reponse && reponse.toLowerCase().trim() === question.reponseCorrecte.toLowerCase().trim()) {
                    pointsGagnes += question.points || 1;
                }
            }
        }
        
        return Math.round((pointsGagnes / pointsTotaux) * 100);
    }

    /**
     * Met à jour une évaluation
     * @param {number} id - ID de l'évaluation
     * @param {Object} donnees - Nouvelles données
     * @returns {Promise<Object>} Évaluation mise à jour
     */
    static async mettreAJour(id, { titre, questions, scoreMinimum }) {
        const resultat = await pool.query(
            'UPDATE evaluations SET titre = $1, questions = $2, score_minimum = $3 WHERE id = $4 RETURNING *',
            [titre, JSON.stringify(questions), scoreMinimum, id]
        );
        return resultat.rows[0];
    }
}

module.exports = Evaluation;
