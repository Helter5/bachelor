-- ============================================================
-- Arena C test data
--
-- Event 1: Multi-Arena Test Cup (cccc... UUIDs)
--   Same name/date/location as A and B — must deduplicate to 1 event in app DB.
--   Adds a 4th team (AUSTRIA/AUT) not present in A or B.
--   4 athletes: Jan NOVAK and Petr CERNY appear in B too (must deduplicate),
--   Karl WAGNER and Franz BAUER are new (must be created).
--
-- Event 2: Arena C Exclusive Cup (cccc... UUIDs, 0002 prefix)
--   Unique event — exists ONLY in Arena C.
--   1 weight category (86 kg GR seniors), 2 teams (HUNGARY, AUSTRIA), 2 athletes.
-- ============================================================

SET FOREIGN_KEY_CHECKS=0;

-- ============================================================
-- EVENT 1: Multi-Arena Test Cup
-- ============================================================

INSERT INTO `sport_event`
  (`id`, `name`, `start_date`, `end_date`, `address_locality`, `country_id`,
   `ranking_type`, `tournament_type`, `event_type`, `scoreboard_type`, `image`,
   `timezone`, `rest_time`, `countdown`, `light_scoresheet`, `copy_scoresheet`,
   `bulk_scoresheet`, `mat_assignment`, `visible`, `created`, `updated`, `deleted_at`,
   `odf_code`, `uww_ranking_type`, `local_client_id`, `remote_id`, `continent`,
   `session_type`, `remote_status`, `forbid_sync_after`, `secure`, `nb_seeds`,
   `athena_competition_id`, `video_checksum`, `scoreboard_operator`, `draw_manager_id`)
VALUES
  ('cccccccc-cccc-cccc-cccc-000000000001',
   'Multi-Arena Test Cup',
   '2026-06-10 00:00:00', '2026-06-12 00:00:00',
   'Bratislava', 48,
   'individual', 'singlebracket', 'continental-championships', 'uww', NULL,
   'Europe/Bratislava', 20, 1, 0, 2, 0, 1, 1,
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL,
   NULL, NULL, NULL, NULL, 'world', '1day', NULL, 0, 0, 0, NULL, NULL, 'volunteer', NULL);

-- Weight categories (same natural keys as A/B: max_weight + sport + audience)
INSERT INTO `sport_event_weight_category`
  (`id`, `name`, `min_weight`, `max_weight`, `average_duration`, `rounds_number`,
   `round_duration`, `overtime`, `color`, `tournament_type`, `odf_code`,
   `created`, `updated`, `deleted_at`, `sport_event_id`,
   `audience`, `sport`, `fighters_updated`, `uww_ranking`, `blockchain_ids`,
   `session_start_day`, `mat_assignment`, `visible`, `athena_finalized`, `medal_ceremony`)
VALUES
  ('cccccccc-cccc-cccc-cccc-000000000010',
   '65 kg', 0, 65, 420, 2, 180, 0, '#a500ff', 'singlebracket', NULL,
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL,
   'cccccccc-cccc-cccc-cccc-000000000001',
   'seniors', 'fs', '2026-06-01 10:00:00', 0, NULL, 1, 0, 1, 0, 0),
  ('cccccccc-cccc-cccc-cccc-000000000011',
   '74 kg', 65, 74, 420, 2, 180, 0, '#005aff', 'singlebracket', NULL,
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL,
   'cccccccc-cccc-cccc-cccc-000000000001',
   'seniors', 'gr', '2026-06-01 10:00:00', 0, NULL, 1, 0, 1, 0, 0);

-- Teams: SVK/CZE/POL same as A+B, plus new AUSTRIA/AUT
INSERT INTO `sport_event_team`
  (`id`, `country_cio_id`, `name`, `alternate_name`, `logo`, `sport_event_id`,
   `sport_event_pool_id`, `draw_number`, `continent`, `created`, `updated`, `deleted_at`)
