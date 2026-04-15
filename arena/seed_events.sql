-- ============================================================
-- Arena: Event-only refresh (no teams / no weight categories / no athletes)
-- Run:
--   docker cp arena/seed_events.sql arena-mysql-1:/tmp/seed_events.sql
--   docker exec arena-mysql-1 mysql -uarena -parena arena -e "source /tmp/seed_events.sql"
-- Result:
--   Keeps base sport_event rows and initializes sessions/mats for 4 events.
--   No teams, no weight categories, no athletes.
-- ============================================================

-- Delete fight-related data first
DELETE rtp
FROM `round_technical_point` rtp
JOIN `round` r ON r.id = rtp.round_id
JOIN `fight` f ON f.id = r.fight_id
WHERE f.sport_event_id IN (
  'aaaaaaaa-0001-0001-0001-000000000001',
  'aaaaaaaa-0002-0002-0002-000000000002',
  'aaaaaaaa-0003-0003-0003-000000000003',
  'aaaaaaaa-0004-0004-0004-000000000004'
);

DELETE rc
FROM `round_caution` rc
JOIN `round` r ON r.id = rc.round_id
JOIN `fight` f ON f.id = r.fight_id
WHERE f.sport_event_id IN (
  'aaaaaaaa-0001-0001-0001-000000000001',
  'aaaaaaaa-0002-0002-0002-000000000002',
  'aaaaaaaa-0003-0003-0003-000000000003',
  'aaaaaaaa-0004-0004-0004-000000000004'
);

DELETE rtl
FROM `round_technical_point_live` rtl
JOIN `round` r ON r.id = rtl.round_id
JOIN `fight` f ON f.id = r.fight_id
WHERE f.sport_event_id IN (
  'aaaaaaaa-0001-0001-0001-000000000001',
  'aaaaaaaa-0002-0002-0002-000000000002',
  'aaaaaaaa-0003-0003-0003-000000000003',
  'aaaaaaaa-0004-0004-0004-000000000004'
);

DELETE fr
FROM `fight_referee` fr
JOIN `fight` f ON f.id = fr.fight_id
WHERE f.sport_event_id IN (
  'aaaaaaaa-0001-0001-0001-000000000001',
  'aaaaaaaa-0002-0002-0002-000000000002',
  'aaaaaaaa-0003-0003-0003-000000000003',
  'aaaaaaaa-0004-0004-0004-000000000004'
);

DELETE r
FROM `round` r
JOIN `fight` f ON f.id = r.fight_id
WHERE f.sport_event_id IN (
  'aaaaaaaa-0001-0001-0001-000000000001',
  'aaaaaaaa-0002-0002-0002-000000000002',
  'aaaaaaaa-0003-0003-0003-000000000003',
  'aaaaaaaa-0004-0004-0004-000000000004'
);

DELETE FROM `fight`
WHERE sport_event_id IN (
  'aaaaaaaa-0001-0001-0001-000000000001',
  'aaaaaaaa-0002-0002-0002-000000000002',
  'aaaaaaaa-0003-0003-0003-000000000003',
  'aaaaaaaa-0004-0004-0004-000000000004'
);

-- Delete athlete-related data
DELETE fi
FROM `fighter` fi
JOIN `athlete` a ON a.id = fi.athlete_id
WHERE a.sport_event_id IN (
  'aaaaaaaa-0001-0001-0001-000000000001',
  'aaaaaaaa-0002-0002-0002-000000000002',
  'aaaaaaaa-0003-0003-0003-000000000003',
  'aaaaaaaa-0004-0004-0004-000000000004'
);

DELETE FROM `athlete`
WHERE sport_event_id IN (
  'aaaaaaaa-0001-0001-0001-000000000001',
  'aaaaaaaa-0002-0002-0002-000000000002',
  'aaaaaaaa-0003-0003-0003-000000000003',
  'aaaaaaaa-0004-0004-0004-000000000004'
);

DELETE FROM `referee`
WHERE sport_event_id IN (
  'aaaaaaaa-0001-0001-0001-000000000001',
  'aaaaaaaa-0002-0002-0002-000000000002',
  'aaaaaaaa-0003-0003-0003-000000000003',
  'aaaaaaaa-0004-0004-0004-000000000004'
);

DELETE FROM `activity`
WHERE sport_event_id IN (
  'aaaaaaaa-0001-0001-0001-000000000001',
  'aaaaaaaa-0002-0002-0002-000000000002',
  'aaaaaaaa-0003-0003-0003-000000000003',
  'aaaaaaaa-0004-0004-0004-000000000004'
);

