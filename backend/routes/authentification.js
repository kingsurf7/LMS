// =====================================================
// ROUTES D'AUTHENTIFICATION
// =====================================================

const express = require('express');
const routeur = express.Router();
const jwt = require('jsonwebtoken');
const Utilisateur = require('../modeles/Utilisateur');
const bcrypt = require('bcryptjs');

// Clé secrète pour JWT
const CLE_SECRETE = process.env.JWT_SECRET || 'votre-cle-secrete-changez-moi';

/**
 * ROUTE D'INSCRIPTION - Crée un nouveau compte utilisateur
 * POST /api/auth/inscription
 */
routeur.post('/inscription', async (req, res) => {
    try {
        // Extraction des données du formulaire
        const { email, motDePasse, nom, role } = req.body;
        
        // Vérification que l'email n'existe pas déjà
        const utilisateurExistant = await Utilisateur.trouverParEmail(email);
        if (utilisateurExistant) {
            return res.status(400).json({ erreur: 'Cet email est déjà utilisé' });
        }
        
        // Création de l'utilisateur dans la base
        const utilisateur = await Utilisateur.creer({ email, motDePasse, nom, role });
        
        // Génération du token JWT pour l'authentification automatique
        const token = jwt.sign(
            { id: utilisateur.id, role: utilisateur.role }, 
            CLE_SECRETE,
            { expiresIn: '7d' }  // Token valide 7 jours
        );
        
        // Envoi de la réponse
        res.json({ utilisateur, token });
    } catch (erreur) {
        console.error('Erreur inscription:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

/**
 * ROUTE DE CONNEXION - Authentifie un utilisateur existant
 * POST /api/auth/connexion
 */
routeur.post('/connexion', async (req, res) => {
    try {
        const { email, motDePasse } = req.body;
        
        // Recherche de l'utilisateur par email
        const utilisateur = await Utilisateur.trouverParEmail(email);
        
        // Vérification des identifiants
        if (!utilisateur || !await bcrypt.compare(motDePasse, utilisateur.mot_de_passe)) {
            return res.status(401).json({ erreur: 'Email ou mot de passe incorrect' });
        }
        
        // Génération du token
        const token = jwt.sign(
            { id: utilisateur.id, role: utilisateur.role }, 
            CLE_SECRETE,
            { expiresIn: '7d' }
        );
        
        // Retrait du mot de passe avant envoi
        const { mot_de_passe: _, ...utilisateurSansMotDePasse } = utilisateur;
        
        res.json({ utilisateur: utilisateurSansMotDePasse, token });
    } catch (erreur) {
        console.error('Erreur connexion:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

/**
 * ROUTE POUR VÉRIFIER LE TOKEN - Utile pour les requêtes AJAX
 * GET /api/auth/verifier
 */
routeur.get('/verifier', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ valide: false });
        }
        
        const decoded = jwt.verify(token, CLE_SECRETE);
        const utilisateur = await Utilisateur.trouverParId(decoded.id);
        
        if (!utilisateur) {
            return res.status(401).json({ valide: false });
        }
        
        res.json({ valide: true, utilisateur });
    } catch (erreur) {
        res.status(401).json({ valide: false });
    }
});

module.exports = routeur;
