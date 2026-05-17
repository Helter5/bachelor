--
-- PostgreSQL database dump
--

\restrict XM4OCcoeXS83fXbEKGNvzXR2cPRko24RlXDdG0uOONr41nHQvMy6xQIDCx4rr0N

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

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

ALTER TABLE IF EXISTS ONLY public.weight_categories DROP CONSTRAINT IF EXISTS weight_categories_sport_event_id_fkey;
ALTER TABLE IF EXISTS ONLY public.weight_categories DROP CONSTRAINT IF EXISTS weight_categories_discipline_id_fkey;
ALTER TABLE IF EXISTS ONLY public.teams DROP CONSTRAINT IF EXISTS teams_sport_event_id_fkey;
ALTER TABLE IF EXISTS ONLY public.sync_logs DROP CONSTRAINT IF EXISTS sync_logs_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.referees DROP CONSTRAINT IF EXISTS referees_team_id_fkey;
ALTER TABLE IF EXISTS ONLY public.referees DROP CONSTRAINT IF EXISTS referees_sport_event_id_fkey;
ALTER TABLE IF EXISTS ONLY public.referees DROP CONSTRAINT IF EXISTS referees_person_id_fkey;
ALTER TABLE IF EXISTS ONLY public.password_reset_tokens DROP CONSTRAINT IF EXISTS password_reset_tokens_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.login_history DROP CONSTRAINT IF EXISTS login_history_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.fights DROP CONSTRAINT IF EXISTS fights_winner_id_fkey;
ALTER TABLE IF EXISTS ONLY public.fights DROP CONSTRAINT IF EXISTS fights_weight_category_id_fkey;
ALTER TABLE IF EXISTS ONLY public.fights DROP CONSTRAINT IF EXISTS fights_victory_type_fkey;
ALTER TABLE IF EXISTS ONLY public.fights DROP CONSTRAINT IF EXISTS fights_sport_event_id_fkey;
ALTER TABLE IF EXISTS ONLY public.fights DROP CONSTRAINT IF EXISTS fights_fighter_two_id_fkey;
ALTER TABLE IF EXISTS ONLY public.fights DROP CONSTRAINT IF EXISTS fights_fighter_one_id_fkey;
ALTER TABLE IF EXISTS ONLY public.email_verification_tokens DROP CONSTRAINT IF EXISTS email_verification_tokens_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.athletes DROP CONSTRAINT IF EXISTS athletes_weight_category_id_fkey;
ALTER TABLE IF EXISTS ONLY public.athletes DROP CONSTRAINT IF EXISTS athletes_team_id_fkey;
ALTER TABLE IF EXISTS ONLY public.athletes DROP CONSTRAINT IF EXISTS athletes_sport_event_id_fkey;
ALTER TABLE IF EXISTS ONLY public.athletes DROP CONSTRAINT IF EXISTS athletes_person_id_fkey;
ALTER TABLE IF EXISTS ONLY public.arena_sources DROP CONSTRAINT IF EXISTS arena_sources_user_id_fkey;
DROP INDEX IF EXISTS public.ix_users_username;
DROP INDEX IF EXISTS public.ix_users_email;
DROP INDEX IF EXISTS public.ix_refresh_tokens_user_id;
DROP INDEX IF EXISTS public.ix_refresh_tokens_token;
DROP INDEX IF EXISTS public.ix_persons_last_name;
DROP INDEX IF EXISTS public.ix_persons_first_name;
DROP INDEX IF EXISTS public.ix_password_reset_tokens_user_id;
DROP INDEX IF EXISTS public.ix_password_reset_tokens_token;
DROP INDEX IF EXISTS public.ix_login_history_user_id;
DROP INDEX IF EXISTS public.ix_email_verification_tokens_user_id;
DROP INDEX IF EXISTS public.ix_email_verification_tokens_token;
DROP INDEX IF EXISTS public.ix_arena_sources_user_id;
ALTER TABLE IF EXISTS ONLY public.weight_categories DROP CONSTRAINT IF EXISTS weight_categories_pkey;
ALTER TABLE IF EXISTS ONLY public.victory_types DROP CONSTRAINT IF EXISTS victory_types_pkey;
ALTER TABLE IF EXISTS ONLY public.victory_types DROP CONSTRAINT IF EXISTS victory_types_code_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_uid_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.weight_categories DROP CONSTRAINT IF EXISTS uq_wc_event_weight_discipline;
ALTER TABLE IF EXISTS ONLY public.teams DROP CONSTRAINT IF EXISTS uq_team_event_name;
ALTER TABLE IF EXISTS ONLY public.sport_events DROP CONSTRAINT IF EXISTS uq_sport_event_natural_key;
ALTER TABLE IF EXISTS ONLY public.referees DROP CONSTRAINT IF EXISTS uq_referee_event_person;
ALTER TABLE IF EXISTS ONLY public.persons DROP CONSTRAINT IF EXISTS uq_person_identity;
ALTER TABLE IF EXISTS ONLY public.disciplines DROP CONSTRAINT IF EXISTS uq_disciplines_sport_audience;
ALTER TABLE IF EXISTS ONLY public.athletes DROP CONSTRAINT IF EXISTS uq_athlete_event_person_wc;
ALTER TABLE IF EXISTS ONLY public.teams DROP CONSTRAINT IF EXISTS teams_pkey;
ALTER TABLE IF EXISTS ONLY public.sync_logs DROP CONSTRAINT IF EXISTS sync_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.sport_events DROP CONSTRAINT IF EXISTS sport_events_pkey;
ALTER TABLE IF EXISTS ONLY public.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_pkey;
ALTER TABLE IF EXISTS ONLY public.referees DROP CONSTRAINT IF EXISTS referees_pkey;
ALTER TABLE IF EXISTS ONLY public.persons DROP CONSTRAINT IF EXISTS persons_pkey;
ALTER TABLE IF EXISTS ONLY public.password_reset_tokens DROP CONSTRAINT IF EXISTS password_reset_tokens_pkey;
ALTER TABLE IF EXISTS ONLY public.login_history DROP CONSTRAINT IF EXISTS login_history_pkey;
ALTER TABLE IF EXISTS ONLY public.fights DROP CONSTRAINT IF EXISTS fights_pkey;
ALTER TABLE IF EXISTS ONLY public.email_verification_tokens DROP CONSTRAINT IF EXISTS email_verification_tokens_pkey;
ALTER TABLE IF EXISTS ONLY public.disciplines DROP CONSTRAINT IF EXISTS disciplines_pkey;
ALTER TABLE IF EXISTS ONLY public.athletes DROP CONSTRAINT IF EXISTS athletes_pkey;
ALTER TABLE IF EXISTS ONLY public.arena_sources DROP CONSTRAINT IF EXISTS arena_sources_pkey;
ALTER TABLE IF EXISTS public.weight_categories ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.victory_types ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.teams ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.sync_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.sport_events ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.refresh_tokens ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.referees ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.persons ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.password_reset_tokens ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.login_history ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.fights ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.email_verification_tokens ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.disciplines ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.athletes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.arena_sources ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.weight_categories_id_seq;
DROP TABLE IF EXISTS public.weight_categories;
DROP SEQUENCE IF EXISTS public.victory_types_id_seq;
DROP TABLE IF EXISTS public.victory_types;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.teams_id_seq;
DROP TABLE IF EXISTS public.teams;
DROP SEQUENCE IF EXISTS public.sync_logs_id_seq;
DROP TABLE IF EXISTS public.sync_logs;
DROP SEQUENCE IF EXISTS public.sport_events_id_seq;
DROP TABLE IF EXISTS public.sport_events;
DROP SEQUENCE IF EXISTS public.refresh_tokens_id_seq;
DROP TABLE IF EXISTS public.refresh_tokens;
DROP SEQUENCE IF EXISTS public.referees_id_seq;
DROP TABLE IF EXISTS public.referees;
DROP SEQUENCE IF EXISTS public.persons_id_seq;
DROP TABLE IF EXISTS public.persons;
DROP SEQUENCE IF EXISTS public.password_reset_tokens_id_seq;
DROP TABLE IF EXISTS public.password_reset_tokens;
DROP SEQUENCE IF EXISTS public.login_history_id_seq;
DROP TABLE IF EXISTS public.login_history;
DROP SEQUENCE IF EXISTS public.fights_id_seq;
DROP TABLE IF EXISTS public.fights;
DROP SEQUENCE IF EXISTS public.email_verification_tokens_id_seq;
DROP TABLE IF EXISTS public.email_verification_tokens;
DROP SEQUENCE IF EXISTS public.disciplines_id_seq;
DROP TABLE IF EXISTS public.disciplines;
DROP SEQUENCE IF EXISTS public.athletes_id_seq;
DROP TABLE IF EXISTS public.athletes;
DROP SEQUENCE IF EXISTS public.arena_sources_id_seq;
DROP TABLE IF EXISTS public.arena_sources;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: arena_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.arena_sources (
    id integer NOT NULL,
    name character varying NOT NULL,
    host character varying NOT NULL,
    port integer NOT NULL,
    client_id character varying,
    client_secret character varying,
    api_key character varying,
    is_enabled boolean NOT NULL,
    user_id integer,
    last_sync_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL
);