-- Delete event structure (teams/WCs/sessions/mats)
DELETE fm
FROM `fight_mat` fm
JOIN `sport_event_session` ses ON ses.id = fm.sport_event_session_id
WHERE ses.sport_event_id IN (
  'aaaaaaaa-0001-0001-0001-000000000001',
  'aaaaaaaa-0002-0002-0002-000000000002',
  'aaaaaaaa-0003-0003-0003-000000000003',
  'aaaaaaaa-0004-0004-0004-000000000004'
);

DELETE FROM `sport_event_mat`
WHERE sport_event_id IN (
  'aaaaaaaa-0001-0001-0001-000000000001',
  'aaaaaaaa-0002-0002-0002-000000000002',
  'aaaaaaaa-0003-0003-0003-000000000003',
  'aaaaaaaa-0004-0004-0004-000000000004'
);

DELETE FROM `sport_event_session`
WHERE sport_event_id IN (
  'aaaaaaaa-0001-0001-0001-000000000001',
  'aaaaaaaa-0002-0002-0002-000000000002',
  'aaaaaaaa-0003-0003-0003-000000000003',
  'aaaaaaaa-0004-0004-0004-000000000004'
);

DELETE FROM `sport_event_weight_category`
WHERE sport_event_id IN (
  'aaaaaaaa-0001-0001-0001-000000000001',
  'aaaaaaaa-0002-0002-0002-000000000002',
  'aaaaaaaa-0003-0003-0003-000000000003',
  'aaaaaaaa-0004-0004-0004-000000000004'
);

DELETE FROM `sport_event_team`
WHERE sport_event_id IN (
  'aaaaaaaa-0001-0001-0001-000000000001',
  'aaaaaaaa-0002-0002-0002-000000000002',
  'aaaaaaaa-0003-0003-0003-000000000003',
  'aaaaaaaa-0004-0004-0004-000000000004'
);

-- Recreate only base events
DELETE FROM `sport_event`
WHERE `id` IN (
  'aaaaaaaa-0001-0001-0001-000000000001',
  'aaaaaaaa-0002-0002-0002-000000000002',
  'aaaaaaaa-0003-0003-0003-000000000003',
  'aaaaaaaa-0004-0004-0004-000000000004'
);

INSERT INTO `sport_event`
  (`id`, `name`, `start_date`, `end_date`, `address_locality`, `country_id`,
   `ranking_type`, `tournament_type`, `event_type`, `scoreboard_type`, `image`,
   `timezone`, `rest_time`, `countdown`, `light_scoresheet`, `copy_scoresheet`,
   `bulk_scoresheet`, `mat_assignment`, `visible`, `created`, `updated`, `deleted_at`,
   `odf_code`, `uww_ranking_type`, `local_client_id`, `remote_id`, `continent`,
   `session_type`, `remote_status`, `forbid_sync_after`, `secure`, `nb_seeds`,
   `athena_competition_id`, `video_checksum`, `scoreboard_operator`, `draw_manager_id`)
VALUES
  ('aaaaaaaa-0001-0001-0001-000000000001',
   'Central European Championship 2026',
   '2026-06-10 00:00:00', '2026-06-12 00:00:00',
   'Bratislava', 178,
   'individual', 'singlebracket', 'continental-championships', 'uww', NULL,
   'Europe/Bratislava', 20, 1, 0, 2, 0, 1, 1,
   NOW(), NOW(), NULL,
   NULL, NULL, NULL, NULL, 'europe', '1day', NULL, 0, 0, 0, NULL, NULL, 'volunteer', NULL),

  ('aaaaaaaa-0002-0002-0002-000000000002',
   'Slovak Open 2026',
   '2026-03-14 00:00:00', '2026-03-15 00:00:00',
   'Trnava', 178,
   'individual', 'singlebracket', 'international-tournament', 'uww', NULL,
   'Europe/Bratislava', 20, 1, 0, 2, 0, 1, 1,
   NOW(), NOW(), NULL,
   NULL, NULL, NULL, NULL, 'europe', '1day', NULL, 0, 0, 0, NULL, NULL, 'volunteer', NULL),

  ('aaaaaaaa-0003-0003-0003-000000000003',
   'Danube Open 2026',
   '2026-09-05 00:00:00', '2026-09-06 00:00:00',
   'Budapest', 84,
   'individual', 'singlebracket', 'international-tournament', 'uww', NULL,
   'Europe/Budapest', 20, 1, 0, 2, 0, 1, 1,
   NOW(), NOW(), NULL,
   NULL, NULL, NULL, NULL, 'europe', '1day', NULL, 0, 0, 0, NULL, NULL, 'volunteer', NULL),

  ('aaaaaaaa-0004-0004-0004-000000000004',
   'Winter Wrestling Cup Bratislava 2026',
   '2026-12-05 00:00:00', '2026-12-06 00:00:00',
   'Bratislava', 178,
   'individual', 'singlebracket', 'international-tournament', 'uww', NULL,
   'Europe/Bratislava', 20, 1, 0, 2, 0, 1, 1,
   NOW(), NOW(), NULL,
   NULL, NULL, NULL, NULL, 'europe', '1day', NULL, 0, 0, 0, NULL, NULL, 'volunteer', NULL);

