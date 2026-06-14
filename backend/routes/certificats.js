// =====================================================
// ROUTES POUR LA GESTION DES CERTIFICATS
// =====================================================

const express = require('express');
const routeur = express.Router();
const pool = require('../config/baseDonnees');
const { verifierToken, verifierRoles } = require('../middlewares/authentification');
const crypto = require('crypto');

/**
 * GÉNÈRE UN CERTIFICAT POUR UN ÉTUDIANT
 * POST /api/certificats/generer
 */
routeur.post('/generer', verifierToken, verifierRoles('promoteur'), async (req, res) => {
    try {
        const { etudiantId, coursId } = req.body;
        
        // Vérifier que l'étudiant a bien complété tous les modules
        const progression = await pool.query(`
            SELECT 
                COUNT(DISTINCT l.id) as total_lecons,
                COUNT(DISTINCT CASE WHEN p.terminee = true THEN l.id END) as lecons_terminees
            FROM lecons l
            LEFT JOIN progressions p ON p.lecon_id = l.id AND p.etudiant_id = $1
            WHERE l.cours_id = $2
        `, [etudiantId, coursId]);
        
        const { total_lecons, lecons_terminees } = progression.rows[0];
        
        if (lecons_terminees < total_lecons) {
            return res.status(400).json({ 
                erreur: 'L\'étudiant n\'a pas complété tous les modules' 
            });
        }
        
        // Générer un code unique pour le certificat
        const codeCertificat = crypto.randomBytes(16).toString('hex').toUpperCase();
        
        // Créer le certificat
        const resultat = await pool.query(
            `INSERT INTO certificats (etudiant_id, cours_id, code_certificat) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (etudiant_id, cours_id) DO UPDATE 
             SET code_certificat = $3, date_emission = CURRENT_TIMESTAMP
             RETURNING *`,
            [etudiantId, coursId, codeCertificat]
        );
        
        res.json(resultat.rows[0]);
    } catch (erreur) {
        console.error('Erreur génération certificat:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

/**
 * RÉCUPÉRER LES CERTIFICATS D'UN ÉTUDIANT
 * GET /api/certificats/etudiant
 */
routeur.get('/etudiant', verifierToken, verifierRoles('etudiant'), async (req, res) => {
    try {
        const resultat = await pool.query(`
            SELECT c.*, cr.titre as titre_cours, cr.description as description_cours
            FROM certificats c
            JOIN cours cr ON c.cours_id = cr.id
            WHERE c.etudiant_id = $1
            ORDER BY c.date_emission DESC
        `, [req.utilisateur.id]);
        
        res.json(resultat.rows);
    } catch (erreur) {
        console.error('Erreur récupération certificats:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

/**
 * VÉRIFIER UN CERTIFICAT PAR SON CODE
 * GET /api/certificats/verifier/:code
 */
routeur.get('/verifier/:code', async (req, res) => {
    try {
        const resultat = await pool.query(`
            SELECT c.*, u.nom as nom_etudiant, cr.titre as titre_cours
            FROM certificats c
            JOIN utilisateurs u ON c.etudiant_id = u.id
            JOIN cours cr ON c.cours_id = cr.id
            WHERE c.code_certificat = $1
        `, [req.params.code]);
        
        if (resultat.rows.length === 0) {
            return res.status(404).json({ valide: false, message: 'Certificat invalide' });
        }
        
        res.json({ valide: true, certificat: resultat.rows[0] });
    } catch (erreur) {
        console.error('Erreur vérification certificat:', erreur);
        res.status(400).json({ erreur: erreur.message });
    }
});

module.exports = routeur;
