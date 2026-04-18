-- ============================================================
-- Arena C (:8082): Visegrád Wrestling Cup 2026
--
-- SVK + CZE teams only. 4 athletes (NOVAK, CERNY, HORVATH, DVORAK).
-- No fights — this Arena only contributes registration data.
-- Purpose: verify that persons/athletes from a 3rd source dedup
-- correctly against records already synced from Arena A and B.
--
-- Dedup keys (same values across A/B/C):
--   Event:   name + country_iso_code → "Visegrád Wrestling Cup 2026" + SK
--   WC:      sport_event + max_weight + sport/audience
--   Team:    sport_event + name
--   Person:  full_name + country_iso_code (derived from team.country_cio_id)
--   Athlete: sport_event + person + weight_category
--
-- Run:
--   docker exec -i arena-mysql-3 mysql -uarena -parena arena < arena/visegrad_c.sql
-- ============================================================

SET FOREIGN_KEY_CHECKS=0;

INSERT INTO `sport_event`
  (`id`, `name`, `start_date`, `end_date`, `address_locality`, `country_id`,
   `ranking_type`, `tournament_type`, `event_type`, `scoreboard_type`, `image`,
   `timezone`, `rest_time`, `countdown`, `light_scoresheet`, `copy_scoresheet`,
   `bulk_scoresheet`, `mat_assignment`, `visible`, `created`, `updated`, `deleted_at`,
   `odf_code`, `uww_ranking_type`, `local_client_id`, `remote_id`, `continent`,
   `session_type`, `remote_status`, `forbid_sync_after`, `secure`, `nb_seeds`,
   `athena_competition_id`, `video_checksum`, `scoreboard_operator`, `draw_manager_id`)
VALUES
  ('cccc5001-5001-5001-5001-000000000001',
   'Visegrád Wrestling Cup 2026',
   '2026-07-15 00:00:00', '2026-07-16 00:00:00',
   'Bratislava', 178,
   'individual', 'singlebracket', 'continental-championships', 'uww', NULL,
   'Europe/Bratislava', 20, 1, 0, 2, 0, 1, 1,
   '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL,
   NULL, NULL, NULL, NULL, 'europe', '1day', NULL, 0, 0, 0, NULL, NULL, 'volunteer', NULL);

INSERT INTO `sport_event_weight_category`
  (`id`, `name`, `min_weight`, `max_weight`, `average_duration`, `rounds_number`,
   `round_duration`, `overtime`, `color`, `tournament_type`, `odf_code`,
   `created`, `updated`, `deleted_at`, `sport_event_id`,
   `audience`, `sport`, `fighters_updated`, `uww_ranking`, `blockchain_ids`,
   `session_start_day`, `mat_assignment`, `visible`, `athena_finalized`, `medal_ceremony`)
VALUES
  ('cccc5001-5001-5001-5001-000000000010',
   '65 kg', 0, 65, 420, 2, 180, 0, '#a500ff', 'singlebracket', NULL,
   '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL,
   'cccc5001-5001-5001-5001-000000000001',
   'seniors', 'fs', '2026-07-01 10:00:00', 0, NULL, 1, 0, 1, 0, 0),
  ('cccc5001-5001-5001-5001-000000000011',
   '74 kg', 65, 74, 420, 2, 180, 0, '#005aff', 'singlebracket', NULL,
   '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL,
   'cccc5001-5001-5001-5001-000000000001',
   'seniors', 'gr', '2026-07-01 10:00:00', 0, NULL, 2, 0, 1, 0, 0);

-- SVK and CZE only — HU and POL not present in this Arena instance
INSERT INTO `sport_event_team`
  (`id`, `country_cio_id`, `name`, `alternate_name`, `logo`, `sport_event_id`,
   `sport_event_pool_id`, `draw_number`, `continent`, `created`, `updated`, `deleted_at`)