--
-- Name: arena_sources_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.arena_sources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: arena_sources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.arena_sources_id_seq OWNED BY public.arena_sources.id;


--
-- Name: athletes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.athletes (
    id integer NOT NULL,
    team_id integer,
    sport_event_id integer,
    weight_category_id integer,
    is_competing boolean,
    person_id integer,
    sync_timestamp timestamp without time zone NOT NULL
);


--
-- Name: athletes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.athletes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: athletes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.athletes_id_seq OWNED BY public.athletes.id;


--
-- Name: disciplines; Type: TABLE; Schema: public; Owner: -
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
    sync_timestamp timestamp without time zone NOT NULL
);


--
-- Name: disciplines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.disciplines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: disciplines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.disciplines_id_seq OWNED BY public.disciplines.id;


--
-- Name: email_verification_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_verification_tokens (
    id integer NOT NULL,
    token character varying(255) NOT NULL,
    user_id integer NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone NOT NULL,
    is_used boolean NOT NULL
);


--
-- Name: email_verification_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_verification_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_verification_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_verification_tokens_id_seq OWNED BY public.email_verification_tokens.id;


--
-- Name: fights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fights (
    id integer NOT NULL,
    sport_event_id integer NOT NULL,
    weight_category_id integer,
    fighter_one_id integer,
    fighter_two_id integer,
    winner_id integer,
    tp_one integer,
    tp_two integer,
    cp_one integer,
    cp_two integer,
    victory_type character varying,
    duration integer,
    round_name character varying(100),
    fight_number integer,
    sync_timestamp timestamp without time zone NOT NULL
);