VALUES
  ('cccccccc-cccc-cccc-cccc-000000000020',
  178, 'SLOVAKIA', 'SVK', NULL, 'cccccccc-cccc-cccc-cccc-000000000001',
   NULL, NULL, 'Europe', '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL),
  ('cccccccc-cccc-cccc-cccc-000000000021',
  51, 'CZECHIA', 'CZE', NULL, 'cccccccc-cccc-cccc-cccc-000000000001',
   NULL, NULL, 'Europe', '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL),
  ('cccccccc-cccc-cccc-cccc-000000000022',
  153, 'POLAND', 'POL', NULL, 'cccccccc-cccc-cccc-cccc-000000000001',
   NULL, NULL, 'Europe', '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL),
  ('cccccccc-cccc-cccc-cccc-000000000023',
  12, 'AUSTRIA', 'AUT', NULL, 'cccccccc-cccc-cccc-cccc-000000000001',
   NULL, NULL, 'Europe', '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL);

-- Persons:
--   Jan NOVAK and Petr CERNY — same prefered_name as in Arena B → app must deduplicate athletes
--   Karl WAGNER and Franz BAUER — unique to Arena C → new athletes created
INSERT INTO `person`
  (`id`, `family_name`, `given_name`, `prefered_name`, `display_name`,
   `ioc_print_name`, `ioc_print_initial_name`, `ioc_tv_name`, `ioc_tv_initial_name`,
   `ioc_tv_family_name`, `athena_print_id`, `origins`, `languages`,
   `created`, `updated`, `deleted_at`, `custom_id`, `odf_code`)
VALUES
  ('cccccccc-cccc-cccc-cccc-000000000030',
   'NOVAK', 'Jan', 'Jan NOVAK', 'NOVAK Jan.',
   NULL, NULL, NULL, NULL, NULL, NULL, 'a:0:{}', 'a:0:{}',
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL, NULL, NULL),
  ('cccccccc-cccc-cccc-cccc-000000000031',
   'CERNY', 'Petr', 'Petr CERNY', 'CERNY Petr.',
   NULL, NULL, NULL, NULL, NULL, NULL, 'a:0:{}', 'a:0:{}',
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL, NULL, NULL),
  ('cccccccc-cccc-cccc-cccc-000000000032',
   'WAGNER', 'Karl', 'Karl WAGNER', 'WAGNER Karl.',
   NULL, NULL, NULL, NULL, NULL, NULL, 'a:0:{}', 'a:0:{}',
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL, NULL, NULL),
  ('cccccccc-cccc-cccc-cccc-000000000033',
   'BAUER', 'Franz', 'Franz BAUER', 'BAUER Franz.',
   NULL, NULL, NULL, NULL, NULL, NULL, 'a:0:{}', 'a:0:{}',
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL, NULL, NULL);

-- Athletes (4 for Multi-Arena Test Cup)
INSERT INTO `athlete`
  (`id`, `person_id`, `sport_event_id`, `sport_event_team_id`,
   `disqualified`, `accreditation_status`, `created`, `updated`, `deleted_at`)
VALUES
  ('cccccccc-cccc-cccc-cccc-000000000040',
   'cccccccc-cccc-cccc-cccc-000000000030',
   'cccccccc-cccc-cccc-cccc-000000000001',
   'cccccccc-cccc-cccc-cccc-000000000020',
   0, NULL, '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL),   -- Jan NOVAK / SLOVAKIA (dedup with B)
  ('cccccccc-cccc-cccc-cccc-000000000041',
   'cccccccc-cccc-cccc-cccc-000000000031',
   'cccccccc-cccc-cccc-cccc-000000000001',
   'cccccccc-cccc-cccc-cccc-000000000021',
   0, NULL, '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL),   -- Petr CERNY / CZECHIA (dedup with B)
  ('cccccccc-cccc-cccc-cccc-000000000042',
   'cccccccc-cccc-cccc-cccc-000000000032',
   'cccccccc-cccc-cccc-cccc-000000000001',
   'cccccccc-cccc-cccc-cccc-000000000023',
   0, NULL, '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL),   -- Karl WAGNER / AUSTRIA (new)
  ('cccccccc-cccc-cccc-cccc-000000000043',
   'cccccccc-cccc-cccc-cccc-000000000033',
   'cccccccc-cccc-cccc-cccc-000000000001',
   'cccccccc-cccc-cccc-cccc-000000000023',
   0, NULL, '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL);   -- Franz BAUER / AUSTRIA (new)

-- Fighters: links athletes to weight categories
INSERT INTO `fighter`
  (`id`, `athlete_id`, `sport_event_weight_category_id`,
   `weight`, `draw_number`, `seed_number`, `points`,
   `created`, `updated`, `deleted_at`,
   `fighter_weight`, `fighter_status`, `fighter_status_reason`, `top_technique`)
VALUES
  ('cccccccc-cccc-cccc-cccc-000000000050',
   'cccccccc-cccc-cccc-cccc-000000000040',
   'cccccccc-cccc-cccc-cccc-000000000010',
   NULL, 1, 0, NULL,
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL,
   NULL, 0, 0, 0),   -- Jan NOVAK / 65 kg FS
  ('cccccccc-cccc-cccc-cccc-000000000051',
   'cccccccc-cccc-cccc-cccc-000000000041',
   'cccccccc-cccc-cccc-cccc-000000000010',
   NULL, 2, 0, NULL,
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL,
   NULL, 0, 0, 0),   -- Petr CERNY / 65 kg FS
  ('cccccccc-cccc-cccc-cccc-000000000052',
   'cccccccc-cccc-cccc-cccc-000000000042',
   'cccccccc-cccc-cccc-cccc-000000000010',
   NULL, 3, 0, NULL,
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL,
   NULL, 0, 0, 0),   -- Karl WAGNER / 65 kg FS
  ('cccccccc-cccc-cccc-cccc-000000000053',
   'cccccccc-cccc-cccc-cccc-000000000043',
   'cccccccc-cccc-cccc-cccc-000000000011',
   NULL, 1, 0, NULL,
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL,
   NULL, 0, 0, 0);   -- Franz BAUER / 74 kg GR


-- ============================================================
-- EVENT 2: Arena C Exclusive Cup (unique — only in Arena C)
-- ============================================================

INSERT INTO `sport_event`
  (`id`, `name`, `start_date`, `end_date`, `address_locality`, `country_id`,
   `ranking_type`, `tournament_type`, `event_type`, `scoreboard_type`, `image`,
   `timezone`, `rest_time`, `countdown`, `light_scoresheet`, `copy_scoresheet`,
   `bulk_scoresheet`, `mat_assignment`, `visible`, `created`, `updated`, `deleted_at`,
   `odf_code`, `uww_ranking_type`, `local_client_id`, `remote_id`, `continent`,
   `session_type`, `remote_status`, `forbid_sync_after`, `secure`, `nb_seeds`,
   `athena_competition_id`, `video_checksum`, `scoreboard_operator`, `draw_manager_id`)
VALUES
  ('cccccccc-cccc-cccc-cccc-000000000002',
   'Arena C Exclusive Cup',
   '2026-08-15 00:00:00', '2026-08-17 00:00:00',
   'Bratislava', 48,
   'individual', 'singlebracket', 'continental-championships', 'uww', NULL,
   'Europe/Bratislava', 20, 1, 0, 2, 0, 1, 1,
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL,
   NULL, NULL, NULL, NULL, 'world', '1day', NULL, 0, 0, 0, NULL, NULL, 'volunteer', NULL);

-- Weight category: 86 kg GR seniors
INSERT INTO `sport_event_weight_category`
  (`id`, `name`, `min_weight`, `max_weight`, `average_duration`, `rounds_number`,
   `round_duration`, `overtime`, `color`, `tournament_type`, `odf_code`,
   `created`, `updated`, `deleted_at`, `sport_event_id`,
   `audience`, `sport`, `fighters_updated`, `uww_ranking`, `blockchain_ids`,
   `session_start_day`, `mat_assignment`, `visible`, `athena_finalized`, `medal_ceremony`)
VALUES
  ('cccccccc-cccc-cccc-cccc-000000000060',
   '86 kg', 74, 86, 420, 2, 180, 0, '#ff8c00', 'singlebracket', NULL,
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL,
   'cccccccc-cccc-cccc-cccc-000000000002',
   'seniors', 'gr', '2026-06-01 10:00:00', 0, NULL, 1, 0, 1, 0, 0);

-- Teams: HUNGARY and AUSTRIA
INSERT INTO `sport_event_team`
  (`id`, `country_cio_id`, `name`, `alternate_name`, `logo`, `sport_event_id`,
   `sport_event_pool_id`, `draw_number`, `continent`, `created`, `updated`, `deleted_at`)
VALUES
  ('cccccccc-cccc-cccc-cccc-000000000070',
  84, 'HUNGARY', 'HUN', NULL, 'cccccccc-cccc-cccc-cccc-000000000002',
   NULL, NULL, 'Europe', '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL),
  ('cccccccc-cccc-cccc-cccc-000000000071',
  12, 'AUSTRIA', 'AUT', NULL, 'cccccccc-cccc-cccc-cccc-000000000002',
   NULL, NULL, 'Europe', '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL);

-- Persons (unique to Exclusive Cup)
INSERT INTO `person`
  (`id`, `family_name`, `given_name`, `prefered_name`, `display_name`,
   `ioc_print_name`, `ioc_print_initial_name`, `ioc_tv_name`, `ioc_tv_initial_name`,
   `ioc_tv_family_name`, `athena_print_id`, `origins`, `languages`,
   `created`, `updated`, `deleted_at`, `custom_id`, `odf_code`)
VALUES
  ('cccccccc-cccc-cccc-cccc-000000000080',
   'KOVACS', 'Zoltan', 'Zoltan KOVACS', 'KOVACS Zoltan.',
   NULL, NULL, NULL, NULL, NULL, NULL, 'a:0:{}', 'a:0:{}',
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL, NULL, NULL),
  ('cccccccc-cccc-cccc-cccc-000000000081',
   'FISCHER', 'Hans', 'Hans FISCHER', 'FISCHER Hans.',
   NULL, NULL, NULL, NULL, NULL, NULL, 'a:0:{}', 'a:0:{}',
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL, NULL, NULL);

-- Athletes
INSERT INTO `athlete`
  (`id`, `person_id`, `sport_event_id`, `sport_event_team_id`,
   `disqualified`, `accreditation_status`, `created`, `updated`, `deleted_at`)
VALUES
  ('cccccccc-cccc-cccc-cccc-000000000090',
   'cccccccc-cccc-cccc-cccc-000000000080',
   'cccccccc-cccc-cccc-cccc-000000000002',
   'cccccccc-cccc-cccc-cccc-000000000070',
   0, NULL, '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL),   -- Zoltan KOVACS / HUNGARY
  ('cccccccc-cccc-cccc-cccc-000000000091',
   'cccccccc-cccc-cccc-cccc-000000000081',
   'cccccccc-cccc-cccc-cccc-000000000002',
   'cccccccc-cccc-cccc-cccc-000000000071',
   0, NULL, '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL);   -- Hans FISCHER / AUSTRIA

-- Fighters: both in 86 kg GR
INSERT INTO `fighter`
  (`id`, `athlete_id`, `sport_event_weight_category_id`,
   `weight`, `draw_number`, `seed_number`, `points`,
   `created`, `updated`, `deleted_at`,
   `fighter_weight`, `fighter_status`, `fighter_status_reason`, `top_technique`)
VALUES
  ('cccccccc-cccc-cccc-cccc-000000000092',
   'cccccccc-cccc-cccc-cccc-000000000090',
   'cccccccc-cccc-cccc-cccc-000000000060',
   NULL, 1, 0, NULL,
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL,
   NULL, 0, 0, 0),   -- Zoltan KOVACS / 86 kg GR
  ('cccccccc-cccc-cccc-cccc-000000000093',
   'cccccccc-cccc-cccc-cccc-000000000091',
   'cccccccc-cccc-cccc-cccc-000000000060',
   NULL, 2, 0, NULL,
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL,
   NULL, 0, 0, 0);   -- Hans FISCHER / 86 kg GR


-- ============================================================
-- EVENT 3: [EC] - Athletes Without Fighters (intentional edge-case)
-- ============================================================

INSERT INTO `sport_event`
  (`id`, `name`, `start_date`, `end_date`, `address_locality`, `country_id`,
   `ranking_type`, `tournament_type`, `event_type`, `scoreboard_type`, `image`,
   `timezone`, `rest_time`, `countdown`, `light_scoresheet`, `copy_scoresheet`,
   `bulk_scoresheet`, `mat_assignment`, `visible`, `created`, `updated`, `deleted_at`,
   `odf_code`, `uww_ranking_type`, `local_client_id`, `remote_id`, `continent`,
   `session_type`, `remote_status`, `forbid_sync_after`, `secure`, `nb_seeds`,
   `athena_competition_id`, `video_checksum`, `scoreboard_operator`, `draw_manager_id`)
VALUES
  ('cccccccc-cccc-cccc-cccc-000000000101',
   '[EC] - Athletes Without Fighters',
   '2026-09-05 00:00:00', '2026-09-06 00:00:00',
   'Bratislava', 48,
   'individual', 'singlebracket', 'continental-championships', 'uww', NULL,
   'Europe/Bratislava', 20, 1, 0, 2, 0, 1, 1,
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL,
   NULL, NULL, NULL, NULL, 'world', '1day', NULL, 0, 0, 0, NULL, NULL, 'volunteer', NULL);

INSERT INTO `sport_event_weight_category`
  (`id`, `name`, `min_weight`, `max_weight`, `average_duration`, `rounds_number`,
   `round_duration`, `overtime`, `color`, `tournament_type`, `odf_code`,
   `created`, `updated`, `deleted_at`, `sport_event_id`,
   `audience`, `sport`, `fighters_updated`, `uww_ranking`, `blockchain_ids`,
   `session_start_day`, `mat_assignment`, `visible`, `athena_finalized`, `medal_ceremony`)
VALUES
  ('cccccccc-cccc-cccc-cccc-000000000110',
   '79 kg', 74, 79, 420, 2, 180, 0, '#8a2be2', 'singlebracket', NULL,
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL,
   'cccccccc-cccc-cccc-cccc-000000000101',
   'seniors', 'fs', '2026-06-01 10:00:00', 0, NULL, 1, 0, 1, 0, 0);

INSERT INTO `sport_event_team`
  (`id`, `country_cio_id`, `name`, `alternate_name`, `logo`, `sport_event_id`,
   `sport_event_pool_id`, `draw_number`, `continent`, `created`, `updated`, `deleted_at`)
VALUES
  ('cccccccc-cccc-cccc-cccc-000000000120',
   NULL, 'SERBIA', 'SRB', NULL, 'cccccccc-cccc-cccc-cccc-000000000101',
   NULL, NULL, 'Europe', '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL);

INSERT INTO `person`
  (`id`, `family_name`, `given_name`, `prefered_name`, `display_name`,
   `ioc_print_name`, `ioc_print_initial_name`, `ioc_tv_name`, `ioc_tv_initial_name`,
   `ioc_tv_family_name`, `athena_print_id`, `origins`, `languages`,
   `created`, `updated`, `deleted_at`, `custom_id`, `odf_code`)
VALUES
  ('cccccccc-cccc-cccc-cccc-000000000130',
   'DJORDJEVIC', 'Marko', 'Marko DJORDJEVIC', 'DJORDJEVIC Marko.',
   NULL, NULL, NULL, NULL, NULL, NULL, 'a:0:{}', 'a:0:{}',
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL, NULL, NULL),
  ('cccccccc-cccc-cccc-cccc-000000000131',
   'PETROVIC', 'Nikola', 'Nikola PETROVIC', 'PETROVIC Nikola.',
   NULL, NULL, NULL, NULL, NULL, NULL, 'a:0:{}', 'a:0:{}',
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL, NULL, NULL);

INSERT INTO `athlete`
  (`id`, `person_id`, `sport_event_id`, `sport_event_team_id`,
   `disqualified`, `accreditation_status`, `created`, `updated`, `deleted_at`)
VALUES
  ('cccccccc-cccc-cccc-cccc-000000000140',
   'cccccccc-cccc-cccc-cccc-000000000130',
   'cccccccc-cccc-cccc-cccc-000000000101',
   'cccccccc-cccc-cccc-cccc-000000000120',
   0, NULL, '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL),
  ('cccccccc-cccc-cccc-cccc-000000000141',
   'cccccccc-cccc-cccc-cccc-000000000131',
   'cccccccc-cccc-cccc-cccc-000000000101',
   'cccccccc-cccc-cccc-cccc-000000000120',
   0, NULL, '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL);

SET FOREIGN_KEY_CHECKS=1;
