// =====================================================
// SERVEUR PRINCIPAL DE LA PLATEFORME LMS
// =====================================================

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Importation du module Socket.io pour le temps réel
const { initSocket } = require('./socket');

const app = express();
const PORT = process.env.PORT || 5000;

// =====================================================
// MIDDLEWARES GLOBAUX
// =====================================================
app.use(cors());                    // Autorise les requêtes cross-origin
app.use(express.json());            // Parse le JSON des requêtes
app.use(express.static('telechargements'));  // Dossier public pour les fichiers

// =====================================================
// CONFIGURATION DE L'UPLOAD DE FICHIERS
// =====================================================
const configurationStockage = multer.diskStorage({
    destination: (req, fichier, cb) => {
        const dossierUpload = 'telechargements/';
        // Crée le dossier s'il n'existe pas
        if (!fs.existsSync(dossierUpload)) {
            fs.mkdirSync(dossierUpload, { recursive: true });
        }
        cb(null, dossierUpload);
    },
    filename: (req, fichier, cb) => {
        // Génère un nom unique pour éviter les conflits
        const suffixeUnique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, suffixeUnique + path.extname(fichier.originalname));
    }
});

const upload = multer({ 
    storage: configurationStockage,
    limits: { fileSize: 100 * 1024 * 1024 }, // Limite à 100 MB
    fileFilter: (req, fichier, cb) => {
        // Types de fichiers autorisés
        const typesAutorises = /pdf|mp4|webm|ogg|jpg|jpeg|png/;
        const extensionValide = typesAutorises.test(path.extname(fichier.originalname).toLowerCase());
        const mimeTypeValide = typesAutorises.test(fichier.mimetype);
        
        if (mimeTypeValide && extensionValide) {
            return cb(null, true);
        } else {
            cb(new Error('Format non supporté. Utilisez PDF, vidéo ou image.'));
        }
    }
});

// =====================================================
// ROUTES DE L'API
// =====================================================
app.use('/api/auth', require('./routes/authentification'));
app.use('/api/cours', require('./routes/cours'));
app.use('/api/lecons', require('./routes/lecons'));
app.use('/api/evaluations', require('./routes/evaluations'));
app.use('/api/certificats', require('./routes/certificats'));
app.use('/api/reunions', require('./routes/reunions'));

// Route pour l'upload de fichiers
app.post('/api/upload', upload.single('fichier'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ erreur: 'Aucun fichier uploadé' });
    }
    res.json({ 
        url: `/telechargements/${req.file.filename}`,
        nom: req.file.filename 
    });
});

// Route statique pour les fichiers uploadés
app.use('/telechargements', express.static(path.join(__dirname, 'telechargements')));

// =====================================================
// DÉMARRAGE DU SERVEUR AVEC SOCKET.IO
// =====================================================
const server = app.listen(PORT, () => {
    console.log(`✅ Serveur démarré sur le port ${PORT}`);
    console.log(`📁 Dossier d'upload: ./telechargements`);
});

// Initialisation de Socket.io pour les réunions en temps réel
initSocket(server);
