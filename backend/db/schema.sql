--
-- PostgreSQL database dump
--

\restrict oQu7rry9av1rInKS6OqiEr0gOZBmSp0lSxWE1upccXFWSgPU0PtTdajLWER449T

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: arena_sources; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.arena_sources (
    name character varying NOT NULL,
    host character varying NOT NULL,
    port integer NOT NULL,
    client_id character varying,
    client_secret character varying,
    api_key character varying,
    is_enabled boolean NOT NULL,
    id integer NOT NULL,
    user_id integer,
    last_sync_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL
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
-- Name: athlete_source_uids; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.athlete_source_uids (
    id integer NOT NULL,
    athlete_id integer NOT NULL,
    arena_source_id integer NOT NULL,
    arena_uuid uuid NOT NULL
);


ALTER TABLE public.athlete_source_uids OWNER TO "user";

--
-- Name: athlete_source_uids_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.athlete_source_uids_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.athlete_source_uids_id_seq OWNER TO "user";

--
-- Name: athlete_source_uids_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.athlete_source_uids_id_seq OWNED BY public.athlete_source_uids.id;


--
-- Name: athletes; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.athletes (
    team_id integer,
    sport_event_id integer,
    weight_category_id integer,
    is_competing boolean,
    uid uuid NOT NULL,
    person_id integer,
    id integer NOT NULL,
    sync_timestamp timestamp without time zone NOT NULL
);


ALTER TABLE public.athletes OWNER TO "user";

--
-- Name: athletes_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.athletes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.athletes_id_seq OWNER TO "user";

--
-- Name: athletes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.athletes_id_seq OWNED BY public.athletes.id;


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
    sync_timestamp timestamp without time zone NOT NULL
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
-- Name: fights; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.fights (
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
    victory_type character varying,
    duration integer,
    id integer NOT NULL,
    sync_timestamp timestamp without time zone NOT NULL
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
    login_at timestamp without time zone NOT NULL,
    ip_address character varying(45),
    user_agent character varying,
    mac_address character varying(255),
    success boolean NOT NULL,
    failure_reason character varying(100),
    login_method character varying(20)
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
-- Name: persons; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.persons (
    full_name character varying NOT NULL,
    country_iso_code character varying,
    id integer NOT NULL,
    created_at timestamp without time zone NOT NULL
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
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone NOT NULL,
    is_revoked boolean NOT NULL,
    ip_address character varying(45),
    user_agent character varying,
    mac_address character varying(255),
    last_used_at timestamp without time zone NOT NULL
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
-- Name: sport_event_source_uids; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.sport_event_source_uids (
    id integer NOT NULL,
    sport_event_id integer NOT NULL,
    arena_source_id integer NOT NULL,
    source_uuid uuid NOT NULL
);


ALTER TABLE public.sport_event_source_uids OWNER TO "user";

--
-- Name: sport_event_source_uids_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.sport_event_source_uids_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sport_event_source_uids_id_seq OWNER TO "user";

--
-- Name: sport_event_source_uids_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.sport_event_source_uids_id_seq OWNED BY public.sport_event_source_uids.id;


--
-- Name: sport_events; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.sport_events (
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
    id integer NOT NULL,
    arena_uuid uuid NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.sport_events OWNER TO "user";

--
-- Name: sport_events_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.sport_events_id_seq
    AS integer
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
    error_message character varying,
    details json,
    ip_address character varying(45),
    id integer NOT NULL
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
    uid uuid NOT NULL,
    sport_event_id integer NOT NULL,
    name character varying NOT NULL,
    alternate_name character varying,
    athlete_count integer,
    final_rank integer,
    country_iso_code character varying,
    id integer NOT NULL,
    sync_timestamp timestamp without time zone NOT NULL
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
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    id integer NOT NULL,
    uid uuid NOT NULL,
    username character varying(50) NOT NULL,
    email character varying NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(20) NOT NULL,
    is_active boolean NOT NULL,
    is_verified boolean NOT NULL,
    avatar_url character varying(500),
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
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
    sync_timestamp timestamp without time zone NOT NULL
);


ALTER TABLE public.victory_types OWNER TO "user";

--
-- Name: victory_types_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.victory_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.victory_types_id_seq OWNER TO "user";

--
-- Name: victory_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.victory_types_id_seq OWNED BY public.victory_types.id;


--
-- Name: weight_categories; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.weight_categories (
    uid uuid NOT NULL,
    discipline_id integer,
    max_weight integer,
    count_fighters integer,
    is_started boolean,
    is_completed boolean,
    sport_event_id integer,
    id integer NOT NULL,
    sync_timestamp timestamp without time zone NOT NULL
);


ALTER TABLE public.weight_categories OWNER TO "user";

--
-- Name: weight_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.weight_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.weight_categories_id_seq OWNER TO "user";

--
-- Name: weight_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.weight_categories_id_seq OWNED BY public.weight_categories.id;


--
-- Name: weight_category_source_uids; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.weight_category_source_uids (
    id integer NOT NULL,
    weight_category_id integer NOT NULL,
    arena_source_id integer NOT NULL,
    arena_uuid uuid NOT NULL
);


ALTER TABLE public.weight_category_source_uids OWNER TO "user";

--
-- Name: weight_category_source_uids_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.weight_category_source_uids_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.weight_category_source_uids_id_seq OWNER TO "user";

--
-- Name: weight_category_source_uids_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.weight_category_source_uids_id_seq OWNED BY public.weight_category_source_uids.id;


--
-- Name: arena_sources id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.arena_sources ALTER COLUMN id SET DEFAULT nextval('public.arena_sources_id_seq'::regclass);


--
-- Name: athlete_source_uids id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.athlete_source_uids ALTER COLUMN id SET DEFAULT nextval('public.athlete_source_uids_id_seq'::regclass);


--
-- Name: athletes id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.athletes ALTER COLUMN id SET DEFAULT nextval('public.athletes_id_seq'::regclass);


--
-- Name: disciplines id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.disciplines ALTER COLUMN id SET DEFAULT nextval('public.disciplines_id_seq'::regclass);


--
-- Name: fights id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.fights ALTER COLUMN id SET DEFAULT nextval('public.fights_id_seq'::regclass);


--
-- Name: login_history id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.login_history ALTER COLUMN id SET DEFAULT nextval('public.login_history_id_seq'::regclass);


--
-- Name: persons id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.persons ALTER COLUMN id SET DEFAULT nextval('public.persons_id_seq'::regclass);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);


--
-- Name: sport_event_source_uids id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.sport_event_source_uids ALTER COLUMN id SET DEFAULT nextval('public.sport_event_source_uids_id_seq'::regclass);


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

ALTER TABLE ONLY public.victory_types ALTER COLUMN id SET DEFAULT nextval('public.victory_types_id_seq'::regclass);


--
-- Name: weight_categories id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.weight_categories ALTER COLUMN id SET DEFAULT nextval('public.weight_categories_id_seq'::regclass);


--
-- Name: weight_category_source_uids id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.weight_category_source_uids ALTER COLUMN id SET DEFAULT nextval('public.weight_category_source_uids_id_seq'::regclass);


--
-- Name: arena_sources arena_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.arena_sources
    ADD CONSTRAINT arena_sources_pkey PRIMARY KEY (id);


--
-- Name: athlete_source_uids athlete_source_uids_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.athlete_source_uids
    ADD CONSTRAINT athlete_source_uids_pkey PRIMARY KEY (id);


--
-- Name: athletes athletes_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.athletes
    ADD CONSTRAINT athletes_pkey PRIMARY KEY (id);


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
-- Name: sport_event_source_uids sport_event_source_uids_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.sport_event_source_uids
    ADD CONSTRAINT sport_event_source_uids_pkey PRIMARY KEY (id);


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
-- Name: athlete_source_uids uq_athlete_source_uuid; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.athlete_source_uids
    ADD CONSTRAINT uq_athlete_source_uuid UNIQUE (arena_source_id, arena_uuid);


--
-- Name: sport_event_source_uids uq_event_source_uuid; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.sport_event_source_uids
    ADD CONSTRAINT uq_event_source_uuid UNIQUE (arena_source_id, source_uuid);


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
-- Name: weight_category_source_uids uq_wc_source_uuid; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.weight_category_source_uids
    ADD CONSTRAINT uq_wc_source_uuid UNIQUE (arena_source_id, arena_uuid);


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
-- Name: victory_types victory_types_code_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.victory_types
    ADD CONSTRAINT victory_types_code_key UNIQUE (code);


--
-- Name: victory_types victory_types_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.victory_types
    ADD CONSTRAINT victory_types_pkey PRIMARY KEY (id);


--
-- Name: weight_categories weight_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.weight_categories
    ADD CONSTRAINT weight_categories_pkey PRIMARY KEY (id);


--
-- Name: weight_category_source_uids weight_category_source_uids_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.weight_category_source_uids
    ADD CONSTRAINT weight_category_source_uids_pkey PRIMARY KEY (id);


--
-- Name: ix_arena_sources_user_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX ix_arena_sources_user_id ON public.arena_sources USING btree (user_id);


--
-- Name: ix_athletes_uid; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX ix_athletes_uid ON public.athletes USING btree (uid);


--
-- Name: ix_fights_uid; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX ix_fights_uid ON public.fights USING btree (uid);


--
-- Name: ix_login_history_user_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX ix_login_history_user_id ON public.login_history USING btree (user_id);


--
-- Name: ix_persons_full_name; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX ix_persons_full_name ON public.persons USING btree (full_name);


--
-- Name: ix_refresh_tokens_token; Type: INDEX; Schema: public; Owner: user
--

CREATE UNIQUE INDEX ix_refresh_tokens_token ON public.refresh_tokens USING btree (token);


--
-- Name: ix_refresh_tokens_user_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX ix_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id);


--
-- Name: ix_sport_events_arena_uuid; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX ix_sport_events_arena_uuid ON public.sport_events USING btree (arena_uuid);


--
-- Name: ix_teams_uid; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX ix_teams_uid ON public.teams USING btree (uid);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: user
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: user
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- Name: ix_weight_categories_uid; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX ix_weight_categories_uid ON public.weight_categories USING btree (uid);


--
-- Name: arena_sources arena_sources_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.arena_sources
    ADD CONSTRAINT arena_sources_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: athlete_source_uids athlete_source_uids_arena_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.athlete_source_uids
    ADD CONSTRAINT athlete_source_uids_arena_source_id_fkey FOREIGN KEY (arena_source_id) REFERENCES public.arena_sources(id);


--
-- Name: athlete_source_uids athlete_source_uids_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.athlete_source_uids
    ADD CONSTRAINT athlete_source_uids_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.athletes(id);


--
-- Name: athletes athletes_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.athletes
    ADD CONSTRAINT athletes_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id);


