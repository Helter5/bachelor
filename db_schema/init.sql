-- =============================================
-- Wrestling App - Database Schema
-- =============================================

-- Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_verified BOOLEAN DEFAULT false NOT NULL,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Refresh tokens (active sessions)
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_revoked BOOLEAN DEFAULT false NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    mac_address VARCHAR(255),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Email verification tokens
CREATE TABLE email_verification_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_used BOOLEAN DEFAULT false NOT NULL
);

CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_email_verification_tokens_token ON email_verification_tokens(token);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_used BOOLEAN DEFAULT false NOT NULL
);

CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);

-- Login history
CREATE TABLE login_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    mac_address VARCHAR(255),
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(100),
    login_method VARCHAR(20) DEFAULT 'local'
);

CREATE INDEX idx_login_history_user_id ON login_history(user_id);
CREATE INDEX idx_login_history_login_at ON login_history(login_at);

-- Arena Sources
CREATE TABLE arena_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL DEFAULT 'host.docker.internal',
    port INTEGER NOT NULL DEFAULT 8080,
    client_id VARCHAR(255),
    client_secret VARCHAR(255),
    api_key VARCHAR(255),
    is_enabled BOOLEAN DEFAULT true NOT NULL,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- =============================================
-- Arena synced tables
-- =============================================

-- Sport Events
CREATE TABLE sport_events (
    id BIGSERIAL PRIMARY KEY,
    arena_uuid UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE,
    country_iso_code CHAR(3),
    address_locality VARCHAR(100),
    is_individual_event BOOLEAN,
    is_team_event BOOLEAN,
    is_beach_wrestling BOOLEAN,
    tournament_type VARCHAR(50),
    event_type VARCHAR(50),
    continent VARCHAR(50),
    timezone VARCHAR(50),
    visible BOOLEAN,
    is_sync_enabled BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_sport_event_natural_key UNIQUE (name, start_date, country_iso_code)
);

CREATE INDEX ix_sport_events_arena_uuid ON sport_events(arena_uuid);

-- Teams
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    uid UUID NOT NULL,
    sport_event_id INTEGER NOT NULL REFERENCES sport_events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    alternate_name CHAR(3),
    athlete_count INTEGER,
    final_rank INTEGER,
    country_iso_code CHAR(3),
    sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_team_event_name UNIQUE(sport_event_id, name)
);

-- Victory Types (from /config/victory-types/{sport})
CREATE TABLE victory_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    type VARCHAR(100),
    sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Disciplines - sport + audience combinations with tournament rules
CREATE TABLE disciplines (
    id SERIAL PRIMARY KEY,
    sport_id VARCHAR(20) UNIQUE NOT NULL,
    sport_name VARCHAR(50),
    audience_id VARCHAR(20),
    audience_name VARCHAR(50),
    rounds_number INTEGER,
    round_duration INTEGER,
    tournament_type VARCHAR(50),
    sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Weight Categories
CREATE TABLE weight_categories (
    id SERIAL PRIMARY KEY,
    uid UUID NOT NULL,
    discipline_id INTEGER REFERENCES disciplines(id) ON DELETE SET NULL,
    max_weight INTEGER,
    count_fighters INTEGER,
    is_started BOOLEAN,
    is_completed BOOLEAN,
    sport_event_id INTEGER REFERENCES sport_events(id) ON DELETE CASCADE,
    sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_wc_event_weight_discipline UNIQUE(sport_event_id, max_weight, discipline_id)
);

-- Persons - master identity for wrestlers across events
CREATE TABLE persons (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    country_iso_code VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_persons_full_name ON persons(full_name);
CREATE UNIQUE INDEX uq_person_name_country ON persons(full_name, COALESCE(country_iso_code, ''));

-- Athletes (per-event participation, linked to persons)
CREATE TABLE athletes (
    id SERIAL PRIMARY KEY,
    uid UUID NOT NULL,
    team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    sport_event_id INTEGER REFERENCES sport_events(id) ON DELETE CASCADE,
    weight_category_id INTEGER REFERENCES weight_categories(id) ON DELETE SET NULL,
    is_competing BOOLEAN,
    person_id INTEGER REFERENCES persons(id) ON DELETE SET NULL,
    sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_athlete_event_person_wc UNIQUE(sport_event_id, person_id, weight_category_id)
);

-- Fights
CREATE TABLE fights (
    id SERIAL PRIMARY KEY,
    uid UUID NOT NULL,
    sport_event_id INTEGER NOT NULL REFERENCES sport_events(id) ON DELETE CASCADE,
    weight_category_id INTEGER REFERENCES weight_categories(id) ON DELETE SET NULL,
    fighter_one_id INTEGER REFERENCES athletes(id) ON DELETE CASCADE,
    fighter_two_id INTEGER REFERENCES athletes(id) ON DELETE CASCADE,
    winner_id INTEGER REFERENCES athletes(id) ON DELETE SET NULL,
    tp_one INTEGER,
    tp_two INTEGER,
    cp_one INTEGER,
    cp_two INTEGER,
    victory_type VARCHAR(10) REFERENCES victory_types(code) ON DELETE SET NULL,
    duration INTEGER,
    sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Functional unique index: deduplication naprieč Arena inštanciami (ORDER-independent)
CREATE UNIQUE INDEX uq_fight_event_fighters_wc
    ON fights(sport_event_id, LEAST(fighter_one_id, fighter_two_id), GREATEST(fighter_one_id, fighter_two_id), weight_category_id)
    WHERE fighter_one_id IS NOT NULL AND fighter_two_id IS NOT NULL;

-- Sync logs
CREATE TABLE sync_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    duration_seconds INTEGER,
    events_created INTEGER DEFAULT 0,
    events_updated INTEGER DEFAULT 0,
    athletes_created INTEGER DEFAULT 0,
    athletes_updated INTEGER DEFAULT 0,
    teams_created INTEGER DEFAULT 0,
    teams_updated INTEGER DEFAULT 0,
    weight_categories_created INTEGER DEFAULT 0,
    weight_categories_updated INTEGER DEFAULT 0,
    fights_created INTEGER DEFAULT 0,
    fights_updated INTEGER DEFAULT 0,
    error_message TEXT,
    details JSONB,
    ip_address VARCHAR(45)
);

CREATE INDEX idx_sync_logs_user_id ON sync_logs(user_id);
CREATE INDEX idx_sync_logs_started_at ON sync_logs(started_at DESC);
