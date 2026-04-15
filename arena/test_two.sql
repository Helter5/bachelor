-- ============================================================
-- Arena B: Multi-Arena Test Cup
-- Same event as Arena A (test_one.sql) — same name/date, different UUIDs.
-- This instance has teams AND athletes registered.
-- Used to test multi-Arena sync: app must resolve athletes via natural keys
-- even though all UUIDs differ from Arena A.
-- ============================================================

SET FOREIGN_KEY_CHECKS=0;

-- Event (same name/date as Arena A, different UUID prefix bbbb...)
INSERT INTO `sport_event`
  (`id`, `name`, `start_date`, `end_date`, `address_locality`, `country_id`,
   `ranking_type`, `tournament_type`, `event_type`, `scoreboard_type`, `image`,
   `timezone`, `rest_time`, `countdown`, `light_scoresheet`, `copy_scoresheet`,
   `bulk_scoresheet`, `mat_assignment`, `visible`, `created`, `updated`, `deleted_at`,
   `odf_code`, `uww_ranking_type`, `local_client_id`, `remote_id`, `continent`,
   `session_type`, `remote_status`, `forbid_sync_after`, `secure`, `nb_seeds`,
   `athena_competition_id`, `video_checksum`, `scoreboard_operator`, `draw_manager_id`)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000001',
   'Multi-Arena Test Cup',
   '2026-06-10 00:00:00', '2026-06-12 00:00:00',
   'Bratislava', 48,
   'individual', 'singlebracket', 'continental-championships', 'uww', NULL,
   'Europe/Bratislava', 20, 1, 0, 2, 0, 1, 1,
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL,
   NULL, NULL, NULL, NULL, 'world', '1day', NULL, 0, 0, 0, NULL, NULL, 'volunteer', NULL);

-- Weight categories (same max_weight/sport/audience as Arena A, different UUIDs)
INSERT INTO `sport_event_weight_category`
  (`id`, `name`, `min_weight`, `max_weight`, `average_duration`, `rounds_number`,
   `round_duration`, `overtime`, `color`, `tournament_type`, `odf_code`,
   `created`, `updated`, `deleted_at`, `sport_event_id`,
   `audience`, `sport`, `fighters_updated`, `uww_ranking`, `blockchain_ids`,
   `session_start_day`, `mat_assignment`, `visible`, `athena_finalized`, `medal_ceremony`)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000010',
   '65 kg', 0, 65, 420, 2, 180, 0, '#a500ff', 'singlebracket', NULL,
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL,
   'bbbbbbbb-bbbb-bbbb-bbbb-000000000001',
   'seniors', 'fs', '2026-06-01 10:00:00', 0, NULL, 1, 0, 1, 0, 0),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000011',
   '74 kg', 65, 74, 420, 2, 180, 0, '#005aff', 'singlebracket', NULL,
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL,
   'bbbbbbbb-bbbb-bbbb-bbbb-000000000001',
   'seniors', 'gr', '2026-06-01 10:00:00', 0, NULL, 1, 0, 1, 0, 0);

-- Teams (same names as Arena A, different UUIDs)
INSERT INTO `sport_event_team`
  (`id`, `country_cio_id`, `name`, `alternate_name`, `logo`, `sport_event_id`,
   `sport_event_pool_id`, `draw_number`, `continent`, `created`, `updated`, `deleted_at`)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000020',
   NULL, 'SLOVAKIA', 'SVK', NULL, 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001',
   NULL, NULL, 'Europe', '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000021',
   NULL, 'CZECHIA', 'CZE', NULL, 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001',
   NULL, NULL, 'Europe', '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000022',
   NULL, 'POLAND', 'POL', NULL, 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001',
   NULL, NULL, 'Europe', '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL);

-- Persons
-- prefered_name = "given_name family_name" — used by Arena API as personFullName
INSERT INTO `person`
  (`id`, `family_name`, `given_name`, `prefered_name`, `display_name`,
   `ioc_print_name`, `ioc_print_initial_name`, `ioc_tv_name`, `ioc_tv_initial_name`,
   `ioc_tv_family_name`, `athena_print_id`, `origins`, `languages`,
   `created`, `updated`, `deleted_at`, `custom_id`, `odf_code`)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000030',
   'NOVAK', 'Jan', 'Jan NOVAK', 'NOVAK Jan.',
   NULL, NULL, NULL, NULL, NULL, NULL, 'a:0:{}', 'a:0:{}',
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL, NULL, NULL),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000031',
   'CERNY', 'Petr', 'Petr CERNY', 'CERNY Petr.',
   NULL, NULL, NULL, NULL, NULL, NULL, 'a:0:{}', 'a:0:{}',
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL, NULL, NULL),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000032',
   'KOWALSKI', 'Michal', 'Michal KOWALSKI', 'KOWALSKI Michal.',
   NULL, NULL, NULL, NULL, NULL, NULL, 'a:0:{}', 'a:0:{}',
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL, NULL, NULL),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000033',
   'HORAK', 'Tomas', 'Tomas HORAK', 'HORAK Tomas.',
   NULL, NULL, NULL, NULL, NULL, NULL, 'a:0:{}', 'a:0:{}',
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL, NULL, NULL);