--
-- Name: fights fights_fighter_one_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.fights
    ADD CONSTRAINT fights_fighter_one_id_fkey FOREIGN KEY (fighter_one_id) REFERENCES public.athletes(id);


--
-- Name: fights fights_fighter_two_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.fights
    ADD CONSTRAINT fights_fighter_two_id_fkey FOREIGN KEY (fighter_two_id) REFERENCES public.athletes(id);


--
-- Name: fights fights_sport_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.fights
    ADD CONSTRAINT fights_sport_event_id_fkey FOREIGN KEY (sport_event_id) REFERENCES public.sport_events(id);


--
-- Name: fights fights_victory_type_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.fights
    ADD CONSTRAINT fights_victory_type_fkey FOREIGN KEY (victory_type) REFERENCES public.victory_types(code);


--
-- Name: fights fights_weight_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.fights
    ADD CONSTRAINT fights_weight_category_id_fkey FOREIGN KEY (weight_category_id) REFERENCES public.weight_categories(id);


--
-- Name: fights fights_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.fights
    ADD CONSTRAINT fights_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.athletes(id);


--
-- Name: login_history login_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: sport_event_source_uids sport_event_source_uids_arena_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.sport_event_source_uids
    ADD CONSTRAINT sport_event_source_uids_arena_source_id_fkey FOREIGN KEY (arena_source_id) REFERENCES public.arena_sources(id);


