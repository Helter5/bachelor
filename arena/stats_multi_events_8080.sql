-- ============================================================
-- Arena A (:8080): Stats-oriented multi-event seed
--
-- Purpose:
--   - 5 events on one Arena source for statistics testing
--   - Same 32 persons reused across all events
--   - Team assignment varies per event (some same, some shuffled)
--   - 1 weight category per event (74 kg GR), 32 athletes each
--   - No fights inserted (you can create fights manually later)
--
-- Run:
--   docker exec -i arena-mysql-1 mysql -uarena -parena arena < arena/stats_multi_events_8080.sql
-- ============================================================

SET FOREIGN_KEY_CHECKS=0;

-- Cleanup only this seed namespace (safe re-run)
DELETE FROM `fighter`
WHERE `id` LIKE 'dddd7003-%'
   OR `athlete_id` LIKE 'dddd7002-%'
   OR `sport_event_weight_category_id` LIKE 'dddd7005-%';

DELETE FROM `athlete`
WHERE `id` LIKE 'dddd7002-%'
   OR `sport_event_id` LIKE 'dddd7001-%';

DELETE FROM `person`
WHERE `id` LIKE 'dddd7000-%';

DELETE FROM `sport_event_team`
WHERE `id` LIKE 'dddd7004-%'
   OR `sport_event_id` LIKE 'dddd7001-%';

DELETE FROM `sport_event_weight_category`
WHERE `id` LIKE 'dddd7005-%'
   OR `sport_event_id` LIKE 'dddd7001-%';

DELETE FROM `sport_event`
WHERE `id` LIKE 'dddd7001-%';

-- Cleanup for dedicated all-teams/all-weight-types test event
DELETE FROM `fighter`
WHERE `id` LIKE 'dddd7993-%'
  OR `sport_event_weight_category_id` LIKE 'dddd7995-%';

DELETE FROM `sport_event_team`
WHERE `id` LIKE 'dddd7994-%'
  OR `sport_event_id` = 'dddd7991-7991-7991-7991-000000000001';

DELETE FROM `sport_event_weight_category`
WHERE `id` LIKE 'dddd7995-%'
  OR `sport_event_id` = 'dddd7991-7991-7991-7991-000000000001';

DELETE FROM `sport_event`
WHERE `id` = 'dddd7991-7991-7991-7991-000000000001';

DROP TEMPORARY TABLE IF EXISTS `tmp_seed_event`;
CREATE TEMPORARY TABLE `tmp_seed_event` (
  `event_no` INT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `start_date` DATETIME NOT NULL,
  `end_date` DATETIME NOT NULL,
  `locality` VARCHAR(255) NOT NULL
);

INSERT INTO `tmp_seed_event` (`event_no`, `name`, `start_date`, `end_date`, `locality`) VALUES
  (1, 'Stats Cup Alpha 2026',   '2026-10-01 00:00:00', '2026-10-02 00:00:00', 'Bratislava'),
  (2, 'Stats Cup Beta 2026',    '2026-10-10 00:00:00', '2026-10-11 00:00:00', 'Bratislava'),
  (3, 'Stats Cup Gamma 2026',   '2026-10-20 00:00:00', '2026-10-21 00:00:00', 'Kosice'),
  (4, 'Stats Cup Delta 2026',   '2026-11-01 00:00:00', '2026-11-02 00:00:00', 'Brno'),
  (5, 'Stats Cup Epsilon 2026', '2026-11-12 00:00:00', '2026-11-13 00:00:00', 'Budapest');

INSERT INTO `sport_event`
  (`id`, `name`, `start_date`, `end_date`, `address_locality`, `country_id`,
   `ranking_type`, `tournament_type`, `event_type`, `scoreboard_type`, `image`,
   `timezone`, `rest_time`, `countdown`, `light_scoresheet`, `copy_scoresheet`,
   `bulk_scoresheet`, `mat_assignment`, `visible`, `created`, `updated`, `deleted_at`,
   `odf_code`, `uww_ranking_type`, `local_client_id`, `remote_id`, `continent`,
   `session_type`, `remote_status`, `forbid_sync_after`, `secure`, `nb_seeds`,
   `athena_competition_id`, `video_checksum`, `scoreboard_operator`, `draw_manager_id`)
