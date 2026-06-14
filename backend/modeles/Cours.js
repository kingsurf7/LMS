// =====================================================
// MODÈLE COURS - GESTION DES COURS
// =====================================================

const pool = require('../config/baseDonnees');

class Cours {
    /**
     * Crée un nouveau cours
     * @param {Object} donnees - Informations du cours
     * @returns {Promise<Object>} Cours créé
     */
    static async creer({ titre, description, promoteurId }) {
        const resultat = await pool.query(
            `INSERT INTO cours (titre, description, promoteur_id) 
             VALUES ($1, $2, $3) 
             RETURNING *`,
            [titre, description, promoteurId]
        );
        return resultat.rows[0];
    }

    /**
     * Récupère tous les cours
     * @returns {Promise<Array>} Liste des cours
     */
    static async trouverTous() {
        const resultat = await pool.query(`
            SELECT c.*, u.nom as nom_promoteur,
                   COUNT(DISTINCT l.id) as nombre_lecons,
                   COUNT(DISTINCT p.etudiant_id) as nombre_etudiants
            FROM cours c
            LEFT JOIN utilisateurs u ON c.promoteur_id = u.id
            LEFT JOIN lecons l ON l.cours_id = c.id
            LEFT JOIN progressions p ON p.lecon_id = l.id
            GROUP BY c.id, u.nom
            ORDER BY c.date_creation DESC
        `);
        return resultat.rows;
    }

    /**
     * Récupère un cours par son ID
     * @param {number} id - ID du cours
     * @returns {Promise<Object|null>} Cours trouvé
     */
    static async trouverParId(id) {
        const resultat = await pool.query(`
            SELECT c.*, u.nom as nom_promoteur
            FROM cours c
            LEFT JOIN utilisateurs u ON c.promoteur_id = u.id
            WHERE c.id = $1
        `, [id]);
        return resultat.rows[0];
    }

    /**
     * Met à jour un cours
     * @param {number} id - ID du cours
     * @param {Object} donnees - Nouvelles données
     * @returns {Promise<Object>} Cours mis à jour
     */
    static async mettreAJour(id, { titre, description }) {
        const resultat = await pool.query(
            'UPDATE cours SET titre = $1, description = $2 WHERE id = $3 RETURNING *',
            [titre, description, id]
        );
        return resultat.rows[0];
    }

    /**
     * Supprime un cours
     * @param {number} id - ID du cours
     * @returns {Promise<boolean>} Succès de la suppression
     */
    static async supprimer(id) {
        await pool.query('DELETE FROM cours WHERE id = $1', [id]);
        return true;
    }

    /**
     * Récupère les cours d'un étudiant (ceux auxquels il est inscrit)
     * @param {number} etudiantId - ID de l'étudiant
     * @returns {Promise<Array>} Liste des cours
     */
    static async trouverParEtudiant(etudiantId) {
        const resultat = await pool.query(`
            SELECT DISTINCT c.*, 
                   COUNT(DISTINCT l.id) as total_lecons,
                   COUNT(DISTINCT CASE WHEN p.terminee THEN l.id END) as lecons_completees
            FROM cours c
            JOIN lecons l ON l.cours_id = c.id
            LEFT JOIN progressions p ON p.lecon_id = l.id AND p.etudiant_id = $1
            GROUP BY c.id
            ORDER BY c.date_creation DESC
        `, [etudiantId]);
        return resultat.rows;
    }
}

module.exports = Cours;
