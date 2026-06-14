// =====================================================
// MODÈLE PROGRESSION - SUIVI DE L'APPRENTISSAGE
// =====================================================

const pool = require('../config/baseDonnees');

class Progression {
    /**
     * Enregistre ou met à jour la progression d'un étudiant
     * @param {Object} donnees - Données de progression
     * @returns {Promise<Object>} Progression enregistrée
     */
    static async enregistrer({ etudiantId, leconId, score, terminee }) {
        // Vérifier si une progression existe déjà
        const existante = await pool.query(
            'SELECT * FROM progressions WHERE etudiant_id = $1 AND lecon_id = $2',
            [etudiantId, leconId]
        );
        
        if (existante.rows.length > 0) {
            // Mise à jour
            const resultat = await pool.query(
                `UPDATE progressions 
                 SET score = $1, terminee = $2, date_completion = $3 
                 WHERE etudiant_id = $4 AND lecon_id = $5 
                 RETURNING *`,
                [score, terminee, terminee ? new Date() : null, etudiantId, leconId]
            );
            return resultat.rows[0];
        } else {
            // Création
            const resultat = await pool.query(
                `INSERT INTO progressions (etudiant_id, lecon_id, score, terminee, date_completion) 
                 VALUES ($1, $2, $3, $4, $5) 
                 RETURNING *`,
                [etudiantId, leconId, score, terminee, terminee ? new Date() : null]
            );
            return resultat.rows[0];
        }
    }

    /**
     * Récupère la progression d'un étudiant pour une leçon
     * @param {number} etudiantId - ID de l'étudiant
     * @param {number} leconId - ID de la leçon
     * @returns {Promise<Object|null>} Progression trouvée
     */
    static async trouverParEtudiantEtLecon(etudiantId, leconId) {
        const resultat = await pool.query(
            'SELECT * FROM progressions WHERE etudiant_id = $1 AND lecon_id = $2',
            [etudiantId, leconId]
        );
        return resultat.rows[0];
    }

    /**
     * Calcule le pourcentage de progression d'un étudiant pour un cours
     * @param {number} etudiantId - ID de l'étudiant
     * @param {number} coursId - ID du cours
     * @returns {Promise<number>} Pourcentage de progression
     */
    static async calculerProgressionCours(etudiantId, coursId) {
        const resultat = await pool.query(`
            SELECT 
                COUNT(DISTINCT l.id) as total_lecons,
                COUNT(DISTINCT CASE WHEN p.terminee = true THEN l.id END) as lecons_terminees
            FROM lecons l
            LEFT JOIN progressions p ON p.lecon_id = l.id AND p.etudiant_id = $1
            WHERE l.cours_id = $2
        `, [etudiantId, coursId]);
        
        const { total_lecons, lecons_terminees } = resultat.rows[0];
        if (total_lecons === 0) return 0;
        
        return Math.round((lecons_terminees / total_lecons) * 100);
    }

    /**
     * Récupère toutes les progressions d'un étudiant
     * @param {number} etudiantId - ID de l'étudiant
     * @returns {Promise<Array>} Liste des progressions
     */
    static async trouverParEtudiant(etudiantId) {
        const resultat = await pool.query(`
            SELECT p.*, l.titre as titre_lecon, c.titre as titre_cours
            FROM progressions p
            JOIN lecons l ON p.lecon_id = l.id
            JOIN cours c ON l.cours_id = c.id
            WHERE p.etudiant_id = $1
            ORDER BY p.date_completion DESC
        `, [etudiantId]);
        return resultat.rows;
    }
}

module.exports = Progression; 
