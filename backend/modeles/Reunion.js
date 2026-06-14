// =====================================================
// MODÈLE RÉUNION - GESTION DES VISIOCONFÉRENCES
// =====================================================

const pool = require('../config/baseDonnees');
const crypto = require('crypto');  // Pour générer des liens uniques

class Reunion {
    /**
     * Génère un lien unique pour la réunion
     * @returns {string} Lien unique
     */
    static genererLienReunion() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Crée une nouvelle réunion
     * @param {Object} donnees - Informations de la réunion
     * @returns {Promise<Object>} Réunion créée
     */
    static async creer({ titre, description, enseignantId, coursId, heureProgrammee, duree }) {
        // Génération du lien unique
        const lienReunion = this.genererLienReunion();
        
        // Insertion en base de données
        const resultat = await pool.query(
            `INSERT INTO reunions (titre, description, enseignant_id, cours_id, lien_reunion, heure_programmee, duree) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING *`,
            [titre, description, enseignantId, coursId, lienReunion, heureProgrammee, duree || 60]
        );
        
        return resultat.rows[0];
    }

    /**
     * Récupère toutes les réunions d'un enseignant
     * @param {number} enseignantId - ID de l'enseignant
     * @returns {Promise<Array>} Liste des réunions
     */
    static async trouverParEnseignant(enseignantId) {
        const resultat = await pool.query(`
            SELECT r.*, c.titre as titre_cours,
                   COUNT(DISTINCT pr.utilisateur_id) as nombre_participants
            FROM reunions r
            LEFT JOIN cours c ON r.cours_id = c.id
            LEFT JOIN participants_reunion pr ON r.id = pr.reunion_id
            WHERE r.enseignant_id = $1
            GROUP BY r.id, c.titre
            ORDER BY r.heure_programmee DESC
        `, [enseignantId]);
        
        return resultat.rows;
    }

    /**
     * Récupère toutes les réunions disponibles pour un étudiant
     * @param {number} etudiantId - ID de l'étudiant
     * @returns {Promise<Array>} Liste des réunions disponibles
     */
    static async trouverParEtudiant(etudiantId) {
        const resultat = await pool.query(`
            SELECT r.*, c.titre as titre_cours, u.nom as nom_enseignant,
                   CASE WHEN pr.utilisateur_id IS NOT NULL THEN true ELSE false END as a_rejoint
            FROM reunions r
            JOIN cours c ON r.cours_id = c.id
            JOIN utilisateurs u ON r.enseignant_id = u.id
            LEFT JOIN participants_reunion pr ON r.id = pr.reunion_id AND pr.utilisateur_id = $1
            WHERE r.statut IN ('programmee', 'en_cours')
            ORDER BY r.heure_programmee ASC
        `, [etudiantId]);
        
        return resultat.rows;
    }

    /**
     * Recherche une réunion par son ID
     * @param {number} id - ID de la réunion
     * @returns {Promise<Object|null>} Réunion trouvée
     */
    static async trouverParId(id) {
        const resultat = await pool.query(`
            SELECT r.*, u.nom as nom_enseignant, c.titre as titre_cours
            FROM reunions r
            JOIN utilisateurs u ON r.enseignant_id = u.id
            JOIN cours c ON r.cours_id = c.id
            WHERE r.id = $1
        `, [id]);
        
        return resultat.rows[0];
    }

    /**
     * Enregistre la participation d'un utilisateur à une réunion
     * @param {number} reunionId - ID de la réunion
     * @param {number} utilisateurId - ID de l'utilisateur
     * @returns {Promise<boolean>} Succès de l'opération
     */
    static async rejoindreReunion(reunionId, utilisateurId) {
        // Vérifier si l'utilisateur est déjà présent
        const existant = await pool.query(
            'SELECT * FROM participants_reunion WHERE reunion_id = $1 AND utilisateur_id = $2',
            [reunionId, utilisateurId]
        );
        
        // Si ce n'est pas déjà enregistré, on l'ajoute
        if (existant.rows.length === 0) {
            await pool.query(
                `INSERT INTO participants_reunion (reunion_id, utilisateur_id, heure_arrivee) 
                 VALUES ($1, $2, NOW())`,
                [reunionId, utilisateurId]
            );
        }
        
        // Mise à jour du statut de la réunion si c'est la première participation
        await pool.query(
            `UPDATE reunions SET statut = 'en_cours' 
             WHERE id = $1 AND statut = 'programmee'`,
            [reunionId]
        );
        
        return true;
    }