--
-- Name: fights_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fights_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fights_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fights_id_seq OWNED BY public.fights.id;


--
-- Name: login_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    login_at timestamp without time zone NOT NULL,
    ip_address character varying(45),
    user_agent character varying,
    success boolean NOT NULL,
    failure_reason character varying(100),
    login_method character varying(20)
);


--
-- Name: login_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.login_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: login_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.login_history_id_seq OWNED BY public.login_history.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id integer NOT NULL,
    token character varying(255) NOT NULL,
    user_id integer NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone NOT NULL,
    is_used boolean NOT NULL
);


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;


--
-- Name: persons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.persons (
    id integer NOT NULL,
    first_name character varying NOT NULL,
    last_name character varying NOT NULL,
    country_iso_code character varying,
    created_at timestamp without time zone NOT NULL
);


--
-- Name: persons_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.persons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: persons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.persons_id_seq OWNED BY public.persons.id;


--
-- Name: referees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referees (
    id integer NOT NULL,
    sport_event_id integer NOT NULL,
    person_id integer,
    team_id integer,
    number integer,
    referee_level character varying(100),
    referee_group character varying(10),
    delegate boolean NOT NULL,
    matchairman boolean NOT NULL,
    is_referee boolean NOT NULL,
    preferred_style json,
    mat_name character varying(100),
    deactivated boolean NOT NULL,
    sync_timestamp timestamp without time zone NOT NULL
);


