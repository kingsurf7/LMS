// =====================================================
// MIDDLEWARE D'AUTHENTIFICATION ET D'AUTORISATION
// =====================================================

const jwt = require('jsonwebtoken');  // Pour vérifier les tokens JWT

// Clé secrète pour JWT (à mettre dans .env en production)
const CLE_SECRETE = process.env.JWT_SECRET || 'votre-cle-secrete-changez-moi';

/**
 * Middleware pour vérifier le token JWT
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 * @param {Function} next - Fonction suivante
 */
function verifierToken(req, res, next) {
    // Récupération du token depuis l'en-tête Authorization
    const enTeteAuth = req.headers['authorization'];
    const token = enTeteAuth && enTeteAuth.split(' ')[1]; // Format: "Bearer TOKEN"
    
    // Si aucun token n'est fourni
    if (!token) {
        return res.status(401).json({ erreur: 'Accès non autorisé - Token manquant' });
    }
    
    // Vérification et décodage du token
    jwt.verify(token, CLE_SECRETE, (erreur, utilisateurDecode) => {
        if (erreur) {
            return res.status(403).json({ erreur: 'Token invalide ou expiré' });
        }
        // Ajout des informations de l'utilisateur à la requête
        req.utilisateur = utilisateurDecode;
        next();
    });
}

/**
 * Middleware pour vérifier les rôles autorisés
 * @param {...string} rolesAutorises - Liste des rôles autorisés
 * @returns {Function} Middleware
 */
function verifierRoles(...rolesAutorises) {
    return (req, res, next) => {
        // Vérification que l'utilisateur a un rôle autorisé
        if (!req.utilisateur || !rolesAutorises.includes(req.utilisateur.role)) {
            return res.status(403).json({ 
                erreur: 'Accès interdit - Rôle non autorisé' 
            });
        }
        next();
    };
}

// Exportation des middlewares
module.exports = { verifierToken, verifierRoles }; 
