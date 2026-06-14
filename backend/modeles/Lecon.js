// =====================================================
// MODÈLE LEÇON - GESTION DES LEÇONS DE COURS
// =====================================================

const pool = require('../config/baseDonnees');

class Lecon {
    /**
     * Crée une nouvelle leçon
     * @param {Object} donnees - Informations de la leçon
     * @returns {Promise<Object>} Leçon créée
     */
    static async creer({ coursId, titre, contenu, type, urlFichier, enseignantId }) {
        const resultat = await pool.query(
            `INSERT INTO lecons (cours_id, titre, contenu, type, url_fichier, enseignant_id) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *`,
            [coursId, titre, contenu, type, urlFichier, enseignantId]
        );
        return resultat.rows[0];
    }

    /**
     * Récupère toutes les leçons d'un cours
     * @param {number} coursId - ID du cours
     * @returns {Promise<Array>} Liste des leçons
     */
    static async trouverParCours(coursId) {
        const resultat = await pool.query(`
            SELECT l.*, 
                   e.id as evaluation_id,
                   e.titre as evaluation_titre
            FROM lecons l
            LEFT JOIN evaluations e ON e.lecon_id = l.id
            WHERE l.cours_id = $1
            ORDER BY l.date_creation ASC
        `, [coursId]);
        return resultat.rows;
    }

    /**
     * Récupère une leçon par son ID
     * @param {number} id - ID de la leçon
     * @returns {Promise<Object|null>} Leçon trouvée
     */
    static async trouverParId(id) {
        const resultat = await pool.query(`
            SELECT l.*, c.titre as titre_cours, u.nom as nom_enseignant
            FROM lecons l
            JOIN cours c ON l.cours_id = c.id
            JOIN utilisateurs u ON l.enseignant_id = u.id
            WHERE l.id = $1
        `, [id]);
        return resultat.rows[0];
    }

    /**
     * Met à jour une leçon
     * @param {number} id - ID de la leçon
     * @param {Object} donnees - Nouvelles données
     * @returns {Promise<Object>} Leçon mise à jour
     */
    static async mettreAJour(id, { titre, contenu }) {
        const resultat = await pool.query(
            'UPDATE lecons SET titre = $1, contenu = $2 WHERE id = $3 RETURNING *',
            [titre, contenu, id]
        );
        return resultat.rows[0];
    }

    /**
     * Supprime une leçon
     * @param {number} id - ID de la leçon
     * @returns {Promise<boolean>} Succès de la suppression
     */
    static async supprimer(id) {
        await pool.query('DELETE FROM lecons WHERE id = $1', [id]);
        return true;
    }
}

module.exports = Lecon;
