// =====================================================
// MODÈLE UTILISATEUR - GESTION DES COMPTES UTILISATEURS
// =====================================================

const pool = require('../config/baseDonnees');
const bcrypt = require('bcryptjs');

class Utilisateur {
    /**
     * Crée un nouvel utilisateur dans la base de données
     * @param {Object} donnees - Données de l'utilisateur
     * @param {string} donnees.email - Email de l'utilisateur
     * @param {string} donnees.motDePasse - Mot de passe en clair
     * @param {string} donnees.nom - Nom complet
     * @param {string} donnees.role - Rôle ('enseignant', 'etudiant', 'promoteur')
     * @returns {Promise<Object>} Utilisateur créé (sans mot de passe)
     */
    static async creer({ email, motDePasse, nom, role }) {
        // Hashage du mot de passe pour la sécurité
        const motDePasseHash = await bcrypt.hash(motDePasse, 10);
        
        // Insertion dans la base de données
        const resultat = await pool.query(
            `INSERT INTO utilisateurs (email, mot_de_passe, nom, role) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, email, nom, role, date_creation`,
            [email, motDePasseHash, nom, role]
        );
        
        return resultat.rows[0];
    }

    /**
     * Recherche un utilisateur par son email
     * @param {string} email - Email à rechercher
     * @returns {Promise<Object|null>} Utilisateur trouvé ou null
     */
    static async trouverParEmail(email) {
        const resultat = await pool.query(
            'SELECT * FROM utilisateurs WHERE email = $1',
            [email]
        );
        return resultat.rows[0];
    }

    /**
     * Recherche un utilisateur par son ID
     * @param {number} id - ID de l'utilisateur
     * @returns {Promise<Object|null>} Utilisateur trouvé ou null
     */
    static async trouverParId(id) {
        const resultat = await pool.query(
            'SELECT id, email, nom, role, date_creation FROM utilisateurs WHERE id = $1',
            [id]
        );
        return resultat.rows[0];
    }

    /**
     * Récupère tous les étudiants
     * @returns {Promise<Array>} Liste des étudiants
     */
    static async recupererTousLesEtudiants() {
        const resultat = await pool.query(
            'SELECT id, email, nom, role FROM utilisateurs WHERE role = $1',
            ['etudiant']
        );
        return resultat.rows;
    }
}

module.exports = Utilisateur;