VALUES
  ('cccc5001-5001-5001-5001-000000000020', 178, 'SLOVAKIA', 'SVK', NULL,
   'cccc5001-5001-5001-5001-000000000001',
   NULL, NULL, 'Europe', '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL),
  ('cccc5001-5001-5001-5001-000000000021',  51, 'CZECHIA',  'CZE', NULL,
   'cccc5001-5001-5001-5001-000000000001',
   NULL, NULL, 'Europe', '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL);

-- 4 persons — all dedup against Arena A/B records via full_name + country_iso_code
INSERT INTO `person`
  (`id`, `family_name`, `given_name`, `prefered_name`, `display_name`,
   `ioc_print_name`, `ioc_print_initial_name`, `ioc_tv_name`, `ioc_tv_initial_name`,
   `ioc_tv_family_name`, `athena_print_id`, `origins`, `languages`,
   `created`, `updated`, `deleted_at`, `custom_id`, `odf_code`)
VALUES
  ('cccc5001-5001-5001-5001-000000000030',
   'NOVAK', 'Jan', 'Jan NOVAK', 'NOVAK Jan.',
   NULL, NULL, NULL, NULL, NULL, NULL, 'a:0:{}', 'a:0:{}',
   '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL, NULL, NULL),
  ('cccc5001-5001-5001-5001-000000000031',
   'CERNY', 'Petr', 'Petr CERNY', 'CERNY Petr.',
   NULL, NULL, NULL, NULL, NULL, NULL, 'a:0:{}', 'a:0:{}',
   '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL, NULL, NULL),
  ('cccc5001-5001-5001-5001-000000000034',
   'HORVATH', 'Martin', 'Martin HORVATH', 'HORVATH Martin.',
   NULL, NULL, NULL, NULL, NULL, NULL, 'a:0:{}', 'a:0:{}',
   '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL, NULL, NULL),
  ('cccc5001-5001-5001-5001-000000000035',
   'DVORAK', 'Lukas', 'Lukas DVORAK', 'DVORAK Lukas.',
   NULL, NULL, NULL, NULL, NULL, NULL, 'a:0:{}', 'a:0:{}',
   '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL, NULL, NULL);

-- 4 athletes — dedup against Arena A/B records via sport_event + person + weight_category
INSERT INTO `athlete`
  (`id`, `person_id`, `sport_event_id`, `sport_event_team_id`,
   `disqualified`, `accreditation_status`, `created`, `updated`, `deleted_at`)
VALUES
  ('cccc5001-5001-5001-5001-000000000040',
   'cccc5001-5001-5001-5001-000000000030',
   'cccc5001-5001-5001-5001-000000000001',
   'cccc5001-5001-5001-5001-000000000020',
   0, NULL, '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL),   -- Jan NOVAK / SVK
  ('cccc5001-5001-5001-5001-000000000041',
   'cccc5001-5001-5001-5001-000000000031',
   'cccc5001-5001-5001-5001-000000000001',
   'cccc5001-5001-5001-5001-000000000021',
   0, NULL, '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL),   -- Petr CERNY / CZE
  ('cccc5001-5001-5001-5001-000000000044',
   'cccc5001-5001-5001-5001-000000000034',
   'cccc5001-5001-5001-5001-000000000001',
   'cccc5001-5001-5001-5001-000000000020',
   0, NULL, '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL),   -- Martin HORVATH / SVK
  ('cccc5001-5001-5001-5001-000000000045',
   'cccc5001-5001-5001-5001-000000000035',
   'cccc5001-5001-5001-5001-000000000001',
   'cccc5001-5001-5001-5001-000000000021',
   0, NULL, '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL);   -- Lukas DVORAK / CZE

-- Fighters registered to their weight categories (no fights — registration only)
INSERT INTO `fighter`
  (`id`, `athlete_id`, `sport_event_weight_category_id`,
   `weight`, `draw_number`, `seed_number`, `points`,
   `created`, `updated`, `deleted_at`,
   `fighter_weight`, `fighter_status`, `fighter_status_reason`, `top_technique`)
VALUES
  ('cccc5001-5001-5001-5001-000000000050',
   'cccc5001-5001-5001-5001-000000000040',
   'cccc5001-5001-5001-5001-000000000010',
   NULL, 1, 0, NULL, '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL, NULL, 0, 0, 0),  -- NOVAK / 65kg FS
  ('cccc5001-5001-5001-5001-000000000051',
   'cccc5001-5001-5001-5001-000000000041',
   'cccc5001-5001-5001-5001-000000000010',
   NULL, 2, 0, NULL, '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL, NULL, 0, 0, 0),  -- CERNY / 65kg FS
  ('cccc5001-5001-5001-5001-000000000054',
   'cccc5001-5001-5001-5001-000000000044',
   'cccc5001-5001-5001-5001-000000000011',
   NULL, 1, 0, NULL, '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL, NULL, 0, 0, 0),  -- HORVATH / 74kg GR
  ('cccc5001-5001-5001-5001-000000000055',
   'cccc5001-5001-5001-5001-000000000045',
   'cccc5001-5001-5001-5001-000000000011',
   NULL, 2, 0, NULL, '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL, NULL, 0, 0, 0);  -- DVORAK / 74kg GR

-- No fights in Arena C.

SET FOREIGN_KEY_CHECKS=1;