--
-- Name: referees_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.referees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: referees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.referees_id_seq OWNED BY public.referees.id;


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id integer NOT NULL,
    token character varying(255) NOT NULL,
    user_id integer NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone NOT NULL,
    is_revoked boolean NOT NULL,
    ip_address character varying(45),
    user_agent character varying,
    last_used_at timestamp without time zone NOT NULL
);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.refresh_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;


--
-- Name: sport_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sport_events (
    id integer NOT NULL,
    name character varying NOT NULL,
    start_date character varying,
    end_date character varying,
    country_iso_code character varying,
    address_locality character varying,
    is_individual_event boolean,
    is_team_event boolean,
    is_beach_wrestling boolean,
    tournament_type character varying,
    event_type character varying,
    continent character varying,
    timezone character varying,
    visible boolean,
    is_sync_enabled boolean,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: sport_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sport_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sport_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sport_events_id_seq OWNED BY public.sport_events.id;


--
-- Name: sync_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    started_at timestamp without time zone NOT NULL,
    finished_at timestamp without time zone,
    status character varying(20) NOT NULL,
    duration_seconds integer,
    events_created integer NOT NULL,
    events_updated integer NOT NULL,
    athletes_created integer NOT NULL,
    athletes_updated integer NOT NULL,
    teams_created integer NOT NULL,
    teams_updated integer NOT NULL,
    weight_categories_created integer NOT NULL,
    weight_categories_updated integer NOT NULL,
    fights_created integer NOT NULL,
    fights_updated integer NOT NULL,
    referees_created integer NOT NULL,
    referees_updated integer NOT NULL,
    error_message character varying,
    details json,
    ip_address character varying(45)
);


--
-- Name: sync_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sync_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sync_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sync_logs_id_seq OWNED BY public.sync_logs.id;


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    id integer NOT NULL,
    sport_event_id integer NOT NULL,
    name character varying NOT NULL,
    alternate_name character varying,
    athlete_count integer,
    final_rank integer,
    country_iso_code character varying,
    sync_timestamp timestamp without time zone NOT NULL
);


--
-- Name: teams_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.teams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: teams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.teams_id_seq OWNED BY public.teams.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    username character varying(50) NOT NULL,
    email character varying NOT NULL,
    uid uuid NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(20) NOT NULL,
    is_active boolean NOT NULL,
    is_verified boolean NOT NULL,
    avatar_url character varying(500),
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: victory_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.victory_types (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    type character varying(100),
    sync_timestamp timestamp without time zone NOT NULL
);


--
-- Name: victory_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.victory_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: victory_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.victory_types_id_seq OWNED BY public.victory_types.id;


--
-- Name: weight_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weight_categories (
    id integer NOT NULL,
    discipline_id integer,
    max_weight integer,
    count_fighters integer,
    is_started boolean,
    is_completed boolean,
    sport_event_id integer,
    sync_timestamp timestamp without time zone NOT NULL
);


--
-- Name: weight_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.weight_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: weight_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.weight_categories_id_seq OWNED BY public.weight_categories.id;


--
-- Name: arena_sources id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arena_sources ALTER COLUMN id SET DEFAULT nextval('public.arena_sources_id_seq'::regclass);


--
-- Name: athletes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athletes ALTER COLUMN id SET DEFAULT nextval('public.athletes_id_seq'::regclass);


--
-- Name: disciplines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disciplines ALTER COLUMN id SET DEFAULT nextval('public.disciplines_id_seq'::regclass);


--
-- Name: email_verification_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verification_tokens ALTER COLUMN id SET DEFAULT nextval('public.email_verification_tokens_id_seq'::regclass);


--
-- Name: fights id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fights ALTER COLUMN id SET DEFAULT nextval('public.fights_id_seq'::regclass);


--
-- Name: login_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_history ALTER COLUMN id SET DEFAULT nextval('public.login_history_id_seq'::regclass);


--
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);


--
-- Name: persons id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons ALTER COLUMN id SET DEFAULT nextval('public.persons_id_seq'::regclass);


--
-- Name: referees id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referees ALTER COLUMN id SET DEFAULT nextval('public.referees_id_seq'::regclass);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);