SELECT
  CONCAT('dddd7001-7001-7001-', LPAD(`event_no`, 4, '0'), '-000000000001') AS `id`,
  `name`, `start_date`, `end_date`, `locality`, 178,
  'individual', 'singlebracket', 'continental-championships', 'uww', NULL,
  'Europe/Bratislava', 20, 1, 0, 2, 0, 1, 1, NOW(), NOW(), NULL,
  NULL, NULL, NULL, NULL, 'europe', '1day', NULL, 0, 0, 0, NULL, NULL, 'volunteer', NULL
FROM `tmp_seed_event`;

INSERT INTO `sport_event_weight_category`
  (`id`, `name`, `min_weight`, `max_weight`, `average_duration`, `rounds_number`,
   `round_duration`, `overtime`, `color`, `tournament_type`, `odf_code`,
   `created`, `updated`, `deleted_at`, `sport_event_id`,
   `audience`, `sport`, `fighters_updated`, `uww_ranking`, `blockchain_ids`,
   `session_start_day`, `mat_assignment`, `visible`, `athena_finalized`, `medal_ceremony`)
SELECT
  CONCAT('dddd7005-7005-7005-', LPAD(`event_no`, 4, '0'), '-000000000001') AS `id`,
  '74 kg', 65, 74, 420, 2, 180, 0, '#005aff', 'singlebracket', NULL,
  NOW(), NOW(), NULL,
  CONCAT('dddd7001-7001-7001-', LPAD(`event_no`, 4, '0'), '-000000000001') AS `sport_event_id`,
  'seniors', 'gr', NOW(), 0, NULL, 1, 0, 1, 0, 0
FROM `tmp_seed_event`;

