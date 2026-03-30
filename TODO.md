# TODO — Testovanie

## Multi-Arena sync (hlavná featúra BP)
- [ ] Sync events z Arény A → skontrolovať `sport_event_source_uids` v DB
- [ ] Sync teams, athletes, categories, fights z Arény A → end-to-end bez chýb
- [ ] Pridať druhý ArenaSource (Aréna B) v Settings
- [ ] Syncnúť rovnaký event z Arény B → nesmie vytvoriť duplikát (natural key match)
- [ ] Skontrolovať `athlete_source_uids` a `weight_category_source_uids` — záznamy pre oba zdroje
- [ ] Syncnúť fights z Arény B → `fighter_one_id` / `fighter_two_id` nesmú byť NULL

## Regresné testy
- [ ] Spustiť existujúcu test suite: `docker compose run --rm wf-tests`
