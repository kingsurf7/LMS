// =====================================================
// CONFIGURATION DE LA CONNEXION À LA BASE DE DONNÉES
// =====================================================

// Importation du module pg (PostgreSQL client)
const { Pool } = require('pg');
// Chargement des variables d'environnement
require('dotenv').config();

// Création du pool de connexions à la base de données
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',      // Nom d'utilisateur
    host: process.env.DB_HOST || 'localhost',     // Hôte de la base de données
    database: process.env.DB_NAME || 'lms_db',    // Nom de la base
    password: process.env.DB_PASSWORD || 'postgres', // Mot de passe
    port: process.env.DB_PORT || 5432,            // Port PostgreSQL
});

// Exportation du pool pour utilisation dans les modèles
module.exports = pool;