-- Create sessions A/B for each event
INSERT INTO `sport_event_session`
  (`id`, `name`, `sport_event_id`, `start_date`, `end_date`, `weight`, `created`, `updated`, `deleted_at`)
VALUES
  ('s1-a-0001-0001-0001-000000000001', 'A', 'aaaaaaaa-0001-0001-0001-000000000001', '2026-06-10 00:00:00', '2026-06-12 00:00:00', NULL, NOW(), NOW(), NULL),
  ('s1-b-0001-0001-0001-000000000001', 'B', 'aaaaaaaa-0001-0001-0001-000000000001', '2026-06-10 00:00:00', '2026-06-12 00:00:00', NULL, NOW(), NOW(), NULL),
  ('s2-a-0002-0002-0002-000000000002', 'A', 'aaaaaaaa-0002-0002-0002-000000000002', '2026-03-14 00:00:00', '2026-03-15 00:00:00', NULL, NOW(), NOW(), NULL),
  ('s2-b-0002-0002-0002-000000000002', 'B', 'aaaaaaaa-0002-0002-0002-000000000002', '2026-03-14 00:00:00', '2026-03-15 00:00:00', NULL, NOW(), NOW(), NULL),
  ('s3-a-0003-0003-0003-000000000003', 'A', 'aaaaaaaa-0003-0003-0003-000000000003', '2026-09-05 00:00:00', '2026-09-06 00:00:00', NULL, NOW(), NOW(), NULL),
  ('s3-b-0003-0003-0003-000000000003', 'B', 'aaaaaaaa-0003-0003-0003-000000000003', '2026-09-05 00:00:00', '2026-09-06 00:00:00', NULL, NOW(), NOW(), NULL),
  ('s4-a-0004-0004-0004-000000000004', 'A', 'aaaaaaaa-0004-0004-0004-000000000004', '2026-12-05 00:00:00', '2026-12-06 00:00:00', NULL, NOW(), NOW(), NULL),
  ('s4-b-0004-0004-0004-000000000004', 'B', 'aaaaaaaa-0004-0004-0004-000000000004', '2026-12-05 00:00:00', '2026-12-06 00:00:00', NULL, NOW(), NOW(), NULL);

-- Create minimal origin teams needed by referee imports
-- Referee files use country codes: AUT,BUL,CRO,CZE,GER,HUN,POL,ROU,SLO,SVK
INSERT INTO `sport_event_team`
  (`id`, `country_cio_id`, `name`, `alternate_name`, `logo`, `sport_event_id`,
   `sport_event_pool_id`, `draw_number`, `continent`, `created`, `updated`, `deleted_at`)
SELECT
  UUID(),
  NULL,
  c.country_name,
  c.code,
  NULL,
  se.id,
  NULL,
  NULL,
  'Europe',
  NOW(),
  NOW(),
  NULL
FROM `sport_event` se
JOIN (
  SELECT 'AUT' AS code, 'AUSTRIA' AS country_name
  UNION ALL SELECT 'BUL', 'BULGARIA'
  UNION ALL SELECT 'CRO', 'CROATIA'
  UNION ALL SELECT 'CZE', 'CZECHIA'
  UNION ALL SELECT 'GER', 'GERMANY'
  UNION ALL SELECT 'HUN', 'HUNGARY'
  UNION ALL SELECT 'POL', 'POLAND'
  UNION ALL SELECT 'ROU', 'ROMANIA'
  UNION ALL SELECT 'SLO', 'SLOVENIA'
  UNION ALL SELECT 'SVK', 'SLOVAKIA'
) c
WHERE se.id IN (
  'aaaaaaaa-0001-0001-0001-000000000001',
  'aaaaaaaa-0002-0002-0002-000000000002',
  'aaaaaaaa-0003-0003-0003-000000000003',
  'aaaaaaaa-0004-0004-0004-000000000004'
);

-- Create mats Mat A / Mat B for each event
INSERT INTO `sport_event_mat`
  (`id`, `sport_event_id`, `name`, `created`, `updated`, `deleted_at`)