    /**
     * Enregistre le départ d'un utilisateur
     * @param {number} reunionId - ID de la réunion
     * @param {number} utilisateurId - ID de l'utilisateur
     * @returns {Promise<Object>} Durée de participation
     */
    static async quitterReunion(reunionId, utilisateurId) {
        // Calcul de la durée de participation
        const resultat = await pool.query(
            `UPDATE participants_reunion 
             SET heure_depart = NOW(), 
                 duree_secondes = EXTRACT(EPOCH FROM (NOW() - heure_arrivee))::INTEGER
             WHERE reunion_id = $1 AND utilisateur_id = $2 AND heure_depart IS NULL
             RETURNING duree_secondes`,
            [reunionId, utilisateurId]
        );
        
        // Vérifier s'il reste des participants
        const restants = await pool.query(
            'SELECT COUNT(*) FROM participants_reunion WHERE reunion_id = $1 AND heure_depart IS NULL',
            [reunionId]
        );
        
        // Si plus personne, terminer la réunion
        if (parseInt(restants.rows[0].count) === 0) {
            await pool.query(
                'UPDATE reunions SET statut = $1 WHERE id = $2',
                ['terminee', reunionId]
            );
        }
        
        return resultat.rows[0];
    }

    /**
     * Ajoute un message dans le chat de la réunion
     * @param {number} reunionId - ID de la réunion
     * @param {number} utilisateurId - ID de l'utilisateur
     * @param {string} message - Contenu du message
     * @param {boolean} estQuestion - Indique si c'est une question
     * @returns {Promise<Object>} Message ajouté
     */
    static async ajouterMessageChat(reunionId, utilisateurId, message, estQuestion = false) {
        const resultat = await pool.query(
            `INSERT INTO messages_chat (reunion_id, utilisateur_id, message, est_question) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [reunionId, utilisateurId, message, estQuestion]
        );
        
        return resultat.rows[0];
    }

    /**
     * Récupère l'historique des messages d'une réunion
     * @param {number} reunionId - ID de la réunion
     * @param {number} limite - Nombre maximum de messages
     * @returns {Promise<Array>} Liste des messages
     */
    static async getMessagesChat(reunionId, limite = 100) {
        const resultat = await pool.query(`
            SELECT mc.*, u.nom as nom_utilisateur, u.role
            FROM messages_chat mc
            JOIN utilisateurs u ON mc.utilisateur_id = u.id
            WHERE mc.reunion_id = $1
            ORDER BY mc.date_envoi ASC
            LIMIT $2
        `, [reunionId, limite]);
        
        return resultat.rows;
    }

    /**
     * Récupère tous les participants d'une réunion
     * @param {number} reunionId - ID de la réunion
     * @returns {Promise<Array>} Liste des participants
     */
    static async getParticipants(reunionId) {
        const resultat = await pool.query(`
            SELECT pr.*, u.nom, u.role, u.email
            FROM participants_reunion pr
            JOIN utilisateurs u ON pr.utilisateur_id = u.id
            WHERE pr.reunion_id = $1
            ORDER BY pr.heure_arrivee ASC
        `, [reunionId]);
        
        return resultat.rows;
    }

    /**
     * Termine une réunion (enseignant uniquement)
     * @param {number} reunionId - ID de la réunion
     * @returns {Promise<Object>} Réunion mise à jour
     */
    static async terminerReunion(reunionId) {
        const resultat = await pool.query(
            `UPDATE reunions SET statut = 'terminee' WHERE id = $1 RETURNING *`,
            [reunionId]
        );
        
        return resultat.rows[0];
    }

    /**
     * Sauvegarde l'URL d'enregistrement de la réunion
     * @param {number} reunionId - ID de la réunion
     * @param {string} urlEnregistrement - URL de l'enregistrement
     * @returns {Promise<Object>} Réunion mise à jour
     */
    static async sauvegarderEnregistrement(reunionId, urlEnregistrement) {
        const resultat = await pool.query(
            `UPDATE reunions SET url_enregistrement = $1 WHERE id = $2 RETURNING *`,
            [urlEnregistrement, reunionId]
        );
        
        return resultat.rows[0];
    }
}

module.exports = Reunion; 
