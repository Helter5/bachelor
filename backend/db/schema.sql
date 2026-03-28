--
-- PostgreSQL database dump
--

-- Dumped from database version 16.11
-- Dumped by pg_dump version 16.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: arena_sources; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.arena_sources (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    host character varying(255) DEFAULT 'host.docker.internal'::character varying NOT NULL,
    port integer DEFAULT 8080 NOT NULL,
    api_key character varying(255),
    is_enabled boolean DEFAULT true NOT NULL,
    last_sync_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    client_id character varying,
    client_secret character varying
);


ALTER TABLE public.arena_sources OWNER TO "user";

--
-- Name: arena_sources_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.arena_sources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.arena_sources_id_seq OWNER TO "user";

--
-- Name: arena_sources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.arena_sources_id_seq OWNED BY public.arena_sources.id;


--
-- Name: athletes; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.athletes (
    id integer NOT NULL,
    uid uuid NOT NULL,
    team_id integer,
    sport_event_id integer,
    weight_category_id integer,
    is_competing boolean,
    person_id integer,
    sync_timestamp timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.athletes OWNER TO "user";

--
-- Name: athletes_new_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.athletes_new_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.athletes_new_id_seq OWNER TO "user";

--
-- Name: athletes_new_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.athletes_new_id_seq OWNED BY public.athletes.id;


--
-- Name: disciplines; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.disciplines (
    id integer NOT NULL,
    sport_id character varying(20) NOT NULL,
    sport_name character varying(50),
    audience_id character varying(20),
    audience_name character varying(50),
    rounds_number integer,
    round_duration integer,
    tournament_type character varying(50),
    sync_timestamp timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.disciplines OWNER TO "user";

--
-- Name: disciplines_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.disciplines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.disciplines_id_seq OWNER TO "user";

--
-- Name: disciplines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.disciplines_id_seq OWNED BY public.disciplines.id;


--
-- Name: email_verification_tokens; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.email_verification_tokens (
    id integer NOT NULL,
    token character varying(255) NOT NULL,
    user_id integer NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_used boolean DEFAULT false NOT NULL
);


ALTER TABLE public.email_verification_tokens OWNER TO "user";

--
-- Name: email_verification_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.email_verification_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_verification_tokens_id_seq OWNER TO "user";

--
-- Name: email_verification_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.email_verification_tokens_id_seq OWNED BY public.email_verification_tokens.id;


--
-- Name: fights; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.fights (
    id integer NOT NULL,
    uid uuid NOT NULL,
    sport_event_id integer NOT NULL,
    weight_category_id integer,
    fighter_one_id integer,
    fighter_two_id integer,
    winner_id integer,
    tp_one integer,
    tp_two integer,
    cp_one integer,
    cp_two integer,
    victory_type character varying(10),
    duration integer,
    sync_timestamp timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.fights OWNER TO "user";

--
-- Name: fights_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.fights_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fights_id_seq OWNER TO "user";

--
-- Name: fights_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.fights_id_seq OWNED BY public.fights.id;


--
-- Name: login_history; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.login_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    login_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address character varying(45),
    user_agent text,
    success boolean NOT NULL,
    failure_reason character varying(100),
    mac_address character varying(255),
    login_method character varying(20) DEFAULT 'local'::character varying
);


ALTER TABLE public.login_history OWNER TO "user";

--
-- Name: login_history_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.login_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.login_history_id_seq OWNER TO "user";

--
-- Name: login_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.login_history_id_seq OWNED BY public.login_history.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.password_reset_tokens (
    id integer NOT NULL,
    token character varying(255) NOT NULL,
    user_id integer NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_used boolean DEFAULT false NOT NULL
);


ALTER TABLE public.password_reset_tokens OWNER TO "user";

--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_reset_tokens_id_seq OWNER TO "user";

--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;


--
-- Name: persons; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.persons (
    id integer NOT NULL,
    full_name character varying(200) NOT NULL,
    country_iso_code character varying(10),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.persons OWNER TO "user";

--
-- Name: persons_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.persons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.persons_id_seq OWNER TO "user";

--
-- Name: persons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.persons_id_seq OWNED BY public.persons.id;


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.refresh_tokens (
    id integer NOT NULL,
    token character varying(255) NOT NULL,
    user_id integer NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_revoked boolean DEFAULT false NOT NULL,
    ip_address character varying(45),
    user_agent text,
    last_used_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    mac_address character varying(255)
);


ALTER TABLE public.refresh_tokens OWNER TO "user";

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.refresh_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.refresh_tokens_id_seq OWNER TO "user";

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;


--
-- Name: sport_events; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.sport_events (
    id bigint NOT NULL,
    arena_uuid uuid NOT NULL,
    name character varying(255) NOT NULL,
    start_date date,
    end_date date,
    country_iso_code character(3),
    address_locality character varying(100),
    is_individual_event boolean,
    is_team_event boolean,
    is_beach_wrestling boolean,
    tournament_type character varying(50),
    event_type character varying(50),
    continent character varying(50),
    timezone character varying(50),
    visible boolean,
    is_sync_enabled boolean,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    sync_timestamp timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sport_events OWNER TO "user";

--
-- Name: sport_events_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.sport_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sport_events_id_seq OWNER TO "user";

--
-- Name: sport_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.sport_events_id_seq OWNED BY public.sport_events.id;


--
-- Name: sync_logs; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.sync_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    finished_at timestamp with time zone,
    status character varying(20) DEFAULT 'in_progress'::character varying NOT NULL,
    duration_seconds integer,
    events_created integer DEFAULT 0,
    events_updated integer DEFAULT 0,
    athletes_created integer DEFAULT 0,
    athletes_updated integer DEFAULT 0,
    teams_created integer DEFAULT 0,
    teams_updated integer DEFAULT 0,
    weight_categories_created integer DEFAULT 0,
    weight_categories_updated integer DEFAULT 0,
    fights_created integer DEFAULT 0,
    fights_updated integer DEFAULT 0,
    error_message text,
    details jsonb,
    ip_address character varying(45)
);


ALTER TABLE public.sync_logs OWNER TO "user";

--
-- Name: sync_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.sync_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sync_logs_id_seq OWNER TO "user";

--
-- Name: sync_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.sync_logs_id_seq OWNED BY public.sync_logs.id;


--
-- Name: teams; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.teams (
    id integer NOT NULL,
    uid uuid NOT NULL,
    sport_event_id integer NOT NULL,
    name character varying(100) NOT NULL,
    alternate_name character(3),
    athlete_count integer,
    final_rank integer,
    country_iso_code character(3),
    sync_timestamp timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.teams OWNER TO "user";

--
-- Name: teams_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.teams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.teams_id_seq OWNER TO "user";

--
-- Name: teams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.teams_id_seq OWNED BY public.teams.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.users (
    id integer NOT NULL,
    uid uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(50) NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(20) DEFAULT 'user'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    avatar_url character varying(500),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_verified boolean DEFAULT false NOT NULL
);


ALTER TABLE public.users OWNER TO "user";

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO "user";

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: victory_types; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.victory_types (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    type character varying(100),
    sync_timestamp timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.victory_types OWNER TO "user";

--
-- Name: victory_types_new_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.victory_types_new_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.victory_types_new_id_seq OWNER TO "user";

--
-- Name: victory_types_new_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.victory_types_new_id_seq OWNED BY public.victory_types.id;


--
-- Name: weight_categories; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.weight_categories (
    id integer NOT NULL,
    uid uuid NOT NULL,
    discipline_id integer,
    max_weight integer,
    count_fighters integer,
    is_started boolean,
    is_completed boolean,
    sport_event_id integer,
    sync_timestamp timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.weight_categories OWNER TO "user";

--
-- Name: weight_categories_new_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.weight_categories_new_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.weight_categories_new_id_seq OWNER TO "user";

--
-- Name: weight_categories_new_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.weight_categories_new_id_seq OWNED BY public.weight_categories.id;


--
-- Name: arena_sources id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.arena_sources ALTER COLUMN id SET DEFAULT nextval('public.arena_sources_id_seq'::regclass);


--
-- Name: athletes id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.athletes ALTER COLUMN id SET DEFAULT nextval('public.athletes_new_id_seq'::regclass);


--
-- Name: disciplines id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.disciplines ALTER COLUMN id SET DEFAULT nextval('public.disciplines_id_seq'::regclass);


--
-- Name: email_verification_tokens id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.email_verification_tokens ALTER COLUMN id SET DEFAULT nextval('public.email_verification_tokens_id_seq'::regclass);


--
-- Name: fights id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.fights ALTER COLUMN id SET DEFAULT nextval('public.fights_id_seq'::regclass);


--
-- Name: login_history id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.login_history ALTER COLUMN id SET DEFAULT nextval('public.login_history_id_seq'::regclass);


--
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);


--
-- Name: persons id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.persons ALTER COLUMN id SET DEFAULT nextval('public.persons_id_seq'::regclass);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);


--
-- Name: sport_events id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.sport_events ALTER COLUMN id SET DEFAULT nextval('public.sport_events_id_seq'::regclass);


--
-- Name: sync_logs id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.sync_logs ALTER COLUMN id SET DEFAULT nextval('public.sync_logs_id_seq'::regclass);


--
-- Name: teams id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.teams ALTER COLUMN id SET DEFAULT nextval('public.teams_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: victory_types id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.victory_types ALTER COLUMN id SET DEFAULT nextval('public.victory_types_new_id_seq'::regclass);


--
-- Name: weight_categories id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.weight_categories ALTER COLUMN id SET DEFAULT nextval('public.weight_categories_new_id_seq'::regclass);


--
-- Name: arena_sources arena_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.arena_sources
    ADD CONSTRAINT arena_sources_pkey PRIMARY KEY (id);


--
-- Name: athletes athletes_new_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.athletes
    ADD CONSTRAINT athletes_new_pkey PRIMARY KEY (id);


--
-- Name: disciplines disciplines_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.disciplines
    ADD CONSTRAINT disciplines_pkey PRIMARY KEY (id);


--
-- Name: disciplines disciplines_sport_id_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.disciplines
    ADD CONSTRAINT disciplines_sport_id_key UNIQUE (sport_id);


--
-- Name: email_verification_tokens email_verification_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (id);


--
-- Name: email_verification_tokens email_verification_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_token_key UNIQUE (token);


--
-- Name: fights fights_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.fights
    ADD CONSTRAINT fights_pkey PRIMARY KEY (id);


--
-- Name: login_history login_history_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- Name: persons persons_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_key UNIQUE (token);


--
-- Name: sport_events sport_events_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.sport_events
    ADD CONSTRAINT sport_events_pkey PRIMARY KEY (id);


--
-- Name: sync_logs sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.sync_logs
    ADD CONSTRAINT sync_logs_pkey PRIMARY KEY (id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: athletes uq_athlete_event_person_wc; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.athletes
    ADD CONSTRAINT uq_athlete_event_person_wc UNIQUE (sport_event_id, person_id, weight_category_id);


--
-- Name: sport_events uq_sport_event_natural_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.sport_events
    ADD CONSTRAINT uq_sport_event_natural_key UNIQUE (name, start_date, country_iso_code);


--
-- Name: teams uq_team_event_name; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT uq_team_event_name UNIQUE (sport_event_id, name);


--
-- Name: weight_categories uq_wc_event_weight_discipline; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.weight_categories
    ADD CONSTRAINT uq_wc_event_weight_discipline UNIQUE (sport_event_id, max_weight, discipline_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_uid_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_uid_key UNIQUE (uid);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: victory_types victory_types_new_code_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.victory_types
    ADD CONSTRAINT victory_types_new_code_key UNIQUE (code);


--
-- Name: victory_types victory_types_new_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.victory_types
    ADD CONSTRAINT victory_types_new_pkey PRIMARY KEY (id);


--
-- Name: weight_categories weight_categories_new_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.weight_categories
    ADD CONSTRAINT weight_categories_new_pkey PRIMARY KEY (id);


--
-- Name: idx_email_verification_tokens_token; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_email_verification_tokens_token ON public.email_verification_tokens USING btree (token);


--
-- Name: idx_email_verification_tokens_user_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_email_verification_tokens_user_id ON public.email_verification_tokens USING btree (user_id);


--
-- Name: idx_login_history_login_at; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_login_history_login_at ON public.login_history USING btree (login_at);


--
-- Name: idx_login_history_user_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_login_history_user_id ON public.login_history USING btree (user_id);


--
-- Name: idx_password_reset_tokens_token; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens USING btree (token);


--
-- Name: idx_password_reset_tokens_user_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens USING btree (user_id);


--
-- Name: idx_persons_full_name; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_persons_full_name ON public.persons USING btree (full_name);


--
-- Name: idx_refresh_tokens_expires_at; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_refresh_tokens_expires_at ON public.refresh_tokens USING btree (expires_at);


--
-- Name: idx_refresh_tokens_token; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_refresh_tokens_token ON public.refresh_tokens USING btree (token);


--
-- Name: idx_refresh_tokens_user_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id);


--
-- Name: idx_sync_logs_started_at; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_sync_logs_started_at ON public.sync_logs USING btree (started_at DESC);


--
-- Name: idx_sync_logs_user_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_sync_logs_user_id ON public.sync_logs USING btree (user_id);


--
-- Name: ix_sport_events_arena_uuid; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX ix_sport_events_arena_uuid ON public.sport_events USING btree (arena_uuid);


--
-- Name: uq_fight_event_fighters_wc; Type: INDEX; Schema: public; Owner: user
--

CREATE UNIQUE INDEX uq_fight_event_fighters_wc ON public.fights USING btree (sport_event_id, LEAST(fighter_one_id, fighter_two_id), GREATEST(fighter_one_id, fighter_two_id), weight_category_id) WHERE ((fighter_one_id IS NOT NULL) AND (fighter_two_id IS NOT NULL));


--
-- Name: uq_person_name_country; Type: INDEX; Schema: public; Owner: user
--

CREATE UNIQUE INDEX uq_person_name_country ON public.persons USING btree (full_name, COALESCE(country_iso_code, ''::character varying));


--
-- Name: athletes athletes_new_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.athletes
    ADD CONSTRAINT athletes_new_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE SET NULL;


--
-- Name: athletes athletes_new_sport_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.athletes
    ADD CONSTRAINT athletes_new_sport_event_id_fkey FOREIGN KEY (sport_event_id) REFERENCES public.sport_events(id) ON DELETE CASCADE;


--
-- Name: athletes athletes_new_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.athletes
    ADD CONSTRAINT athletes_new_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: athletes athletes_new_weight_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.athletes
    ADD CONSTRAINT athletes_new_weight_category_id_fkey FOREIGN KEY (weight_category_id) REFERENCES public.weight_categories(id) ON DELETE SET NULL;


--
-- Name: email_verification_tokens email_verification_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: fights fights_fighter_one_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.fights
    ADD CONSTRAINT fights_fighter_one_id_fkey FOREIGN KEY (fighter_one_id) REFERENCES public.athletes(id) ON DELETE CASCADE;


--
-- Name: fights fights_fighter_two_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.fights
    ADD CONSTRAINT fights_fighter_two_id_fkey FOREIGN KEY (fighter_two_id) REFERENCES public.athletes(id) ON DELETE CASCADE;


--
-- Name: fights fights_sport_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.fights
    ADD CONSTRAINT fights_sport_event_id_fkey FOREIGN KEY (sport_event_id) REFERENCES public.sport_events(id) ON DELETE CASCADE;


--
-- Name: fights fights_weight_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.fights
    ADD CONSTRAINT fights_weight_category_id_fkey FOREIGN KEY (weight_category_id) REFERENCES public.weight_categories(id) ON DELETE SET NULL;


--
-- Name: fights fights_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.fights
    ADD CONSTRAINT fights_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.athletes(id) ON DELETE SET NULL;


--
-- Name: teams fk_team_sport_event; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT fk_team_sport_event FOREIGN KEY (sport_event_id) REFERENCES public.sport_events(id) ON DELETE CASCADE;


--
-- Name: fights fk_victory_type; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.fights
    ADD CONSTRAINT fk_victory_type FOREIGN KEY (victory_type) REFERENCES public.victory_types(code) ON DELETE SET NULL;


--
-- Name: login_history login_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sync_logs sync_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.sync_logs
    ADD CONSTRAINT sync_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: weight_categories weight_categories_new_discipline_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.weight_categories
    ADD CONSTRAINT weight_categories_new_discipline_id_fkey FOREIGN KEY (discipline_id) REFERENCES public.disciplines(id) ON DELETE SET NULL;


--
-- Name: weight_categories weight_categories_new_sport_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.weight_categories
    ADD CONSTRAINT weight_categories_new_sport_event_id_fkey FOREIGN KEY (sport_event_id) REFERENCES public.sport_events(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict dNAUra6FHfZSgLClCNhR4fdskCHgFFSuACkSTd8lTF4UJhucXVu9pEoFv46FKS7