-- Athletes (linked to Arena B event + teams)
INSERT INTO `athlete`
  (`id`, `person_id`, `sport_event_id`, `sport_event_team_id`,
   `disqualified`, `accreditation_status`, `created`, `updated`, `deleted_at`)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000040',
   'bbbbbbbb-bbbb-bbbb-bbbb-000000000030',
   'bbbbbbbb-bbbb-bbbb-bbbb-000000000001',
   'bbbbbbbb-bbbb-bbbb-bbbb-000000000020',
   0, NULL, '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL),   -- Jan NOVAK / SLOVAKIA
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000041',
   'bbbbbbbb-bbbb-bbbb-bbbb-000000000031',
   'bbbbbbbb-bbbb-bbbb-bbbb-000000000001',
   'bbbbbbbb-bbbb-bbbb-bbbb-000000000021',
   0, NULL, '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL),   -- Petr CERNY / CZECHIA
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000042',
   'bbbbbbbb-bbbb-bbbb-bbbb-000000000032',
   'bbbbbbbb-bbbb-bbbb-bbbb-000000000001',
   'bbbbbbbb-bbbb-bbbb-bbbb-000000000022',
   0, NULL, '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL),   -- Michal KOWALSKI / POLAND
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000043',
   'bbbbbbbb-bbbb-bbbb-bbbb-000000000033',
   'bbbbbbbb-bbbb-bbbb-bbbb-000000000001',
   'bbbbbbbb-bbbb-bbbb-bbbb-000000000020',
   0, NULL, '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL);   -- Tomas HORAK / SLOVAKIA

-- Fighters: links athletes to weight categories
-- This is what the Arena API uses to populate the weightCategories[] field on each athlete.
INSERT INTO `fighter`
  (`id`, `athlete_id`, `sport_event_weight_category_id`,
   `weight`, `draw_number`, `seed_number`, `points`,
   `created`, `updated`, `deleted_at`,
   `fighter_weight`, `fighter_status`, `fighter_status_reason`, `top_technique`)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000050',
   'bbbbbbbb-bbbb-bbbb-bbbb-000000000040',
   'bbbbbbbb-bbbb-bbbb-bbbb-000000000010',
   NULL, 1, 0, NULL,
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL,
   NULL, 0, 0, 0),   -- Jan NOVAK / 65 kg FS
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000051',
   'bbbbbbbb-bbbb-bbbb-bbbb-000000000041',
   'bbbbbbbb-bbbb-bbbb-bbbb-000000000010',
   NULL, 2, 0, NULL,
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL,
   NULL, 0, 0, 0),   -- Petr CERNY / 65 kg FS
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000052',
   'bbbbbbbb-bbbb-bbbb-bbbb-000000000042',
   'bbbbbbbb-bbbb-bbbb-bbbb-000000000011',
   NULL, 1, 0, NULL,
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL,
   NULL, 0, 0, 0),   -- Michal KOWALSKI / 74 kg GR
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000053',
   'bbbbbbbb-bbbb-bbbb-bbbb-000000000043',
   'bbbbbbbb-bbbb-bbbb-bbbb-000000000011',
   NULL, 2, 0, NULL,
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL,
   NULL, 0, 0, 0);   -- Tomas HORAK / 74 kg GR

-- ============================================================
-- [EC] - Athlete Without Team (intentional edge-case)
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
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000101',
   '[EC] - Athlete Without Team',
   '2026-09-03 00:00:00', '2026-09-04 00:00:00',
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
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000110',
   '70 kg', 65, 70, 420, 2, 180, 0, '#00a88f', 'singlebracket', NULL,
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL,
   'bbbbbbbb-bbbb-bbbb-bbbb-000000000101',
   'seniors', 'gr', '2026-06-01 10:00:00', 0, NULL, 1, 0, 1, 0, 0);

INSERT INTO `sport_event_team`
  (`id`, `country_cio_id`, `name`, `alternate_name`, `logo`, `sport_event_id`,
   `sport_event_pool_id`, `draw_number`, `continent`, `created`, `updated`, `deleted_at`)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000120',
   NULL, 'LITHUANIA', 'LTU', NULL, 'bbbbbbbb-bbbb-bbbb-bbbb-000000000101',
   NULL, NULL, 'Europe', '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL);

INSERT INTO `person`
  (`id`, `family_name`, `given_name`, `prefered_name`, `display_name`,
   `ioc_print_name`, `ioc_print_initial_name`, `ioc_tv_name`, `ioc_tv_initial_name`,
   `ioc_tv_family_name`, `athena_print_id`, `origins`, `languages`,
   `created`, `updated`, `deleted_at`, `custom_id`, `odf_code`)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000130',
   'JANKAUSKAS', 'Tadas', 'Tadas JANKAUSKAS', 'JANKAUSKAS Tadas.',
   NULL, NULL, NULL, NULL, NULL, NULL, 'a:0:{}', 'a:0:{}',
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL, NULL, NULL);

INSERT INTO `athlete`
  (`id`, `person_id`, `sport_event_id`, `sport_event_team_id`,
   `disqualified`, `accreditation_status`, `created`, `updated`, `deleted_at`)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000140',
   'bbbbbbbb-bbbb-bbbb-bbbb-000000000130',
   'bbbbbbbb-bbbb-bbbb-bbbb-000000000101',
   NULL,
   0, NULL, '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL);

INSERT INTO `fighter`
  (`id`, `athlete_id`, `sport_event_weight_category_id`,
   `weight`, `draw_number`, `seed_number`, `points`,
   `created`, `updated`, `deleted_at`,
   `fighter_weight`, `fighter_status`, `fighter_status_reason`, `top_technique`)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000150',
   'bbbbbbbb-bbbb-bbbb-bbbb-000000000140',
   'bbbbbbbb-bbbb-bbbb-bbbb-000000000110',
   NULL, 1, 0, NULL,
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL,
   NULL, 0, 0, 0);

SET FOREIGN_KEY_CHECKS=1;