VALUES
  ('m1-a-0001-0001-0001-000000000001', 'aaaaaaaa-0001-0001-0001-000000000001', 'Mat A', NOW(), NOW(), NULL),
  ('m1-b-0001-0001-0001-000000000001', 'aaaaaaaa-0001-0001-0001-000000000001', 'Mat B', NOW(), NOW(), NULL),
  ('m2-a-0002-0002-0002-000000000002', 'aaaaaaaa-0002-0002-0002-000000000002', 'Mat A', NOW(), NOW(), NULL),
  ('m2-b-0002-0002-0002-000000000002', 'aaaaaaaa-0002-0002-0002-000000000002', 'Mat B', NOW(), NOW(), NULL),
  ('m3-a-0003-0003-0003-000000000003', 'aaaaaaaa-0003-0003-0003-000000000003', 'Mat A', NOW(), NOW(), NULL),
  ('m3-b-0003-0003-0003-000000000003', 'aaaaaaaa-0003-0003-0003-000000000003', 'Mat B', NOW(), NOW(), NULL),
  ('m4-a-0004-0004-0004-000000000004', 'aaaaaaaa-0004-0004-0004-000000000004', 'Mat A', NOW(), NOW(), NULL),
  ('m4-b-0004-0004-0004-000000000004', 'aaaaaaaa-0004-0004-0004-000000000004', 'Mat B', NOW(), NOW(), NULL);

-- Link each session to both mats (4 links per event)
INSERT INTO `fight_mat`
  (`id`, `sport_event_session_id`, `sport_event_mat_id`, `created`, `updated`, `deleted_at`)
VALUES
  ('fm1-1-0001-0001-0001-000000000001', 's1-a-0001-0001-0001-000000000001', 'm1-a-0001-0001-0001-000000000001', NOW(), NOW(), NULL),
  ('fm1-2-0001-0001-0001-000000000001', 's1-a-0001-0001-0001-000000000001', 'm1-b-0001-0001-0001-000000000001', NOW(), NOW(), NULL),
  ('fm1-3-0001-0001-0001-000000000001', 's1-b-0001-0001-0001-000000000001', 'm1-a-0001-0001-0001-000000000001', NOW(), NOW(), NULL),
  ('fm1-4-0001-0001-0001-000000000001', 's1-b-0001-0001-0001-000000000001', 'm1-b-0001-0001-0001-000000000001', NOW(), NOW(), NULL),
  ('fm2-1-0002-0002-0002-000000000002', 's2-a-0002-0002-0002-000000000002', 'm2-a-0002-0002-0002-000000000002', NOW(), NOW(), NULL),
  ('fm2-2-0002-0002-0002-000000000002', 's2-a-0002-0002-0002-000000000002', 'm2-b-0002-0002-0002-000000000002', NOW(), NOW(), NULL),
  ('fm2-3-0002-0002-0002-000000000002', 's2-b-0002-0002-0002-000000000002', 'm2-a-0002-0002-0002-000000000002', NOW(), NOW(), NULL),
  ('fm2-4-0002-0002-0002-000000000002', 's2-b-0002-0002-0002-000000000002', 'm2-b-0002-0002-0002-000000000002', NOW(), NOW(), NULL),
  ('fm3-1-0003-0003-0003-000000000003', 's3-a-0003-0003-0003-000000000003', 'm3-a-0003-0003-0003-000000000003', NOW(), NOW(), NULL),
  ('fm3-2-0003-0003-0003-000000000003', 's3-a-0003-0003-0003-000000000003', 'm3-b-0003-0003-0003-000000000003', NOW(), NOW(), NULL),
  ('fm3-3-0003-0003-0003-000000000003', 's3-b-0003-0003-0003-000000000003', 'm3-a-0003-0003-0003-000000000003', NOW(), NOW(), NULL),
  ('fm3-4-0003-0003-0003-000000000003', 's3-b-0003-0003-0003-000000000003', 'm3-b-0003-0003-0003-000000000003', NOW(), NOW(), NULL),
  ('fm4-1-0004-0004-0004-000000000004', 's4-a-0004-0004-0004-000000000004', 'm4-a-0004-0004-0004-000000000004', NOW(), NOW(), NULL),
  ('fm4-2-0004-0004-0004-000000000004', 's4-a-0004-0004-0004-000000000004', 'm4-b-0004-0004-0004-000000000004', NOW(), NOW(), NULL),
  ('fm4-3-0004-0004-0004-000000000004', 's4-b-0004-0004-0004-000000000004', 'm4-a-0004-0004-0004-000000000004', NOW(), NOW(), NULL),
  ('fm4-4-0004-0004-0004-000000000004', 's4-b-0004-0004-0004-000000000004', 'm4-b-0004-0004-0004-000000000004', NOW(), NOW(), NULL);
