-- ============================================================
-- Arena A: Multi-Arena Test Cup
-- Same event as Arena B (test_two.sql), but ONLY teams — no athletes.
-- Used to test multi-Arena sync: after syncing both Arenas,
-- the app should merge them into ONE sport_event with shared teams.
-- ============================================================

SET FOREIGN_KEY_CHECKS=0;

-- Event
INSERT INTO `sport_event`
  (`id`, `name`, `start_date`, `end_date`, `address_locality`, `country_id`,
   `ranking_type`, `tournament_type`, `event_type`, `scoreboard_type`, `image`,
   `timezone`, `rest_time`, `countdown`, `light_scoresheet`, `copy_scoresheet`,
   `bulk_scoresheet`, `mat_assignment`, `visible`, `created`, `updated`, `deleted_at`,
   `odf_code`, `uww_ranking_type`, `local_client_id`, `remote_id`, `continent`,
   `session_type`, `remote_status`, `forbid_sync_after`, `secure`, `nb_seeds`,
   `athena_competition_id`, `video_checksum`, `scoreboard_operator`, `draw_manager_id`)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000001',
   'Multi-Arena Test Cup',
   '2026-06-10 00:00:00', '2026-06-12 00:00:00',
   'Bratislava', NULL,
   'individual', 'singlebracket', 'continental-championships', 'uww', NULL,
   'Europe/Bratislava', 20, 1, 0, 2, 0, 1, 1,
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL,
   NULL, NULL, NULL, NULL, 'world', '1day', NULL, 0, 0, 0, NULL, NULL, 'volunteer', NULL);

-- Weight categories
INSERT INTO `sport_event_weight_category`
  (`id`, `name`, `min_weight`, `max_weight`, `average_duration`, `rounds_number`,
   `round_duration`, `overtime`, `color`, `tournament_type`, `odf_code`,
   `created`, `updated`, `deleted_at`, `sport_event_id`,
   `audience`, `sport`, `fighters_updated`, `uww_ranking`, `blockchain_ids`,
   `session_start_day`, `mat_assignment`, `visible`, `athena_finalized`, `medal_ceremony`)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000010',
   '65 kg', 0, 65, 420, 2, 180, 0, '#a500ff', 'singlebracket', NULL,
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL,
   'aaaaaaaa-aaaa-aaaa-aaaa-000000000001',
   'seniors', 'fs', '2026-06-01 10:00:00', 0, NULL, 1, 0, 1, 0, 0),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000011',
   '74 kg', 65, 74, 420, 2, 180, 0, '#005aff', 'singlebracket', NULL,
   '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL,
   'aaaaaaaa-aaaa-aaaa-aaaa-000000000001',
   'seniors', 'gr', '2026-06-01 10:00:00', 0, NULL, 1, 0, 1, 0, 0);

-- Teams (no athletes registered from this Arena)
INSERT INTO `sport_event_team`
  (`id`, `country_cio_id`, `name`, `alternate_name`, `logo`, `sport_event_id`,
   `sport_event_pool_id`, `draw_number`, `continent`, `created`, `updated`, `deleted_at`)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000020',
   NULL, 'SLOVAKIA', 'SVK', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001',
   NULL, NULL, 'Europe', '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000021',
   NULL, 'CZECHIA', 'CZE', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001',
   NULL, NULL, 'Europe', '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000022',
   NULL, 'POLAND', 'POL', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001',
   NULL, NULL, 'Europe', '2026-06-01 10:00:00', '2026-06-01 10:00:00', NULL);

-- No persons, athletes, or fighters for Arena A

SET FOREIGN_KEY_CHECKS=1;
