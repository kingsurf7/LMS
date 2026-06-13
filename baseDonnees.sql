-- =====================================================
-- BASE DE DONNÉES DE LA PLATEFORME LMS
-- =====================================================

-- Création de la base de données
CREATE DATABASE lms_db;

\c lms_db;

-- =====================================================
-- TABLE DES UTILISATEURS
-- =====================================================
CREATE TABLE utilisateurs (
    id SERIAL PRIMARY KEY,                    -- Identifiant unique
    email VARCHAR(255) UNIQUE NOT NULL,       -- Email de l'utilisateur
    mot_de_passe VARCHAR(255) NOT NULL,       -- Mot de passe hashé
    nom VARCHAR(255) NOT NULL,                -- Nom complet
    role VARCHAR(50) CHECK (role IN ('enseignant', 'etudiant', 'promoteur')) NOT NULL,  -- Rôle de l'utilisateur
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- Date d'inscription
);

-- =====================================================
-- TABLE DES COURS
-- =====================================================
CREATE TABLE cours (
    id SERIAL PRIMARY KEY,                    -- Identifiant du cours
    titre VARCHAR(255) NOT NULL,              -- Titre du cours
    description TEXT,                         -- Description détaillée
    promoteur_id INTEGER REFERENCES utilisateurs(id),  -- ID du promoteur qui a créé le cours
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- Date de création
);

-- =====================================================
-- TABLE DES LEÇONS
-- =====================================================
CREATE TABLE lecons (
    id SERIAL PRIMARY KEY,                    -- Identifiant de la leçon
    cours_id INTEGER REFERENCES cours(id) ON DELETE CASCADE,  -- Cours parent
    titre VARCHAR(255) NOT NULL,              -- Titre de la leçon
    contenu TEXT,                             -- Contenu textuel
    type VARCHAR(50) CHECK (type IN ('pdf', 'video')) NOT NULL,  -- Type de contenu
    url_fichier VARCHAR(500),                 -- URL du fichier (PDF ou vidéo)
    enseignant_id INTEGER REFERENCES utilisateurs(id),  -- Enseignant qui a créé la leçon
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP   -- Date de création
);

-- =====================================================
-- TABLE DES ÉVALUATIONS
-- =====================================================
CREATE TABLE evaluations (
    id SERIAL PRIMARY KEY,                    -- Identifiant de l'évaluation
    lecon_id INTEGER REFERENCES lecons(id) ON DELETE CASCADE,  -- Leçon associée
    titre VARCHAR(255) NOT NULL,              -- Titre de l'évaluation
    questions JSONB NOT NULL,                 -- Questions au format JSON
    score_minimum INTEGER DEFAULT 60,         -- Score minimum pour réussir (en %)
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP   -- Date de création
);

-- =====================================================
-- TABLE DES PROGRESSIONS
-- =====================================================
CREATE TABLE progressions (
    id SERIAL PRIMARY KEY,                    -- Identifiant de la progression
    etudiant_id INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE,  -- Étudiant concerné
    lecon_id INTEGER REFERENCES lecons(id) ON DELETE CASCADE,          -- Leçon concernée
    score INTEGER,                            -- Score obtenu à l'évaluation
    terminee BOOLEAN DEFAULT FALSE,           -- Leçon terminée ou non
    date_completion TIMESTAMP,                -- Date de complétion
    UNIQUE(etudiant_id, lecon_id)             -- Un étudiant ne peut avoir qu'une progression par leçon
);

-- =====================================================
-- TABLE DES CERTIFICATS
-- =====================================================
CREATE TABLE certificats (
    id SERIAL PRIMARY KEY,                    -- Identifiant du certificat
    etudiant_id INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE,  -- Étudiant certifié
    cours_id INTEGER REFERENCES cours(id) ON DELETE CASCADE,            -- Cours validé
    code_certificat VARCHAR(255) UNIQUE NOT NULL,  -- Code unique du certificat
    date_emission TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Date d'émission
    UNIQUE(etudiant_id, cours_id)              -- Un étudiant ne peut avoir qu'un certificat par cours
);

