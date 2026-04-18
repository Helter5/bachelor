-- ============================================================
-- Arena A (:8080): Visegrád Wrestling Cup 2026
--
-- ALL 4 teams (SVK, CZE, HU, POL), ALL 8 athletes (both WCs).
-- Fights only for 65 kg FS (mat 1). 74 kg GR athletes registered
-- here but fights are recorded in Arena B.
--
-- Dedup keys (same values across A/B/C):
--   Event:   name + country_iso_code → "Visegrád Wrestling Cup 2026" + SK
--   WC:      sport_event + max_weight + sport/audience
--   Team:    sport_event + name
--   Person:  full_name + country_iso_code (derived from team.country_cio_id)
--   Athlete: sport_event + person + weight_category
--
-- Run:
--   docker exec -i arena-mysql-1 mysql -uarena -parena arena < arena/visegrad_a.sql
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
  ('aaaa5001-5001-5001-5001-000000000001',
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
  ('aaaa5001-5001-5001-5001-000000000010',
   '65 kg', 0, 65, 420, 2, 180, 0, '#a500ff', 'singlebracket', NULL,
   '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL,
   'aaaa5001-5001-5001-5001-000000000001',
   'seniors', 'fs', '2026-07-01 10:00:00', 0, NULL, 1, 0, 1, 0, 0),
  ('aaaa5001-5001-5001-5001-000000000011',
   '74 kg', 65, 74, 420, 2, 180, 0, '#005aff', 'singlebracket', NULL,
   '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL,
   'aaaa5001-5001-5001-5001-000000000001',
   'seniors', 'gr', '2026-07-01 10:00:00', 0, NULL, 2, 0, 1, 0, 0);

-- country_cio_id set so Arena PHP returns proper countryIsoCode in API response
-- SK=178, CZ=51, HU=84, PL=153
INSERT INTO `sport_event_team`
  (`id`, `country_cio_id`, `name`, `alternate_name`, `logo`, `sport_event_id`,
   `sport_event_pool_id`, `draw_number`, `continent`, `created`, `updated`, `deleted_at`)
VALUES
  ('aaaa5001-5001-5001-5001-000000000020', 178, 'SLOVAKIA', 'SVK', NULL,
   'aaaa5001-5001-5001-5001-000000000001',
   NULL, NULL, 'Europe', '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL),
  ('aaaa5001-5001-5001-5001-000000000021',  51, 'CZECHIA',  'CZE', NULL,
   'aaaa5001-5001-5001-5001-000000000001',
   NULL, NULL, 'Europe', '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL),
  ('aaaa5001-5001-5001-5001-000000000022',  84, 'HUNGARY',  'HUN', NULL,
   'aaaa5001-5001-5001-5001-000000000001',
   NULL, NULL, 'Europe', '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL),
  ('aaaa5001-5001-5001-5001-000000000023', 153, 'POLAND',   'POL', NULL,
   'aaaa5001-5001-5001-5001-000000000001',
   NULL, NULL, 'Europe', '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL);

-- prefered_name = "given_name FAMILY_NAME" — Arena API returns this as personFullName
-- origins/languages must be PHP-serialized (NOT JSON) — empty = 'a:0:{}'
INSERT INTO `person`
  (`id`, `family_name`, `given_name`, `prefered_name`, `display_name`,
   `ioc_print_name`, `ioc_print_initial_name`, `ioc_tv_name`, `ioc_tv_initial_name`,
   `ioc_tv_family_name`, `athena_print_id`, `origins`, `languages`,
   `created`, `updated`, `deleted_at`, `custom_id`, `odf_code`)
VALUES
  ('aaaa5001-5001-5001-5001-000000000030',
   'NOVAK', 'Jan', 'Jan NOVAK', 'NOVAK Jan.',
   NULL, NULL, NULL, NULL, NULL, NULL, 'a:0:{}', 'a:0:{}',
   '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL, NULL, NULL),
  ('aaaa5001-5001-5001-5001-000000000031',
   'CERNY', 'Petr', 'Petr CERNY', 'CERNY Petr.',
   NULL, NULL, NULL, NULL, NULL, NULL, 'a:0:{}', 'a:0:{}',
   '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL, NULL, NULL),
  ('aaaa5001-5001-5001-5001-000000000032',
   'KISS', 'Balazs', 'Balazs KISS', 'KISS Balazs.',
   NULL, NULL, NULL, NULL, NULL, NULL, 'a:0:{}', 'a:0:{}',
   '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL, NULL, NULL),
  ('aaaa5001-5001-5001-5001-000000000033',
   'KOWALSKI', 'Marek', 'Marek KOWALSKI', 'KOWALSKI Marek.',
   NULL, NULL, NULL, NULL, NULL, NULL, 'a:0:{}', 'a:0:{}',
   '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL, NULL, NULL),
  ('aaaa5001-5001-5001-5001-000000000034',
   'HORVATH', 'Martin', 'Martin HORVATH', 'HORVATH Martin.',
   NULL, NULL, NULL, NULL, NULL, NULL, 'a:0:{}', 'a:0:{}',
   '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL, NULL, NULL),
  ('aaaa5001-5001-5001-5001-000000000035',
   'DVORAK', 'Lukas', 'Lukas DVORAK', 'DVORAK Lukas.',
   NULL, NULL, NULL, NULL, NULL, NULL, 'a:0:{}', 'a:0:{}',
   '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL, NULL, NULL),
  ('aaaa5001-5001-5001-5001-000000000036',
   'NAGY', 'Tamas', 'Tamas NAGY', 'NAGY Tamas.',
   NULL, NULL, NULL, NULL, NULL, NULL, 'a:0:{}', 'a:0:{}',
   '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL, NULL, NULL),
  ('aaaa5001-5001-5001-5001-000000000037',
   'WISNIEWSKI', 'Pawel', 'Pawel WISNIEWSKI', 'WISNIEWSKI Pawel.',
   NULL, NULL, NULL, NULL, NULL, NULL, 'a:0:{}', 'a:0:{}',
   '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL, NULL, NULL);

INSERT INTO `athlete`
  (`id`, `person_id`, `sport_event_id`, `sport_event_team_id`,
   `disqualified`, `accreditation_status`, `created`, `updated`, `deleted_at`)
VALUES
  ('aaaa5001-5001-5001-5001-000000000040',
   'aaaa5001-5001-5001-5001-000000000030',
   'aaaa5001-5001-5001-5001-000000000001',
   'aaaa5001-5001-5001-5001-000000000020',
   0, NULL, '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL),   -- Jan NOVAK / SVK
  ('aaaa5001-5001-5001-5001-000000000041',
   'aaaa5001-5001-5001-5001-000000000031',
   'aaaa5001-5001-5001-5001-000000000001',
   'aaaa5001-5001-5001-5001-000000000021',
   0, NULL, '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL),   -- Petr CERNY / CZE
  ('aaaa5001-5001-5001-5001-000000000042',
   'aaaa5001-5001-5001-5001-000000000032',
   'aaaa5001-5001-5001-5001-000000000001',
   'aaaa5001-5001-5001-5001-000000000022',
   0, NULL, '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL),   -- Balazs KISS / HU
  ('aaaa5001-5001-5001-5001-000000000043',
   'aaaa5001-5001-5001-5001-000000000033',
   'aaaa5001-5001-5001-5001-000000000001',
   'aaaa5001-5001-5001-5001-000000000023',
   0, NULL, '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL),   -- Marek KOWALSKI / POL
  ('aaaa5001-5001-5001-5001-000000000044',
   'aaaa5001-5001-5001-5001-000000000034',
   'aaaa5001-5001-5001-5001-000000000001',
   'aaaa5001-5001-5001-5001-000000000020',
   0, NULL, '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL),   -- Martin HORVATH / SVK
  ('aaaa5001-5001-5001-5001-000000000045',
   'aaaa5001-5001-5001-5001-000000000035',
   'aaaa5001-5001-5001-5001-000000000001',
   'aaaa5001-5001-5001-5001-000000000021',
   0, NULL, '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL),   -- Lukas DVORAK / CZE
  ('aaaa5001-5001-5001-5001-000000000046',
   'aaaa5001-5001-5001-5001-000000000036',
   'aaaa5001-5001-5001-5001-000000000001',
   'aaaa5001-5001-5001-5001-000000000022',
   0, NULL, '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL),   -- Tamas NAGY / HU
  ('aaaa5001-5001-5001-5001-000000000047',
   'aaaa5001-5001-5001-5001-000000000037',
   'aaaa5001-5001-5001-5001-000000000001',
   'aaaa5001-5001-5001-5001-000000000023',
   0, NULL, '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL);   -- Pawel WISNIEWSKI / POL

-- draw_number: 1=SVK, 2=CZE, 3=HU, 4=POL
INSERT INTO `fighter`
  (`id`, `athlete_id`, `sport_event_weight_category_id`,
   `weight`, `draw_number`, `seed_number`, `points`,
   `created`, `updated`, `deleted_at`,
   `fighter_weight`, `fighter_status`, `fighter_status_reason`, `top_technique`)
VALUES
  ('aaaa5001-5001-5001-5001-000000000050',
   'aaaa5001-5001-5001-5001-000000000040',
   'aaaa5001-5001-5001-5001-000000000010',
   NULL, 1, 0, NULL, '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL, NULL, 0, 0, 0),
  ('aaaa5001-5001-5001-5001-000000000051',
   'aaaa5001-5001-5001-5001-000000000041',
   'aaaa5001-5001-5001-5001-000000000010',
   NULL, 2, 0, NULL, '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL, NULL, 0, 0, 0),
  ('aaaa5001-5001-5001-5001-000000000052',
   'aaaa5001-5001-5001-5001-000000000042',
   'aaaa5001-5001-5001-5001-000000000010',
   NULL, 3, 0, NULL, '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL, NULL, 0, 0, 0),
  ('aaaa5001-5001-5001-5001-000000000053',
   'aaaa5001-5001-5001-5001-000000000043',
   'aaaa5001-5001-5001-5001-000000000010',
   NULL, 4, 0, NULL, '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL, NULL, 0, 0, 0),
  ('aaaa5001-5001-5001-5001-000000000054',
   'aaaa5001-5001-5001-5001-000000000044',
   'aaaa5001-5001-5001-5001-000000000011',
   NULL, 1, 0, NULL, '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL, NULL, 0, 0, 0),
  ('aaaa5001-5001-5001-5001-000000000055',
   'aaaa5001-5001-5001-5001-000000000045',
   'aaaa5001-5001-5001-5001-000000000011',
   NULL, 2, 0, NULL, '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL, NULL, 0, 0, 0),
  ('aaaa5001-5001-5001-5001-000000000056',
   'aaaa5001-5001-5001-5001-000000000046',
   'aaaa5001-5001-5001-5001-000000000011',
   NULL, 3, 0, NULL, '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL, NULL, 0, 0, 0),
  ('aaaa5001-5001-5001-5001-000000000057',
   'aaaa5001-5001-5001-5001-000000000047',
   'aaaa5001-5001-5001-5001-000000000011',
   NULL, 4, 0, NULL, '2026-07-01 10:00:00', '2026-07-01 10:00:00', NULL, NULL, 0, 0, 0);

-- ============================================================
-- 65 kg FS bracket (draw1 vs draw4, draw2 vs draw3)
--
--   SF1: NOVAK(SVK,1) vs KOWALSKI(POL,4) → NOVAK wins VFA  5-0
--   SF2: CERNY(CZE,2) vs KISS(HU,3)      → CERNY wins VPO  3-0
--   3rd: KISS          vs KOWALSKI        → KISS  wins VPO1 3-1
--   1st: NOVAK         vs CERNY           → NOVAK wins VSU  4-0
--
-- Final ranks 65kg: SVK=1, CZE=2, HU=3, POL=4
-- ============================================================

INSERT INTO `fight`
  (`id`, `fighter1_id`, `fighter2_id`,
   `sport_event_id`, `sport_event_weight_category_id`,
   `sport_event_team1_id`, `sport_event_team2_id`,
   `parent_fight1_id`, `parent_fight2_id`, `loser_fight_id`,
   `fighter1_ranking_point`, `fighter2_ranking_point`,
   `round`, `status`, `fight_number`, `display_order`,
   `qualifying`, `ranking_check`, `technical_check`,
   `created`, `updated`, `deleted_at`,
   `fight_mat_id`, `weight`, `round_weight`, `repechage_weight`, `repechage_section`,
   `canceled`, `odf_code`, `referee_comment`, `uploader_fight`, `beach_group`,
   `referee_group`, `team_fight_id`)
VALUES
  -- SF1: Jan NOVAK vs Marek KOWALSKI → NOVAK wins VFA 5-0
  ('aaaa5001-5001-5001-5001-000000000060',
   'aaaa5001-5001-5001-5001-000000000050',
   'aaaa5001-5001-5001-5001-000000000053',
   'aaaa5001-5001-5001-5001-000000000001',
   'aaaa5001-5001-5001-5001-000000000010',
   'aaaa5001-5001-5001-5001-000000000020',
   'aaaa5001-5001-5001-5001-000000000023',
   NULL, NULL, 'aaaa5001-5001-5001-5001-000000000062',
   5, 0,
   '1/2 Final', 5, 1, 1,
   0, 0, 0,
   '2026-07-15 09:00:00', '2026-07-15 09:30:00', NULL,
   NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  -- SF2: Petr CERNY vs Balazs KISS → CERNY wins VPO 3-0
  ('aaaa5001-5001-5001-5001-000000000061',
   'aaaa5001-5001-5001-5001-000000000051',
   'aaaa5001-5001-5001-5001-000000000052',
   'aaaa5001-5001-5001-5001-000000000001',
   'aaaa5001-5001-5001-5001-000000000010',
   'aaaa5001-5001-5001-5001-000000000021',
   'aaaa5001-5001-5001-5001-000000000022',
   NULL, NULL, 'aaaa5001-5001-5001-5001-000000000062',
   3, 0,
   '1/2 Final', 5, 2, 2,
   0, 0, 0,
   '2026-07-15 09:30:00', '2026-07-15 10:00:00', NULL,
   NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  -- Final 3-4: Balazs KISS vs Marek KOWALSKI → KISS wins VPO1 3-1
  ('aaaa5001-5001-5001-5001-000000000062',
   'aaaa5001-5001-5001-5001-000000000052',
   'aaaa5001-5001-5001-5001-000000000053',
   'aaaa5001-5001-5001-5001-000000000001',
   'aaaa5001-5001-5001-5001-000000000010',
   'aaaa5001-5001-5001-5001-000000000022',
   'aaaa5001-5001-5001-5001-000000000023',
   'aaaa5001-5001-5001-5001-000000000060',
   'aaaa5001-5001-5001-5001-000000000061',
   NULL,
   3, 1,
   'Final 3-4', 5, 3, 3,
   0, 0, 0,
   '2026-07-15 13:00:00', '2026-07-15 13:30:00', NULL,
   NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  -- Final 1-2: Jan NOVAK vs Petr CERNY → NOVAK wins VSU 4-0
  ('aaaa5001-5001-5001-5001-000000000063',
   'aaaa5001-5001-5001-5001-000000000050',
   'aaaa5001-5001-5001-5001-000000000051',
   'aaaa5001-5001-5001-5001-000000000001',
   'aaaa5001-5001-5001-5001-000000000010',
   'aaaa5001-5001-5001-5001-000000000020',
   'aaaa5001-5001-5001-5001-000000000021',
   'aaaa5001-5001-5001-5001-000000000060',
   'aaaa5001-5001-5001-5001-000000000061',
   NULL,
   4, 0,
   'Final 1-2', 5, 4, 4,
   0, 0, 0,
   '2026-07-15 14:00:00', '2026-07-15 14:30:00', NULL,
   NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

INSERT INTO `fight_ranking_point`
  (`id`, `fight_id`, `fighter_id`, `second`, `victory_type`, `created`, `updated`, `deleted_at`)
VALUES
  ('aaaa5001-5001-5001-5001-000000000070',
   'aaaa5001-5001-5001-5001-000000000060',
   'aaaa5001-5001-5001-5001-000000000050',   -- NOVAK wins SF1
   120, 'VFA', '2026-07-15 09:30:00', '2026-07-15 09:30:00', NULL),
  ('aaaa5001-5001-5001-5001-000000000071',
   'aaaa5001-5001-5001-5001-000000000061',
   'aaaa5001-5001-5001-5001-000000000051',   -- CERNY wins SF2
   150, 'VPO', '2026-07-15 10:00:00', '2026-07-15 10:00:00', NULL),
  ('aaaa5001-5001-5001-5001-000000000072',
   'aaaa5001-5001-5001-5001-000000000062',
   'aaaa5001-5001-5001-5001-000000000052',   -- KISS wins Final 3-4
   180, 'VPO1', '2026-07-15 13:30:00', '2026-07-15 13:30:00', NULL),
  ('aaaa5001-5001-5001-5001-000000000073',
   'aaaa5001-5001-5001-5001-000000000063',
   'aaaa5001-5001-5001-5001-000000000050',   -- NOVAK wins Final 1-2
   100, 'VSU', '2026-07-15 14:30:00', '2026-07-15 14:30:00', NULL);

SET FOREIGN_KEY_CHECKS=1;