DROP TEMPORARY TABLE IF EXISTS `tmp_seed_team`;
CREATE TEMPORARY TABLE `tmp_seed_team` (
  `event_no` INT NOT NULL,
  `team_no` INT NOT NULL,
  `country_cio_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `alternate_name` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`event_no`, `team_no`)
);

-- Event 1 + 2 use same national teams, 3/4/5 use different team names
INSERT INTO `tmp_seed_team` (`event_no`, `team_no`, `country_cio_id`, `name`, `alternate_name`) VALUES
  (1, 1, 178, 'SLOVAKIA',       'SVK'),
  (1, 2,  51, 'CZECHIA',        'CZE'),
  (1, 3,  84, 'HUNGARY',        'HUN'),
  (1, 4, 153, 'POLAND',         'POL'),

  (2, 1, 178, 'SLOVAKIA',       'SVK'),
  (2, 2,  51, 'CZECHIA',        'CZE'),
  (2, 3,  84, 'HUNGARY',        'HUN'),
  (2, 4, 153, 'POLAND',         'POL'),

  (3, 1, 178, 'SLOVAKIA',       'SVK'),
  (3, 2,  11, 'AUSTRALIA',      'AUS'),
  (3, 3,   8, 'ARMENIA',        'ARM'),
  (3, 4,   7, 'ARGENTINA',      'ARG'),

  (4, 1,   3, 'ALGERIA',        'ALG'),
  (4, 2,   2, 'ALBANIA',        'ALB'),
  (4, 3,   5, 'ANGOLA',         'ANG'),
  (4, 4,   1, 'AFGHANISTAN',    'AFG'),

  (5, 1,  10, 'AMERICAN SAMOA', 'ASA'),
  (5, 2, 115, 'LITHUANIA',      'LTU'),
  (5, 3, 153, 'POLAND',         'POL'),
  (5, 4, 178, 'SLOVAKIA',       'SVK');

INSERT INTO `sport_event_team`
  (`id`, `country_cio_id`, `name`, `alternate_name`, `logo`, `sport_event_id`,
   `sport_event_pool_id`, `draw_number`, `continent`, `created`, `updated`, `deleted_at`)
SELECT
  CONCAT('dddd7004-7004-7004-', LPAD(`event_no`, 4, '0'), '-', LPAD(`team_no`, 12, '0')) AS `id`,
  `country_cio_id`,
  `name`,
  `alternate_name`,
  NULL,
  CONCAT('dddd7001-7001-7001-', LPAD(`event_no`, 4, '0'), '-000000000001') AS `sport_event_id`,
  NULL, NULL, 'Europe', NOW(), NOW(), NULL
FROM `tmp_seed_team`;

DROP TEMPORARY TABLE IF EXISTS `tmp_seed_num`;
CREATE TEMPORARY TABLE `tmp_seed_num` (`n` INT PRIMARY KEY);
INSERT INTO `tmp_seed_num` (`n`) VALUES
(1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13),(14),(15),(16),
(17),(18),(19),(20),(21),(22),(23),(24),(25),(26),(27),(28),(29),(30),(31),(32);

DROP TEMPORARY TABLE IF EXISTS `tmp_seed_person`;
CREATE TEMPORARY TABLE `tmp_seed_person` (
  `n` INT PRIMARY KEY,
  `given_name` VARCHAR(255) NOT NULL,
  `family_name` VARCHAR(255) NOT NULL
);

INSERT INTO `tmp_seed_person` (`n`, `given_name`, `family_name`) VALUES
  (1,  'Jan',      'NOVAK'),
  (2,  'Petr',     'CERNY'),
  (3,  'Tomas',    'HORAK'),
  (4,  'Michal',   'KOWALSKI'),
  (5,  'Marek',    'SZABO'),
  (6,  'David',    'VARGA'),
  (7,  'Adam',     'KOVACS'),
  (8,  'Martin',   'KISS'),
  (9,  'Lukasz',   'WISNIEWSKI'),
  (10, 'Jakub',    'NOWAK'),
  (11, 'Filip',    'NAGY'),
  (12, 'Ondrej',   'DVORAK'),
  (13, 'Patrik',   'MALY'),
  (14, 'Daniel',   'HORVATH'),
  (15, 'Roman',    'POLAK'),
  (16, 'Matej',    'HLAVATY'),
  (17, 'Viktor',   'SIMON'),
  (18, 'Erik',     'TOTH'),
  (19, 'Jozef',    'MRAZ'),
  (20, 'Richard',  'NEMETH'),
  (21, 'Peter',    'RUSNAK'),
  (22, 'Samuel',   'KRAUS'),
  (23, 'Kristian', 'PAP'),
  (24, 'Sebastian','FARKAS'),
  (25, 'Oliver',   'BALOG'),
  (26, 'Dominik',  'BARTA'),
  (27, 'Juraj',    'KUBIK'),
  (28, 'Rastislav','KLEN'),
  (29, 'Nikolas',  'SIPOS'),
  (30, 'Denis',    'GAZDAG'),
  (31, 'Alex',     'MARTON'),
  (32, 'Milan',    'ZELENKA');

-- 32 shared persons (reused in all 5 events)
INSERT INTO `person`
  (`id`, `family_name`, `given_name`, `prefered_name`, `display_name`,
   `ioc_print_name`, `ioc_print_initial_name`, `ioc_tv_name`, `ioc_tv_initial_name`,
   `ioc_tv_family_name`, `athena_print_id`, `origins`, `languages`,
   `created`, `updated`, `deleted_at`, `custom_id`, `odf_code`)
SELECT
  CONCAT('dddd7000-7000-7000-7000-', LPAD(`n`, 12, '0')) AS `id`,
  `family_name`,
  `given_name`,
  CONCAT(`given_name`, ' ', `family_name`) AS `prefered_name`,
  CONCAT(`family_name`, ' ', `given_name`, '.') AS `display_name`,
  NULL, NULL, NULL, NULL, NULL, NULL,
  'a:0:{}', 'a:0:{}',
  NOW(), NOW(), NULL, NULL, NULL
FROM `tmp_seed_person`;

-- 160 athletes: same persons repeated across all 5 events
INSERT INTO `athlete`
  (`id`, `person_id`, `sport_event_id`, `sport_event_team_id`,
   `disqualified`, `accreditation_status`, `created`, `updated`, `deleted_at`)
SELECT
  CONCAT('dddd7002-7002-7002-', LPAD(e.`event_no`, 4, '0'), '-', LPAD(n.`n`, 12, '0')) AS `id`,
  CONCAT('dddd7000-7000-7000-7000-', LPAD(n.`n`, 12, '0')) AS `person_id`,
  CONCAT('dddd7001-7001-7001-', LPAD(e.`event_no`, 4, '0'), '-000000000001') AS `sport_event_id`,
  CONCAT(
    'dddd7004-7004-7004-', LPAD(e.`event_no`, 4, '0'), '-',
    LPAD(
      CASE
        WHEN e.`event_no` IN (1, 2) THEN
          CASE
            WHEN n.`n` <= 8 THEN 1
            WHEN n.`n` <= 16 THEN 2
            WHEN n.`n` <= 24 THEN 3
            ELSE 4
          END
        WHEN e.`event_no` = 3 THEN
          CASE
            WHEN n.`n` <= 8 THEN 2
            WHEN n.`n` <= 16 THEN 3
            WHEN n.`n` <= 24 THEN 4
            ELSE 1
          END
        WHEN e.`event_no` = 4 THEN
          CASE
            WHEN n.`n` <= 8 THEN 3
            WHEN n.`n` <= 16 THEN 4
            WHEN n.`n` <= 24 THEN 1
            ELSE 2
          END
        ELSE
          CASE MOD(n.`n` - 1, 4)
            WHEN 0 THEN 4
            WHEN 1 THEN 1
            WHEN 2 THEN 2
            ELSE 3
          END
      END,
      12,
      '0'
    )
  ) AS `sport_event_team_id`,
  0,
  NULL,
  NOW(), NOW(), NULL
FROM `tmp_seed_event` e
CROSS JOIN `tmp_seed_num` n;

-- 160 fighters: all athletes in one WC per event
INSERT INTO `fighter`
  (`id`, `athlete_id`, `sport_event_weight_category_id`,
   `weight`, `draw_number`, `seed_number`, `points`,
   `created`, `updated`, `deleted_at`,
   `fighter_weight`, `fighter_status`, `fighter_status_reason`, `top_technique`)
SELECT
  CONCAT('dddd7003-7003-7003-', LPAD(e.`event_no`, 4, '0'), '-', LPAD(n.`n`, 12, '0')) AS `id`,
  CONCAT('dddd7002-7002-7002-', LPAD(e.`event_no`, 4, '0'), '-', LPAD(n.`n`, 12, '0')) AS `athlete_id`,
  CONCAT('dddd7005-7005-7005-', LPAD(e.`event_no`, 4, '0'), '-000000000001') AS `sport_event_weight_category_id`,
  NULL,
  n.`n` AS `draw_number`,
  0,
  NULL,
  NOW(), NOW(), NULL,
  NULL, 0, 0, 0
FROM `tmp_seed_event` e
CROSS JOIN `tmp_seed_num` n;

-- ============================================================
-- [TEST] Event with all teams and all weight-category types
-- No athletes/fights by design.
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
  ('dddd7991-7991-7991-7991-000000000001',
   '[TEST] All Teams & Weight Categories 2026',
   '2026-12-01 00:00:00', '2026-12-03 00:00:00',
   'Bratislava', 178,
   'individual', 'singlebracket', 'continental-championships', 'uww', NULL,
   'Europe/Bratislava', 20, 1, 0, 2, 0, 1, 1,
   NOW(), NOW(), NULL,
   NULL, NULL, NULL, NULL, 'europe', '1day', NULL, 0, 0, 0, NULL, NULL, 'volunteer', NULL);

INSERT INTO `sport_event_team`
  (`id`, `country_cio_id`, `name`, `alternate_name`, `logo`, `sport_event_id`,
   `sport_event_pool_id`, `draw_number`, `continent`, `created`, `updated`, `deleted_at`)
SELECT
  CONCAT('dddd7994-7994-7994-', LPAD(`id`, 4, '0'), '-', LPAD(`id`, 12, '0')) AS `id`,
  `id` AS `country_cio_id`,
  `name`,
  `alternate_name`,
  NULL,
  'dddd7991-7991-7991-7991-000000000001',
  NULL, NULL, 'Europe', NOW(), NOW(), NULL
FROM `country_cio`;

SOURCE arena/stats_multi_events_8080_weight_categories.sql;

-- Quick verification output
SELECT 'events' AS metric, COUNT(*) AS cnt FROM sport_event WHERE id LIKE 'dddd7001-%'
UNION ALL
SELECT 'weight_categories', COUNT(*) FROM sport_event_weight_category WHERE id LIKE 'dddd7005-%'
UNION ALL
SELECT 'teams', COUNT(*) FROM sport_event_team WHERE id LIKE 'dddd7004-%'
UNION ALL
SELECT 'persons', COUNT(*) FROM person WHERE id LIKE 'dddd7000-%'
UNION ALL
SELECT 'athletes', COUNT(*) FROM athlete WHERE id LIKE 'dddd7002-%'
UNION ALL
SELECT 'fighters', COUNT(*) FROM fighter WHERE id LIKE 'dddd7003-%';

SELECT 'test_event_teams' AS metric, COUNT(*) AS cnt
FROM sport_event_team
WHERE sport_event_id = 'dddd7991-7991-7991-7991-000000000001'
UNION ALL
SELECT 'test_event_weight_categories', COUNT(*)
FROM sport_event_weight_category
WHERE sport_event_id = 'dddd7991-7991-7991-7991-000000000001';