-- =====================================================
-- TABLE DES RÉUNIONS (NOUVEAU - POUR VISIOCONFÉRENCE)
-- =====================================================
CREATE TABLE reunions (
    id SERIAL PRIMARY KEY,                    -- Identifiant de la réunion
    titre VARCHAR(255) NOT NULL,              -- Titre de la réunion
    description TEXT,                         -- Description
    enseignant_id INTEGER REFERENCES utilisateurs(id),  -- Enseignant organisateur
    cours_id INTEGER REFERENCES cours(id),              -- Cours associé
    lien_reunion VARCHAR(500) UNIQUE NOT NULL,          -- Lien unique pour rejoindre
    heure_programmee TIMESTAMP,                -- Date et heure programmées
    duree INTEGER DEFAULT 60,                 -- Durée en minutes
    statut VARCHAR(50) DEFAULT 'programmee',  -- programmee, en_cours, terminee, annulee
    url_enregistrement VARCHAR(500),           -- URL de l'enregistrement
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE DES PARTICIPANTS AUX RÉUNIONS
-- =====================================================
CREATE TABLE participants_reunion (
    id SERIAL PRIMARY KEY,
    reunion_id INTEGER REFERENCES reunions(id) ON DELETE CASCADE,
    utilisateur_id INTEGER REFERENCES utilisateurs(id),
    heure_arrivee TIMESTAMP,
    heure_depart TIMESTAMP,
    duree_secondes INTEGER DEFAULT 0,
    UNIQUE(reunion_id, utilisateur_id)
);

-- =====================================================
-- TABLE DES MESSAGES DE CHAT (RÉUNIONS)
-- =====================================================
CREATE TABLE messages_chat (
    id SERIAL PRIMARY KEY,
    reunion_id INTEGER REFERENCES reunions(id) ON DELETE CASCADE,
    utilisateur_id INTEGER REFERENCES utilisateurs(id),
    message TEXT,
    est_question BOOLEAN DEFAULT FALSE,
    date_envoi TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE DES PARTAGES D'ÉCRAN
-- =====================================================
CREATE TABLE partages_ecran (
    id SERIAL PRIMARY KEY,
    reunion_id INTEGER REFERENCES reunions(id) ON DELETE CASCADE,
    utilisateur_id INTEGER REFERENCES utilisateurs(id),
    url_capture VARCHAR(500),
    date_partage TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEX POUR OPTIMISER LES PERFORMANCES
-- =====================================================
CREATE INDEX idx_reunions_enseignant ON reunions(enseignant_id);
CREATE INDEX idx_reunions_cours ON reunions(cours_id);
CREATE INDEX idx_reunions_statut ON reunions(statut);
CREATE INDEX idx_participants_reunion ON participants_reunion(reunion_id);
CREATE INDEX idx_messages_reunion ON messages_chat(reunion_id);
CREATE INDEX idx_progressions_etudiant ON progressions(etudiant_id);

-- =====================================================
-- DONNÉES DE TEST
-- =====================================================
-- Mot de passe pour tous les comptes test: "motdepasse123"
INSERT INTO utilisateurs (email, mot_de_passe, nom, role) VALUES 
('enseignant@e-learning-lms.com', '$2a$10$r0YJYhZxZxZxZxZxZxZxZu', 'Professeur Test', 'enseignant'),
('etudiant@e-learning-lms.com', '$2a$10$r0YJYhZxZxZxZxZxZxZxZu', 'Étudiant Test', 'etudiant'),
('promoteur@e-learning-lms.com', '$2a$10$r0YJYhZxZxZxZxZxZxZxZu', 'Promoteur Test', 'promoteur');

-- Insertion d'un cours test
INSERT INTO cours (titre, description, promoteur_id) VALUES 
('Introduction à la Programmation', 'Cours complet pour débutants', 3);

-- Insertion d'une leçon test
INSERT INTO lecons (cours_id, titre, contenu, type, url_fichier, enseignant_id) VALUES 
(1, 'Les bases de JavaScript', 'Contenu de la leçon...', 'video', '/uploads/cours1.mp4', 1);