--
-- Name: sport_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sport_events ALTER COLUMN id SET DEFAULT nextval('public.sport_events_id_seq'::regclass);


--
-- Name: sync_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_logs ALTER COLUMN id SET DEFAULT nextval('public.sync_logs_id_seq'::regclass);


--
-- Name: teams id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams ALTER COLUMN id SET DEFAULT nextval('public.teams_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: victory_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.victory_types ALTER COLUMN id SET DEFAULT nextval('public.victory_types_id_seq'::regclass);


--
-- Name: weight_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weight_categories ALTER COLUMN id SET DEFAULT nextval('public.weight_categories_id_seq'::regclass);


--
-- Data for Name: arena_sources; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.arena_sources (id, name, host, port, client_id, client_secret, api_key, is_enabled, user_id, last_sync_at, created_at) FROM stdin;
\.


--
-- Data for Name: athletes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.athletes (id, team_id, sport_event_id, weight_category_id, is_competing, person_id, sync_timestamp) FROM stdin;
\.


--
-- Data for Name: disciplines; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.disciplines (id, sport_id, sport_name, audience_id, audience_name, rounds_number, round_duration, tournament_type, sync_timestamp) FROM stdin;
\.


--
-- Data for Name: email_verification_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.email_verification_tokens (id, token, user_id, expires_at, created_at, is_used) FROM stdin;
1	01592f1e1955eb2499655254db26ed84274ecd02adf8862d9df7432c5c20a0f2	1	2026-05-16 16:49:22.875412	2026-05-15 16:49:22.87542	f
2	deee3402cba1d6144be8cbdcc1cd6a6cb2cce5e48f57d01e04883cd861796fec	2	2026-05-16 16:49:23.110799	2026-05-15 16:49:23.110803	f
\.


--
-- Data for Name: fights; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fights (id, sport_event_id, weight_category_id, fighter_one_id, fighter_two_id, winner_id, tp_one, tp_two, cp_one, cp_two, victory_type, duration, round_name, fight_number, sync_timestamp) FROM stdin;
\.


--
-- Data for Name: login_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.login_history (id, user_id, login_at, ip_address, user_agent, success, failure_reason, login_method) FROM stdin;
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.password_reset_tokens (id, token, user_id, expires_at, created_at, is_used) FROM stdin;
\.


--
-- Data for Name: persons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.persons (id, first_name, last_name, country_iso_code, created_at) FROM stdin;
\.


--
-- Data for Name: referees; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.referees (id, sport_event_id, person_id, team_id, number, referee_level, referee_group, delegate, matchairman, is_referee, preferred_style, mat_name, deactivated, sync_timestamp) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refresh_tokens (id, token, user_id, expires_at, created_at, is_revoked, ip_address, user_agent, last_used_at) FROM stdin;
\.


--
-- Data for Name: sport_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sport_events (id, name, start_date, end_date, country_iso_code, address_locality, is_individual_event, is_team_event, is_beach_wrestling, tournament_type, event_type, continent, timezone, visible, is_sync_enabled, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sync_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sync_logs (id, user_id, started_at, finished_at, status, duration_seconds, events_created, events_updated, athletes_created, athletes_updated, teams_created, teams_updated, weight_categories_created, weight_categories_updated, fights_created, fights_updated, referees_created, referees_updated, error_message, details, ip_address) FROM stdin;
\.


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.teams (id, sport_event_id, name, alternate_name, athlete_count, final_rank, country_iso_code, sync_timestamp) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, first_name, last_name, username, email, uid, password_hash, role, is_active, is_verified, avatar_url, created_at, updated_at) FROM stdin;
1	Test	User	user	user@example.com	4f77c405-8559-47c0-b141-471f9935ef59	$2b$12$Ra92kmWOfgvk8nlsbrJR5edrd9/h7Pj.Wkos7JFrwPG65ZPy4R6EC	user	t	t	\N	2026-05-15 16:49:22.868596	2026-05-15 16:49:22.86862
2	Test	Admin	admin	admin@example.com	a86f7eeb-c16f-4217-8a83-93ca3d0c9261	$2b$12$VC2okAiYnt0rKA/4wDYnb.CHjmZjJjL1pdSYvcb/lf4qM2o4sZLDa	admin	t	t	\N	2026-05-15 16:49:23.108518	2026-05-15 16:49:23.108527
\.


--
-- Data for Name: victory_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.victory_types (id, code, type, sync_timestamp) FROM stdin;
\.


--
-- Data for Name: weight_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.weight_categories (id, discipline_id, max_weight, count_fighters, is_started, is_completed, sport_event_id, sync_timestamp) FROM stdin;
\.


--
-- Name: arena_sources_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.arena_sources_id_seq', 1, false);


--
-- Name: athletes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.athletes_id_seq', 1, false);


--
-- Name: disciplines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.disciplines_id_seq', 1, false);


--
-- Name: email_verification_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.email_verification_tokens_id_seq', 2, true);


--
-- Name: fights_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fights_id_seq', 1, false);


--
-- Name: login_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.login_history_id_seq', 1, false);


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.password_reset_tokens_id_seq', 1, false);


--
-- Name: persons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.persons_id_seq', 1, false);


--
-- Name: referees_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.referees_id_seq', 1, false);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.refresh_tokens_id_seq', 1, false);