--
-- Name: sport_event_source_uids sport_event_source_uids_sport_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.sport_event_source_uids
    ADD CONSTRAINT sport_event_source_uids_sport_event_id_fkey FOREIGN KEY (sport_event_id) REFERENCES public.sport_events(id);


--
-- Name: sync_logs sync_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.sync_logs
    ADD CONSTRAINT sync_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: teams teams_sport_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_sport_event_id_fkey FOREIGN KEY (sport_event_id) REFERENCES public.sport_events(id);


--
-- Name: weight_categories weight_categories_discipline_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.weight_categories
    ADD CONSTRAINT weight_categories_discipline_id_fkey FOREIGN KEY (discipline_id) REFERENCES public.disciplines(id);


--
-- Name: weight_categories weight_categories_sport_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.weight_categories
    ADD CONSTRAINT weight_categories_sport_event_id_fkey FOREIGN KEY (sport_event_id) REFERENCES public.sport_events(id);


--
-- Name: weight_category_source_uids weight_category_source_uids_arena_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.weight_category_source_uids
    ADD CONSTRAINT weight_category_source_uids_arena_source_id_fkey FOREIGN KEY (arena_source_id) REFERENCES public.arena_sources(id);


--
-- Name: weight_category_source_uids weight_category_source_uids_weight_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.weight_category_source_uids
    ADD CONSTRAINT weight_category_source_uids_weight_category_id_fkey FOREIGN KEY (weight_category_id) REFERENCES public.weight_categories(id);


--
-- PostgreSQL database dump complete
--

\unrestrict oQu7rry9av1rInKS6OqiEr0gOZBmSp0lSxWE1upccXFWSgPU0PtTdajLWER449T