--
-- Name: sport_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sport_events_id_seq', 1, false);


--
-- Name: sync_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sync_logs_id_seq', 1, false);


--
-- Name: teams_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.teams_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


--
-- Name: victory_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.victory_types_id_seq', 1, false);


--
-- Name: weight_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.weight_categories_id_seq', 1, false);


--
-- Name: arena_sources arena_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arena_sources
    ADD CONSTRAINT arena_sources_pkey PRIMARY KEY (id);


--
-- Name: athletes athletes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athletes
    ADD CONSTRAINT athletes_pkey PRIMARY KEY (id);


--
-- Name: disciplines disciplines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disciplines
    ADD CONSTRAINT disciplines_pkey PRIMARY KEY (id);


--
-- Name: email_verification_tokens email_verification_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (id);


--
-- Name: fights fights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fights
    ADD CONSTRAINT fights_pkey PRIMARY KEY (id);


--
-- Name: login_history login_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: persons persons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_pkey PRIMARY KEY (id);


--
-- Name: referees referees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referees
    ADD CONSTRAINT referees_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: sport_events sport_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sport_events
    ADD CONSTRAINT sport_events_pkey PRIMARY KEY (id);


--
-- Name: sync_logs sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_logs
    ADD CONSTRAINT sync_logs_pkey PRIMARY KEY (id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: athletes uq_athlete_event_person_wc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athletes
    ADD CONSTRAINT uq_athlete_event_person_wc UNIQUE (sport_event_id, person_id, weight_category_id);


--
-- Name: disciplines uq_disciplines_sport_audience; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disciplines
    ADD CONSTRAINT uq_disciplines_sport_audience UNIQUE (sport_id, audience_id);


--
-- Name: persons uq_person_identity; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT uq_person_identity UNIQUE (first_name, last_name, country_iso_code);


--
-- Name: referees uq_referee_event_person; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referees
    ADD CONSTRAINT uq_referee_event_person UNIQUE (sport_event_id, person_id);


--
-- Name: sport_events uq_sport_event_natural_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sport_events
    ADD CONSTRAINT uq_sport_event_natural_key UNIQUE (name, start_date, country_iso_code);


--
-- Name: teams uq_team_event_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT uq_team_event_name UNIQUE (sport_event_id, name);


--
-- Name: weight_categories uq_wc_event_weight_discipline; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weight_categories
    ADD CONSTRAINT uq_wc_event_weight_discipline UNIQUE (sport_event_id, max_weight, discipline_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_uid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_uid_key UNIQUE (uid);


--
-- Name: victory_types victory_types_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.victory_types
    ADD CONSTRAINT victory_types_code_key UNIQUE (code);


--
-- Name: victory_types victory_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.victory_types
    ADD CONSTRAINT victory_types_pkey PRIMARY KEY (id);


--
-- Name: weight_categories weight_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weight_categories
    ADD CONSTRAINT weight_categories_pkey PRIMARY KEY (id);


--
-- Name: ix_arena_sources_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_arena_sources_user_id ON public.arena_sources USING btree (user_id);


--
-- Name: ix_email_verification_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_email_verification_tokens_token ON public.email_verification_tokens USING btree (token);


--
-- Name: ix_email_verification_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_email_verification_tokens_user_id ON public.email_verification_tokens USING btree (user_id);


--
-- Name: ix_login_history_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_login_history_user_id ON public.login_history USING btree (user_id);


--
-- Name: ix_password_reset_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_password_reset_tokens_token ON public.password_reset_tokens USING btree (token);


--
-- Name: ix_password_reset_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_password_reset_tokens_user_id ON public.password_reset_tokens USING btree (user_id);


--
-- Name: ix_persons_first_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_persons_first_name ON public.persons USING btree (first_name);


--
-- Name: ix_persons_last_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_persons_last_name ON public.persons USING btree (last_name);


--
-- Name: ix_refresh_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_refresh_tokens_token ON public.refresh_tokens USING btree (token);


--
-- Name: ix_refresh_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- Name: arena_sources arena_sources_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arena_sources
    ADD CONSTRAINT arena_sources_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: athletes athletes_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athletes
    ADD CONSTRAINT athletes_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id);


--
-- Name: athletes athletes_sport_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athletes
    ADD CONSTRAINT athletes_sport_event_id_fkey FOREIGN KEY (sport_event_id) REFERENCES public.sport_events(id);


--
-- Name: athletes athletes_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athletes
    ADD CONSTRAINT athletes_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: athletes athletes_weight_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athletes
    ADD CONSTRAINT athletes_weight_category_id_fkey FOREIGN KEY (weight_category_id) REFERENCES public.weight_categories(id);


--
-- Name: email_verification_tokens email_verification_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: fights fights_fighter_one_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fights
    ADD CONSTRAINT fights_fighter_one_id_fkey FOREIGN KEY (fighter_one_id) REFERENCES public.athletes(id);


--
-- Name: fights fights_fighter_two_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fights
    ADD CONSTRAINT fights_fighter_two_id_fkey FOREIGN KEY (fighter_two_id) REFERENCES public.athletes(id);


--
-- Name: fights fights_sport_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fights
    ADD CONSTRAINT fights_sport_event_id_fkey FOREIGN KEY (sport_event_id) REFERENCES public.sport_events(id);


--
-- Name: fights fights_victory_type_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fights
    ADD CONSTRAINT fights_victory_type_fkey FOREIGN KEY (victory_type) REFERENCES public.victory_types(code);


--
-- Name: fights fights_weight_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fights
    ADD CONSTRAINT fights_weight_category_id_fkey FOREIGN KEY (weight_category_id) REFERENCES public.weight_categories(id);


--
-- Name: fights fights_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fights
    ADD CONSTRAINT fights_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.athletes(id);


--
-- Name: login_history login_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: referees referees_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referees
    ADD CONSTRAINT referees_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id);


--
-- Name: referees referees_sport_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referees
    ADD CONSTRAINT referees_sport_event_id_fkey FOREIGN KEY (sport_event_id) REFERENCES public.sport_events(id);


--
-- Name: referees referees_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referees
    ADD CONSTRAINT referees_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: sync_logs sync_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_logs
    ADD CONSTRAINT sync_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: teams teams_sport_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_sport_event_id_fkey FOREIGN KEY (sport_event_id) REFERENCES public.sport_events(id);


--
-- Name: weight_categories weight_categories_discipline_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weight_categories
    ADD CONSTRAINT weight_categories_discipline_id_fkey FOREIGN KEY (discipline_id) REFERENCES public.disciplines(id);


--
-- Name: weight_categories weight_categories_sport_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weight_categories
    ADD CONSTRAINT weight_categories_sport_event_id_fkey FOREIGN KEY (sport_event_id) REFERENCES public.sport_events(id);


--
-- PostgreSQL database dump complete
--

\unrestrict XM4OCcoeXS83fXbEKGNvzXR2cPRko24RlXDdG0uOONr41nHQvMy6xQIDCx4rr0N

