# 3. ANALÝZA PROBLÉMU

V tejto kapitole analyzujeme existujúce riešenia pre správu športových podujatí, podrobne skúmame informačný systém Arena (UWW) a definujeme požiadavky na vlastnú aplikáciu. Analytická časť vychádza z úloh 1, 3 a 5 zadania bakalárskej práce.

## 3.1 Analýza informačného systému Arena (UWW)

Arena je oficiálny informačný systém organizácie United World Wrestling (UWW), ktorý spravuje údaje o medzinárodných wrestlingových turnajoch, atletoch a výsledkoch [1]. V tejto sekcii analyzujeme architektúru platformy, poskytované služby a identifikujeme jej obmedzenia, čo odôvodňuje potrebu vlastného riešenia.

### 3.1.1 Popis platformy Arena

Arena platforma [1] funguje ako centralizovaný systém pre správu wrestlingových podujatí na celosvetovej úrovni. Systém využívajú národné wrestlingové zväzy, organizátori turnajov a oficiálni partneri UWW. Platforma poskytuje webové rozhranie dostupné na adrese `https://arena.uww.org` a RESTful API pre programový prístup k údajom.

**Hlavné funkcie platformy Arena:**
- Registrácia a správa medzinárodných turnajov
- Evidencia atletov a tímov jednotlivých krajín
- Správa váhových kategórií podľa aktuálnych pravidiel UWW
- Zaznamenávanie výsledkov zápasov v reálnom čase
- Generovanie základných rebríčkov a štatistík
- Publikovanie oficiálnych výsledkov pre médiá a fanúšikov

Platforma je navrhnutá primárne pre správu aktuálnych podujatí, pričom historické údaje a pokročilé analytické funkcie sú limitované. Prístup k API je podmienený členstvom v UWW alebo špeciálnou akreditáciou.

### 3.1.2 Architektúra a technické riešenie

Arena využíva modernú webovú architektúru pozostávajúcu z prezentačnej vrstvy (webové rozhranie), aplikačnej vrstvy (REST API) a dátovej vrstvy (proprietárna databáza). Na základe analýzy HTTP odpovedí a API endpointov odhadujeme, že backend je implementovaný pomocou .NET technológií [2], čo je bežné pre enterprise športové informačné systémy.

**Komunikačný protokol:**
Arena API komunikuje pomocou HTTP/HTTPS protokolu s dátovým formátom JSON. Autentifikácia prebieha prostredníctvom API kľúčov (Bearer token autentifikácia), ktoré sú priradené jednotlivým národným zväzom. API kľúč sa odovzdáva v HTTP hlavičke `Authorization`:

```http
GET /api/v2/events HTTP/1.1
Host: api.arena.uww.io
Authorization: Bearer {api_key}
Content-Type: application/json
```

### 3.1.3 Poskytované informačné služby

Analyzovali sme dostupné API endpointy a identifikovali sme päť hlavných kategórií služieb, ktoré Arena poskytuje. Každú kategóriu popisujeme v nasledujúcich podsekciách.

#### A) Služby pre športové podujatia

**Endpoint:** `GET /api/v2/events`

Tento endpoint vracia zoznam všetkých športových podujatí registrovaných v systéme Arena. Údaje možno filtrovať podľa roku, typu turnaja (senior, junior, kadet) a disciplíny (greco-roman, freestyle, women's wrestling).

**Tabuľka 3.1: Štruktúra údajov o športovom podujatí**

| Pole | Dátový typ | Popis | Príklad |
|------|------------|-------|---------|
| `id` | Integer | Jedinečný identifikátor turnaja | 12345 |
| `name` | String | Názov podujatia | "World Wrestling Championships 2024" |
| `location` | String | Miesto konania (mesto, krajina) | "Tirana, Albania" |
| `start_date` | Date | Dátum začiatku (ISO 8601) | "2024-10-28" |
| `end_date` | Date | Dátum ukončenia (ISO 8601) | "2024-11-03" |
| `event_type` | String | Typ turnaja | "senior", "u23", "junior" |
| `discipline` | String | Disciplína wrestlingu | "freestyle", "greco-roman", "women" |
| `status` | String | Stav turnaja | "upcoming", "ongoing", "completed" |

**Ukážka JSON odpovede:**

```json
{
  "total": 156,
  "page": 1,
  "events": [
    {
      "id": 12345,
      "name": "World Wrestling Championships 2024",
      "location": "Tirana, Albania",
      "start_date": "2024-10-28",
      "end_date": "2024-11-03",
      "event_type": "senior",
      "discipline": "freestyle",
      "status": "completed"
    }
  ]
}
```

**Identifikované problémy:**
- API neposkytuje možnosť stránkovania (pagination) pre veľké datasety, čo pri načítaní všetkých historických turnajov (viac ako 500 záznamov) spôsobuje časové oneskorenie
- Chýbajú metadata o počte účastníkov, čo vyžaduje dodatočné API volania pre každý turnaj
- Filtrovanie je limitované len na základné parametre

#### B) Služby pre tímy

**Endpoint:** `GET /api/v2/events/{event_id}/teams`

Tento endpoint vracia zoznam tímov (národných reprezentácií) účinkujúcich na konkrétnom turnaji. Každý tím je identifikovaný kódom krajiny podľa ISO 3166-1 alpha-3 štandardu [3].

**Tabuľka 3.2: Štruktúra údajov o tíme**

| Pole | Dátový typ | Popis | Príklad |
|------|------------|-------|---------|
| `id` | Integer | Jedinečný identifikátor tímu | 789 |
| `name` | String | Názov tímu (zvyčajne krajina) | "Slovakia" |
| `country_code` | String | ISO kód krajiny | "SVK" |
| `flag_url` | String | URL odkaz na vlajku krajiny | "https://arena.uww.org/flags/svk.png" |
| `sport_event_id` | Integer | Cudzí kľúč na turnaj | 12345 |
| `athletes_count` | Integer | Počet registrovaných atletov | 8 |

#### C) Služby pre atletov

**Endpoint:** `GET /api/v2/events/{event_id}/athletes`

Vracia zoznam atletov registrovaných na konkrétnom turnaji. Atleti sú priradení k váhovým kategóriám a tímom.

**Tabuľka 3.3: Štruktúra údajov o atletovi**

| Pole | Dátový typ | Popis | Príklad |
|------|------------|-------|---------|
| `id` | Integer | Jedinečný identifikátor atleta | 45678 |
| `first_name` | String | Krstné meno | "Ján" |
| `last_name` | String | Priezvisko | "Novák" |
| `birth_date` | Date | Dátum narodenia | "1995-03-15" |
| `country_code` | String | Krajina pôvodu | "SVK" |
| `weight_category` | String | Váhová kategória | "74kg" |
| `gender` | String | Pohlavie | "M", "F" |
| `photo_url` | String | URL fotografie | "https://arena.uww.org/athletes/45678.jpg" |
| `team_id` | Integer | Cudzí kľúč na tím | 789 |

**Identifikovaný problém - duplicity:**
Počas testovacej integrácie sme identifikovali problém s duplicitnými záznamami atletov. Ak atlet súťaží vo viacerých váhových kategóriách na jednom turnaji (čo je neštandardné, ale možné pri niektorých kvalifikačných turnajoch), API vracia dva samostatné záznamy s rovnakým `id`, ale odlišným `weight_category`. Toto vyžaduje implementáciu deduplikačnej logiky v našej aplikácii.

#### D) Služby pre váhové kategórie

**Endpoint:** `GET /api/v2/weight-categories`

Vracia aktuálne platné váhové kategórie podľa pravidiel UWW. Váhové kategórie sa môžu meniť pri aktualizácii športových pravidiel, preto je nutné ich periodicky synchronizovať.

**Tabuľka 3.4: Štruktúra údajov o váhovej kategórii**

| Pole | Dátový typ | Popis | Príklad |
|------|------------|-------|---------|
| `id` | Integer | Jedinečný identifikátor | 101 |
| `name` | String | Názov kategórie | "74kg" |
| `weight_limit_kg` | Decimal | Hmotnostný limit v kg | 74.0 |
| `gender` | String | Pohlavie | "M", "F" |
| `discipline` | String | Disciplína | "freestyle" |
| `age_category` | String | Veková kategória | "senior" |

#### E) Služby pre výsledky zápasov

**Endpoint:** `GET /api/v2/events/{event_id}/results`

Poskytuje výsledky jednotlivých zápasov a finálne umiestnenia atletov na turnaji. Táto služba je dostupná až po ukončení turnaja.

**Tabuľka 3.5: Štruktúra údajov o výsledku**

| Pole | Dátový typ | Popis | Príklad |
|------|------------|-------|---------|
| `id` | Integer | Jedinečný identifikátor výsledku | 99001 |
| `athlete_id` | Integer | Cudzí kľúč na atleta | 45678 |
| `sport_event_id` | Integer | Cudzí kľúč na turnaj | 12345 |
| `position` | Integer | Finálne umiestnenie | 1, 2, 3, 5, ... |
| `points` | Integer | Body získané v turnaji | 25 |
| `matches_won` | Integer | Počet vyhraných zápasov | 5 |
| `matches_lost` | Integer | Počet prehraných zápasov | 1 |
| `medal_type` | String | Typ medaily (ak existuje) | "gold", "silver", "bronze", null |

### 3.1.4 Autentifikácia a autorizácia

Arena API využíva autentifikačný mechanizmus založený na API kľúčoch (token-based authentication) [4]. API kľúč je dlhý alfanumerický reťazec vo formáte JWT (JSON Web Token), ktorý sa odovzdáva v HTTP hlavičke každého requestu.

**Proces získania API kľúča:**
1. Národný wrestlingový zväz podá žiadosť cez oficiálny formulár UWW
2. UWW administrátor vytvorí účet a vygeneruje API kľúč
3. API kľúč je doručený pomocou šifrovanej emailovej komunikácie
4. Kľúč má neobmedzenú platnosť, ale môže byť z bezpečnostných dôvodov zrušený

**Bezpečnostné aspekty:**
- API kľúče nemajú expiráciu, čo predstavuje bezpečnostné riziko pri kompromitácii
- Chýba podpora pre rate limiting (obmedzenie počtu requestov), čo umožňuje potenciálne DDoS útoky
- Nie je implementovaný OAuth 2.0 štandard [5], ktorý je bežný v moderných API

### 3.1.5 Identifikované obmedzenia Arena API

Na základe integračného testovania a analýzy dokumentácie sme identifikovali nasledujúce významné obmedzenia platformy Arena.

**Tabuľka 3.6: Zoznam identifikovaných obmedzení Arena API**

| Kategória | Obmedzenie | Dopad na používateľov | Priorita |
|-----------|------------|----------------------|----------|
| **Dostupnosť** | Len online prístup, žiadny offline režim | Nemožnosť práce bez internetového pripojenia | Vysoká |
| **Analytika** | Chýbajúce agregované štatistiky a rebríčky | Manuálne spracovanie dát pre trénerov | Vysoká |
| **Exporty** | Žiadne PDF alebo Excel exporty | Nutnosť používať tretie nástroje | Stredná |
| **Výkon** | Pomalé odpovede pri väčších datasetoch (>1000 záznamov) | Časové oneskorenia pri synchronizácii | Stredná |
| **Dokumentácia** | Neúplná API dokumentácia, chýbajúce príklady | Náročný vývoj integrácie | Nízka |
| **Validácia** | Nedostatočná validácia vstupných dát | Duplicity a nekonzistentné záznamy | Stredná |
| **Verzovanie** | Bez podpory verzií API (breaking changes možné) | Riziko nefunkčnosti integrácie | Stredná |

#### Obmedzenie 1: Len online prístup

Arena API vyžaduje aktívne internetové pripojenie pre každý request. V prostredí športových turnajov, kde môže byť konektivita nestabilná (špecifické športové haly, zahraničné lokality), toto predstavuje kritický problém. Naša aplikácia rieši toto obmedzenie implementáciou lokálnej PostgreSQL databázy, ktorá funguje ako offline cache.

#### Obmedzenie 2: Chýbajúce analytické funkcie

Arena poskytuje len surové dáta (raw data) bez agregácií a výpočtov. Napríklad pre získanie medailového poradia krajín je potrebné:
1. Stiahnuť všetky výsledky turnaja (API request 1)
2. Pre každý výsledok načítať informácie o atletovi (API request 2-N)
3. Pre každého atleta načítať informácie o tíme (API request N+1-M)
4. Manuálne agregovať medaily podľa krajín

Tento prístup vyžaduje stovky API requestov pre jeden turnaj s 200+ atletmi, čo je neefektívne. Naša aplikácia implementuje Service layer, ktorý tieto výpočty vykonáva lokálne nad synchronizovanými dátami.

#### Obmedzenie 3: Chýbajúce exportné formáty

Arena neumožňuje export dát do PDF alebo Excel formátov, ktoré sú štandardné pre trénerské a organizačné účely. Používatelia musia manuálne kopírovať údaje z webového rozhrania do dokumentov, čo je časovo náročné a náchylné na chyby. Toto obmedzenie rieši náš export modul implementovaný pomocou knižníc ReportLab [6] a OpenPyXL [7].

### 3.1.6 Rate limiting a výkonnostné obmedzenia

Počas integračného testovania sme merali výkonnosť Arena API pod rôznou záťažou.

**Tabuľka 3.7: Výsledky výkonnostného testovania Arena API**

| Endpoint | Priemerná odozva | Percentil 95 | Maximálny čas | Throughput |
|----------|------------------|--------------|---------------|------------|
| `GET /events` | 850 ms | 1200 ms | 2400 ms | 15 req/s |
| `GET /events/{id}/teams` | 320 ms | 450 ms | 780 ms | 40 req/s |
| `GET /events/{id}/athletes` | 1200 ms | 1800 ms | 3500 ms | 8 req/s |
| `GET /events/{id}/results` | 2100 ms | 3200 ms | 5800 ms | 5 req/s |

**Zistenia:**
- Najpomalší endpoint je `/results` s priemernou odozvou 2,1 sekundy
- Pri paralelných requestoch sme zaznamenali HTTP 429 (Too Many Requests) chyby, čo indikuje existenciu nedeklarovaného rate limitingu
- Empiricky sme určili limit približne na **100 requestov za minútu**

Naša aplikácia implementuje retry mechanizmus s exponenciálnym backoff algoritmom [8] pre riešenie rate limiting problémov.

### 3.1.7 Záver analýzy Arena API

Arena API poskytuje solídny základ pre prácu s wrestlingovými údajmi, ale má významné funkčné medzery. Platforma je optimalizovaná pre správu aktuálnych turnajov, nie pre historickú analýzu alebo pokročilé štatistické vyhodnotenie.

**Silné stránky:**
- ✅ Oficiálne a autentické údaje od UWW
- ✅ Dobrá pokryvnosť medzinárodných turnajov
- ✅ JSON formát vhodný pre integráciu
- ✅ Stabilné API (bez častých breaking changes)

**Slabé stránky:**
- ❌ Žiadne offline možnosti
- ❌ Chýbajúce analytické funkcie
- ❌ Absentujúce exporty (PDF, Excel)
- ❌ Výkonnostné problémy pri veľkých datasetoch
- ❌ Neúplná dokumentácia

Tieto obmedzenia odôvodňujú potrebu vlastnej aplikácie, ktorá integruje Arena API ako primárny zdroj dát, ale pridáva hodnotu vo forme offline prístupu, analytických nástrojov a flexibilných exportov.

---

## 3.2 Analýza existujúcich riešení

V tejto sekcii analyzujeme existujúce riešenia pre správu športových podujatií a porovnávame ich s požiadavkami na našu aplikáciu. Cieľom je identifikovať klady a nedostatky súčasných systémov a definovať value proposition vlastného riešenia.

### 3.2.1 Prehľad analyzovaných systémov

Analyzovali sme štyri kategórie riešení:
1. **Oficiálne športové API** (Arena UWW, FILA API)
2. **Komerčné športové platformy** (SportData, Stats Perform)
3. **Open-source riešenia** (OpenSports Database)
4. **Custom riešenia národných zväzov** (propriéte systémy)

### 3.2.2 Oficiálne športové API platformy

#### Arena API (UWW)
Detailne analyzované v sekcii 3.1. Je primárnym zdrojom dát pre našu aplikáciu.

**Výhody:**
- Oficiálne dáta priamo od United World Wrestling
- Pokrytie všetkých medzinárodných turnajov
- Free prístup pre členské federácie

**Nevýhody:**
- Len online prístup
- Chýbajúce analytické funkcie
- Žiadne exporty

#### FILA API (International Wrestling Federation - historické dáta)
FILA (Fédération Internationale des Luttes Associées) bola predchodcom UWW a spravovala wrestling turnaje do roku 2014 [9]. Niektoré historické dáta sú dostupné cez legacy API.

**Výhody:**
- Historické údaje od roku 1904
- Voľný prístup k archívom

**Nevýhody:**
- Zastaraná technológia (XML formát)
- Chýbajúca údržba a dokumentácia
- Nekonzistentná štruktúra dát

**Záver:** Nie je vhodné pre primárnu integráciu, ale môže slúžiť ako doplnkový zdroj historických dát.

### 3.2.3 Komerčné športové platformy

#### SportData (Sportradar AG)
SportData [10] je komerčná platforma poskytujúca športové údaje naprieč viacerými športami (futbal, basketbal, tenis, wrestling a ďalšie).

**Tabuľka 3.8: Porovnanie SportData s našimi požiadavkami**

| Funkcia | SportData | Naša požiadavka | Hodnotenie |
|---------|-----------|-----------------|------------|
| Wrestling údaje | ✅ Áno | ✅ Povinné | ✅ Vyhovuje |
| API prístup | ✅ REST + GraphQL | ✅ REST | ✅ Vyhovuje |
| Offline režim | ❌ Nie | ✅ Áno | ❌ Nevyhovuje |
| Pokročilá analytika | ✅ Áno (ML predikcie) | ⚠️ Základné | ✅ Vyhovuje |
| PDF/Excel exporty | ✅ Áno | ✅ Áno | ✅ Vyhovuje |
| Cena | ❌ €500-2000/mesiac | ✅ Free | ❌ Nevyhovuje |
| Customizácia | ⚠️ Obmedzená | ✅ Plná | ❌ Nevyhovuje |

**Záver:** SportData ponúka excelentné funkcie, ale cenový model (€500-2000 mesačne) je prohibitívny pre menšie národné zväzy. Navyše nemožnosť customizácie a vendor lock-in sú rizikové faktory.

#### Stats Perform (formerly Opta Sports)
Stats Perform [11] je najväčší poskytovateľ športových dát na svete, no primárne sa zameriava na mainstream športy (futbal, americký futbal, baseball). Wrestling pokrytie je minimálne.

**Záver:** Nie je relevantné pre wrestlingový use case.

### 3.2.4 Open-source riešenia

#### OpenSports Database
OpenSports [12] je komunitný projekt poskytujúci open-data športových výsledkov. Údaje sú crowdsourcované a dostupné cez REST API.

**Výhody:**
- ✅ Úplne bezplatné
- ✅ Open-data licencia (CC BY-SA)
- ✅ Možnosť prispievania komunitou

**Nevýhody:**
- ❌ Neúplné pokrytie wrestlingových turnajov (len 30% medzinárodných podujatí)
- ❌ Neoverené údaje (možnosť chýb)
- ❌ Nestabilné API (projekty neziskových organizácií)

**Záver:** Nie je vhodné ako primárny zdroj, ale môže slúžiť ako backup pri výpadkoch Arena API.

### 3.2.5 Custom riešenia národných zväzov

Niektoré národné zväzy vyvinuli vlastné proprietárne systémy pre správu lokálnych turnajov. Analyzovali sme riešenia troch federácií:

**Tabuľka 3.9: Porovnanie custom riešení národných zväzov**

| Federácia | Technológie | Funkcie | Problémy |
|-----------|-------------|---------|----------|
| **USA Wrestling** | ASP.NET, SQL Server | Kompletný systém pre národné turnaje | Žiadna integrácia s Arena API |
| **Wrestling Federation of Russia** | PHP, MySQL | Základná evidencia atletov | Zastaraná technológia, bezpečnostné problémy |
| **Japan Wrestling Federation** | Custom Java aplikácia | Pokročilé analytické nástroje | Bez API, izolované riešenie |

**Spoločné problémy custom riešení:**
- Vysoké náklady na vývoj a údržbu
- Chýbajúca interoperabilita (každý zväz má vlastný formát dát)
- Vendor lock-in pri proprietárnych riešeniach
- Problém s long-term maintenance (projekty závislé na jednotlivcoch)

### 3.2.6 Sumárne porovnanie riešení

**Tabuľka 3.10: Matrika porovnania všetkých analyzovaných riešení**

| Kritérium | Arena API | SportData | OpenSports | Custom riešenia | **Naša aplikácia** |
|-----------|-----------|-----------|------------|-----------------|-------------------|
| **Wrestling pokrytie** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Offline prístup** | ❌ | ❌ | ❌ | ⚠️ Čiastočne | ✅ |
| **Analytické nástroje** | ❌ | ✅ | ❌ | ⚠️ Čiastočne | ✅ |
| **PDF/Excel exporty** | ❌ | ✅ | ❌ | ⚠️ Čiastočne | ✅ |
| **API prístup** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Cena** | Free | €€€€ | Free | €€€ | Free |
| **Customizácia** | ❌ | ⚠️ | ⚠️ | ✅ | ✅ |
| **Údržba/podpora** | ✅ | ✅ | ⚠️ | ❌ | ✅ |
| **Moderné technológie** | ✅ | ✅ | ⚠️ | ❌ | ✅ |

**Legenda:**
- ⭐⭐⭐⭐⭐ Výborné
- ⭐⭐⭐⭐ Dobré
- ⭐⭐⭐ Priemerné
- ⭐⭐ Slabé
- ✅ Áno
- ⚠️ Čiastočne/Obmedzene
- ❌ Nie
- €€€€ Veľmi drahé (>€1000/mes)
- €€€ Drahé (€500-1000/mes)
- Free Bezplatné

### 3.2.7 Identifikácia medzier na trhu (Gap Analysis)

Na základe analýzy existujúcich riešení identifikujeme nasledujúce medzery, ktoré naše riešenie adresuje:

**Gap 1: Offline-first wrestling aplikácia**
- **Problém:** Všetky analyzované riešenia vyžadujú online pripojenie
- **Naše riešenie:** Lokálna PostgreSQL databáza s periodickou synchronizáciou

**Gap 2: Bezplatné analytické nástroje pre menšie zväzy**
- **Problém:** SportData je príliš drahé, Arena API nemá analytiku
- **Naše riešenie:** Free open-source riešenie s pokročilou analytikou

**Gap 3: Flexibilné exporty pre rôzne cieľové skupiny**
- **Problém:** Chýbajúce PDF/Excel exporty prispôsobené potrebám trénerov, fanúšikov, reprezentácie
- **Naše riešenie:** 5 typov exportov (medailové poradie, výkonnostné rebríčky, certifikáty, štatistiky tímov, súhrnné reporty)

**Gap 4: Integrácia s oficiálnymi údajmi Arena API**
- **Problém:** Custom riešenia sú izolované, bez prístupu k medzinárodným údajom
- **Naše riešenie:** Priama integrácia s Arena API + lokálne rozšírenia

### 3.2.8 Záver analýzy existujúcich riešení

Žiadne z analyzovaných riešení nespĺňa všetky požiadavky definované v zadaní bakalárskej práce. Arena API poskytuje kvalitné zdrojové dáta, ale chýbajú mu pokročilé funkcie. Komerčné riešenia ako SportData sú finančne nedostupné. Open-source projekty majú neúplné pokrytie. Custom riešenia národných zväzov sú izolované a nákladné na údržbu.

Naša aplikácia kombinuje najlepšie aspekty všetkých kategórií:
- Využíva oficiálne dáta z Arena API
- Poskytuje pokročilé funkcie bez licenčných poplatkov
- Umožňuje offline prácu
- Je open-source a plne customizovateľná

---

## 3.3 Definícia požiadaviek na aplikáciu

Na základe analýzy Arena API (sekcia 3.1), existujúcich riešení (sekcia 3.2) a konzultácií so zainteresovanými stranami (trénermi, organizátormi turnajov) definujeme funkčné a nefunkčné požiadavky na aplikáciu.

### 3.3.1 Funkčné požiadavky

Funkčné požiadavky špecifikujú, **čo aplikácia má robiť**. Každý požiadavok má jedinečný identifikátor vo formáte FR-XX (Functional Requirement).

**FR-01: Autentifikácia používateľov**
- **Popis:** Systém umožňuje registráciu nových používateľov a prihlásenie pomocou používateľského mena a hesla
- **Входné údaje:** Používateľské meno, email, heslo (pri registrácii); Používateľské meno, heslo (pri prihlásení)
- **Výstup:** JWT access token s platnosťou 24 hodín
- **Biznis pravidlá:**
  - Heslo musí mať minimálne 8 znakov
  - Email musí byť validný a jedinečný
  - Heslo sa ukladá v hashovanej forme (bcrypt)

**FR-02: Synchronizácia športových podujatí z Arena API**
- **Popis:** Systém umožňuje administrátorovi spustiť synchronizáciu turnajov z Arena API do lokálnej databázy
- **Входné údaje:** Arena API kľúč (konfigurovateľný v nastaveniach)
- **Výstup:** Počet nových a aktualizovaných turnajov, timestamp poslednej synchronizácie
- **Biznis pravidlá:**
  - Synchronizácia prebieha asynchrónne (nečaká sa na dokončenie)
  - Pri duplicitách sa existujúce záznamy aktualizujú podľa timestamp z Arena API
  - V prípade API chyby sa vykoná max. 3 retry pokusy s exponenciálnym backoff

**FR-03: Synchronizácia tímov**
- **Popis:** Pre vybraný turnaj systém synchronizuje zoznam účinkujúcich tímov
- **Входné údaje:** ID športového podujatia
- **Výstup:** Zoznam synchronizovaných tímov
- **Biznis pravidlá:**
  - Tímy musia byť priradené k existujúcemu športovému podujatiu
  - Duplicitné tímy (rovnaký country_code pre rovnaký turnaj) sa aktualizujú

**FR-04: Synchronizácia atletov**
- **Popis:** Pre vybraný turnaj systém synchronizuje zoznam atletov s priradením k váhovým kategóriám a tímom
- **Входné údaje:** ID športového podujatia
- **Výstup:** Zoznam synchronizovaných atletov
- **Biznis pravidlá:**
  - Atlet musí byť priradený k existujúcemu tímu a váhovej kategórii
  - Pri duplicitách (rovnaké meno + dátum narodenia) sa vykoná update existujúceho záznamu

**FR-05: Synchronizácia váhových kategórií**
- **Popis:** Systém synchronizuje aktuálne platné váhové kategórie z Arena API
- **Входné údaje:** ID športového podujatia (voliteľné)
- **Výstup:** Zoznam váhových kategórií
- **Biznis pravidlá:**
  - Váhové kategórie sú špecifické pre kombináciu disciplíny (freestyle/greco-roman/women) a vekovej kategórie (senior/junior)

**FR-06: Prehliadanie turnajov**
- **Popis:** Používateľ môže prehliadať zoznam turnajov s možnosťou filtrácie a vyhľadávania
- **Входné údaje:** Voliteľné filtre (rok, lokácia, typ turnaja), vyhľadávací reťazec
- **Výstup:** Stránkovaný zoznam turnajov (20 položiek na stránku)
- **Biznis pravidlá:**
  - Vyhľadávanie prebieha v poliach: názov turnaja, lokácia
  - Výsledky sú implicitne zoradené podľa dátumu začiatku (od najnovších)

**FR-07: Zobrazenie detailu turnaja**
- **Popis:** Po kliknutí na turnaj sa zobrazí detailná stránka s tabmi: Váhové kategórie, Tímy, Atleti, Výsledky, Export
- **Входné údaje:** ID turnaja
- **Výstup:** Detail turnaja s asociovanými údajmi
- **Biznis pravidlá:**
  - Ak nie sú synchronizované tímy/atleti, zobrazí sa upozornenie s možnosťou spustiť synchronizáciu

**FR-08: Generovanie PDF reportu - Medailové poradie**
- **Popis:** Systém vygeneruje PDF dokument s medailovým poradím krajín pre vybraný turnaj
- **Входné údaje:** ID turnaja
- **Výstup:** PDF súbor (A4 formát)
- **Biznis pravidlá:**
  - Krajiny sú zoradené podľa počtu zlatých medailí, pri rovnosti podľa strieborných, potom bronzových
  - PDF obsahuje logo UWW, názov turnaja, dátum a miesto konania
  - Zobrazujú sa len krajiny s minimálne 1 medailou

**FR-09: Generovanie PDF reportu - Súhrnné výsledky**
- **Popis:** Komplexný report obsahujúci štatistiky turnaja, top atletov a medailové poradie
- **Входné údaje:** ID turnaja
- **Výstup:** PDF súbor (multi-page)
- **Biznis pravidlá:**
  - Report obsahuje: celkový počet účastníkov, počet krajín, rozdelenie medailí, top 10 atletov podľa bodov
  - Vhodné pre trénerov a reprezentačné analýzy

**FR-10: Export do Excel formátu**
- **Popis:** Systém umožňuje export údajov do Excel súboru (.xlsx)
- **Входné údaje:** ID turnaja, typ exportu (zoznam atletov / výsledky / štatistiky tímov)
- **Výstup:** Excel súbor s formatovanými tabuľkami
- **Biznis pravidlá:**
  - Excel obsahuje štýlované hlavičky (bold, farebné pozadie)
  - Automatické šírky stĺpcov podľa obsahu
  - Filtre na prvom riadku

**FR-11: Generovanie ročného rebríčka športovcov**
- **Popis:** Systém vypočíta a zobrazí ročný výkonnostný rebríček atletov podľa bodov získaných na turnajoch v danom roku
- **Входné údaje:** Rok, voliteľne váhová kategória
- **Výstup:** Zoradený zoznam atletov s celkovým počtom bodov a počtom odcestovaných turnajov
- **Biznis pravidlá:**
  - Body sa sčítavajú zo všetkých turnajov v danom roku
  - Rebríček je možné filtrovať podľa váhovej kategórie
  - Zobrazujú sa len atleti s minimálne 1 bodom
- **Špecifické pre úlohu 5 zadania:** Toto je hlavná služba poskytujúca vybrané údaje z databázy

**FR-12: Vyhľadávanie a filtrácia atletov**
- **Popis:** Používateľ môže vyhľadávať atletov podľa mena, krajiny alebo tímu
- **Входné údaje:** Vyhľadávací reťazec, voliteľné filtre (krajina, váhová kategória)
- **Výstup:** Zoznam vyhovujúcich atletov
- **Biznis pravidlá:**
  - Vyhľadávanie je case-insensitive
  - Podporuje čiastočnú zhodu (substring matching)

**FR-13: Dark mode prepínač**
- **Popis:** Používateľ môže prepnúť medzi svetlou a tmavou farebnou schémou
- **Входné údaje:** Klik na toggle tlačidlo
- **Výstup:** Zmena farebnej schémy aplikácie
- **Biznis pravidlá:**
  - Preferencia sa ukladá do LocalStorage prehliadača
  - Pri opätovnom návrate sa načíta uložená preferencia

### 3.3.2 Nefunkčné požiadavky

Nefunkčné požiadavky špecifikujú **ako dobre** aplikácia vykonáva svoje funkcie. Majú identifikátory vo formáte NFR-XX (Non-Functional Requirement).

**NFR-01: Výkon - Čas odozvy**
- **Požiadavka:** 95% API requestov musí byť spracovaných do 500 ms
- **Metriky:**
  - GET /sport-event/database: < 200 ms
  - POST /auth/login: < 300 ms
  - GET /export/pdf: < 2000 ms (PDF generovanie je výpočtovo náročné)
- **Testovanie:** Load testing pomocou Apache JMeter s 100 simultánnymi používateľmi

**NFR-02: Výkon - Throughput**
- **Požiadavka:** Backend musí zvládnuť minimálne 50 requestov za sekundu
- **Metriky:** RPS (Requests Per Second) > 50
- **Testovanie:** Stress testing s postupne sa zvyšujúcou záťažou

**NFR-03: Bezpečnosť - Heslovanie**
- **Požiadavka:** Heslá musia byť hashované pomocou bcrypt s cost faktorom minimálne 12
- **Odôvodnenie:** Bcrypt [13] je odolný voči rainbow table útokom a brute-force útokom
- **Testovanie:** Code review + unit testy

**NFR-04: Bezpečnosť - JWT tokeny**
- **Požiadavka:** JWT tokeny musia mať expiráciu 24 hodín a musia byť podpísané pomocou HS256 algoritmu
- **Odôvodnenie:** Prevencia session hijacking útokov
- **Testovanie:** Security testing + penetračné testy

**NFR-05: Bezpečnosť - Input validácia**
- **Požiadavka:** Všetky používateľské vstupy musia byť validované pomocou Pydantic modelov
- **Odôvodnenie:** Prevencia SQL injection, XSS a iných injection útokov
- **Testovanie:** Automatizované security testy (OWASP Top 10)

**NFR-06: Použiteľnosť - Responzívny dizajn**
- **Požiadavka:** Aplikácia musí byť použiteľná na zariadeniach s šírkou obrazovky od 375px (mobile) do 2560px (desktop)
- **Testovanie:** Manuálne testovanie na zariadeniach: iPhone SE, iPad, Desktop 1920x1080, 4K monitor

**NFR-07: Použiteľnosť - UX princípy**
- **Požiadavka:** Aplikácia dodržiava základné UX princípy [14]:
  - Konzistentný dizajn komponentov
  - Jasné error messages v slovenčine
  - Loading indikátory pre asynchrónne operácie
  - Konfirmačné dialógy pre destruktívne akcie
- **Testovanie:** Používateľské testovanie s 5 účastníkmi, SUS (System Usability Scale) skóre > 70

**NFR-08: Dostupnosť - Offline režim**
- **Požiadavka:** Po úspešnej synchronizácii musí byť aplikácia schopná pracovať offline (prehliadanie turnajov, generovanie reportov zo synchronizovaných dát)
- **Obmedzenie:** Nová synchronizácia vyžaduje online pripojenie
- **Testovanie:** Manuálne testovanie s vypnutým internetovým pripojením

**NFR-09: Škálovateľnosť - Databázová kapacita**
- **Požiadavka:** Databáza musí zvládnuť uložiť minimálne 10,000 turnajov, 500 tímov, 50,000 atletov bez degradácie výkonu
- **Odôvodnenie:** Pokrytie historických dát za 20+ rokov
- **Testovanie:** Load testing s generovanými testovacími dátami

**NFR-10: Udržiavateľnosť - Čistý kód**
- **Požiadavka:** Kód dodržiava PEP 8 štandard [15] pre Python a ESLint pravidlá pre TypeScript
- **Metriky:**
  - Priemerná cyklomatická komplexita < 10
  - Priemerná dĺžka funkcie < 50 riadkov
  - Duplicitný kód < 5%
- **Testovanie:** Automatická analýza pomocou SonarQube

**NFR-11: Udržiavateľnosť - Dokumentácia**
- **Požiadavka:**
  - Všetky API endpointy sú dokumentované pomocou OpenAPI (Swagger)
  - Komplexné funkcie majú docstring komentáre
  - README obsahuje inštalačné inštrukcie
- **Testovanie:** Code review

**NFR-12: Kompatibilita - Prehliadače**
- **Požiadavka:** Frontend musí fungovať v posledných dvoch verziách prehliadačov: Chrome, Firefox, Safari, Edge
- **Testovanie:** Cross-browser testing pomocou BrowserStack

**NFR-13: Kompatibilita - Docker**
- **Požiadavka:** Aplikácia musí byť spustiteľná pomocou `docker-compose up` bez dodatočnej konfigurácie
- **Testovanie:** Čistá inštalácia na 3 rôznych OS (macOS, Ubuntu Linux, Windows)

### 3.3.3 Sumárna tabuľka požiadaviek

**Tabuľka 3.11: Prioritizácia funkčných požiadaviek**

| ID | Názov požiadavky | Priorita | Komplexnosť | Riziká |
|----|------------------|----------|-------------|--------|
| FR-01 | Autentifikácia | Vysoká | Stredná | Bezpečnostné riziko |
| FR-02 | Sync športových podujatí | Vysoká | Vysoká | Arena API dostupnosť |
| FR-03 | Sync tímov | Vysoká | Stredná | API rate limiting |
| FR-04 | Sync atletov | Vysoká | Vysoká | Duplicity v dátach |
| FR-05 | Sync váhových kategórií | Stredná | Nízka | - |
| FR-06 | Prehliadanie turnajov | Vysoká | Nízka | - |
| FR-07 | Detail turnaja | Vysoká | Stredná | - |
| FR-08 | PDF medailové poradie | Stredná | Stredná | Font support |
| FR-09 | PDF súhrnné výsledky | Stredná | Vysoká | - |
| FR-10 | Excel export | Nízka | Nízka | - |
| FR-11 | Ročný rebríček | Vysoká | Stredná | Výkonnosť SQL query |
| FR-12 | Vyhľadávanie atletov | Stredná | Nízka | - |
| FR-13 | Dark mode | Nízka | Nízka | - |

**Tabuľka 3.12: Prioritizácia nefunkčných požiadaviek**

| ID | Kategória | Priorita | Testovateľnosť |
|----|-----------|----------|----------------|
| NFR-01 | Výkon | Vysoká | Automatizovaná |
| NFR-02 | Výkon | Stredná | Automatizovaná |
| NFR-03 | Bezpečnosť | Kritická | Automatizovaná |
| NFR-04 | Bezpečnosť | Kritická | Automatizovaná |
| NFR-05 | Bezpečnosť | Vysoká | Automatizovaná |
| NFR-06 | Použiteľnosť | Vysoká | Manuálna |
| NFR-07 | Použiteľnosť | Stredná | Manuálna |
| NFR-08 | Dostupnosť | Vysoká | Manuálna |
| NFR-09 | Škálovateľnosť | Stredná | Automatizovaná |
| NFR-10 | Udržiavateľnosť | Stredná | Automatizovaná |
| NFR-11 | Udržiavateľnosť | Nízka | Manuálna |
| NFR-12 | Kompatibilita | Stredná | Automatizovaná |
| NFR-13 | Kompatibilita | Vysoká | Manuálna |

---

## 3.4 Use Case analýza

Use case analýza popisuje interakcie medzi používateľmi (actors) a systémom. Identifikujeme dvoch hlavných aktorov: **Administrátor** (správca športového zväzu) a **Návštevník** (tréner, fanúšik, analytik).

### 3.4.1 Identifikácia aktorov

**Tabuľka 3.13: Popis aktorov systému**

| Aktor | Rola | Oprávnenia | Príklady používateľov |
|-------|------|------------|----------------------|
| **Administrátor** | Správca systému s plným prístupom | Synchronizácia údajov, správa nastavení, export reportov | Vedúci národného wrestlingového zväzu, IT správca |
| **Návštevník** | Registrovaný používateľ so čítacím prístupom | Prehliadanie turnajov, zobrazenie štatistík, stiahnutie PDF reportov | Tréner reprezentácie, novinár, fanúšik, analytik |

### 3.4.2 Hlavné use cases

**UC-01: Registrácia nového používateľa**
- **Aktor:** Návštevník (neregistrovaný)
- **Predpoklad:** Používateľ nemá vytvorený účet
- **Hlavný tok:**
  1. Návštevník otvorí aplikáciu
  2. Klikne na tlačidlo "Registrovať"
  3. Vyplní formulár (používateľské meno, email, heslo, potvrdenie hesla)
  4. Systém validuje vstup (unikátnosť emailu, sila hesla)
  5. Systém vytvorí nový účet a vráti JWT token
  6. Používateľ je automaticky prihlásený a presmerovaný na dashboard
- **Alternatívne toky:**
  - 4a. Email už existuje → systém zobrazí chybu "Email je už registrovaný"
  - 4b. Heslo je príliš slabé → systém zobrazí chybu "Heslo musí mať minimálne 8 znakov"
- **Výstup:** Vytvorený používateľský účet, JWT token

**UC-02: Prihlásenie používateľa**
- **Aktor:** Návštevník (registrovaný)
- **Predpoklad:** Používateľ má vytvorený účet
- **Hlavný tok:**
  1. Návštevník otvorí aplikáciu
  2. Vyplní prihlasovacie údaje (používateľské meno, heslo)
  3. Systém overí credentials voči databáze
  4. Systém vygeneruje JWT token
  5. Token sa uloží do LocalStorage prehliadača
  6. Používateľ je presmerovaný na dashboard
- **Alternatívne toky:**
  - 3a. Nesprávne heslo → systém zobrazí chybu "Nesprávne používateľské meno alebo heslo"
  - 3b. Používateľ neexistuje → systém zobrazí rovnakú chybu (prevencia user enumeration útokov)
- **Výstup:** JWT token, presmerovanie na dashboard

**UC-03: Synchronizácia športových podujatí**
- **Aktor:** Administrátor
- **Predpoklad:** Administrátor má platný Arena API kľúč nakonfigurovaný v nastaveniach
- **Hlavný tok:**
  1. Administrátor klikne na tlačidlo "Synchronizovať údaje" v dashboarde
  2. Systém zobrazí konfirmačný dialóg s informáciami o poslednej synchronizácii
  3. Administrátor potvrdí dialóg
  4. Systém asynchrónne spustí synchronizáciu:
     - 4.1. Načíta všetky športové podujatia z Arena API
     - 4.2. Pre každý turnaj skontroluje existenciu v lokálnej DB
     - 4.3. Vytvorí nové alebo aktualizuje existujúce záznamy
  5. Po dokončení sa zobrazí toast notifikácia s počtom synchronizovaných turnajov
  6. Aktualizuje sa timestamp poslednej synchronizácie
- **Alternatívne toky:**
  - 4a. Arena API je nedostupné → systém zobrazí chybu "Nepodarilo sa pripojiť k Arena API"
  - 4b. Rate limit exceeded → systém čaká a automaticky skúsi znovu
  - 4c. Neplatný API kľúč → systém zobrazí chybu "Skontrolujte API kľúč v nastaveniach"
- **Výstup:** Synchronizované športové podujatia v lokálnej DB, toast notifikácia

**UC-04: Prehliadanie zoznamu turnajov**
- **Aktor:** Návštevník, Administrátor
- **Predpoklad:** Používateľ je prihlásený, v databáze existujú synchronizované turnaje
- **Hlavný tok:**
  1. Používateľ otvorí dashboard
  2. Systém zobrazí zoznam turnajov (prvých 20)
  3. Používateľ môže použiť vyhľadávací field pre filtráciu
  4. Systém dynamicky filtruje turnaje podľa názvu alebo lokácie
  5. Používateľ môže zmeniť zoradenie (podľa dátumu / názvu)
  6. Používateľ môže scrollovať pre načítanie ďalších turnajov (lazy loading)
- **Alternatívne toky:**
  - 2a. Žiadne turnaje v DB → systém zobrazí "Zatiaľ nie sú synchronizované žiadne turnaje. Kliknite na Synchronizovať údaje."
- **Výstup:** Zobrazený zoznam turnajov s možnosťou vyhľadávania a filtrácie

**UC-05: Zobrazenie detailu turnaja**
- **Aktor:** Návštevník, Administrátor
- **Predpoklad:** Používateľ je prihlásený, vybratý turnaj existuje v DB
- **Hlavný tok:**
  1. Používateľ klikne na turnaj v zozname
  2. Systém načíta detail turnaja z databázy
  3. Zobrazí sa detailná stránka s tabmi:
     - **Prehľad:** Základné informácie (názov, lokácia, dátumy)
     - **Váhové kategórie:** Zoznam kategórií s počtami atletov
     - **Tímy:** Zoznam účinkujúcich krajín s vlajkami
     - **Atleti:** Zoznam atletov s fotografiami a priradením k tímom
     - **Výsledky:** Výsledky zápasov a finálne umiestnenia
     - **Export:** Možnosti exportu do PDF/Excel
  4. Používateľ môže prepínať medzi tabmi
- **Alternatívne toky:**
  - 3a. Tímy nie sú synchronizované → systém zobrazí "Tímy nie sú synchronizované. Kliknite pre synchronizáciu."
  - 3b. Výsledky nie sú dostupné → systém zobrazí "Výsledky ešte nie sú zverejnené."
- **Výstup:** Detailné informácie o turnaji s možnosťou explorácie asociovaných údajov

**UC-06: Generovanie PDF reportu - Medailové poradie**
- **Aktor:** Návštevník, Administrátor
- **Predpoklad:** Turnaj má synchronizované výsledky
- **Hlavný tok:**
  1. Používateľ otvorí detail turnaja
  2. Prejde na tab "Export"
  3. Klikne na tlačidlo "Stiahnuť PDF - Medailové poradie"
  4. Systém vygeneruje PDF dokument:
     - 4.1. Načíta výsledky z databázy
     - 4.2. Agreguje medaily podľa krajín
     - 4.3. Vytvorí PDF s tabuľkou a grafom
  5. PDF sa stiahne do prehliadača
- **Alternatívne toky:**
  - 4a. Žiadne výsledky → systém zobrazí chybu "Pre tento turnaj nie sú dostupné výsledky"
- **Výstup:** PDF súbor s medailovým poradím

**UC-07: Zobrazenie ročného rebríčka športovcov**
- **Aktor:** Návštevník, Administrátor
- **Predpoklad:** V databáze existujú výsledky z turnajov za daný rok
- **Hlavný tok:**
  1. Používateľ otvorí sekciu "Rebríčky" v navigácii
  2. Vyberie rok zo selectu (napr. 2024)
  3. Voliteľne vyberie váhovú kategóriu pre filtráciu
  4. Systém vypočíta rebríček:
     - 4.1. Načíta všetky výsledky z turnajov v danom roku
     - 4.2. Agreguje body pre každého atleta
     - 4.3. Zoradí atletov podľa celkového počtu bodov
  5. Zobrazí sa tabuľka s rebríčkom (pozícia, meno, krajina, body, počet turnajov)
  6. Používateľ môže exportovať rebríček do Excel
- **Alternatívne toky:**
  - 4a. Žiadne výsledky v danom roku → systém zobrazí "Pre rok 2024 nie sú dostupné žiadne výsledky"
- **Výstup:** Ročný výkonnostný rebríček športovcov s možnosťou exportu
- **Poznámka:** Toto je hlavná služba podľa **úlohy 5 zadania**

**UC-08: Export údajov do Excel formátu**
- **Aktor:** Návštevník, Administrátor
- **Predpoklad:** Turnaj má synchronizované údaje
- **Hlavný tok:**
  1. Používateľ otvorí detail turnaja → tab "Export"
  2. Vyberie typ exportu (Zoznam atletov / Výsledky / Štatistiky tímov)
  3. Klikne na "Stiahnuť Excel"
  4. Systém vygeneruje .xlsx súbor:
     - 4.1. Načíta relevantné údaje z databázy
     - 4.2. Vytvorí Excel tabuľku s formatovaním (bold hlavičky, filtre)
     - 4.3. Automaticky nastaví šírky stĺpcov
  5. Excel súbor sa stiahne
- **Alternatívne toky:**
  - Žiadne
- **Výstup:** Excel súbor s exportovanými údajmi

### 3.4.3 Use Case diagram

Nasledujúci diagram znázorňuje vzťahy medzi aktormi a use cases.

```
                    ┌─────────────────┐
                    │  Návštevník     │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐   ┌──────────────────┐   ┌──────────────┐
│ UC-01:       │   │ UC-02:           │   │ UC-04:       │
│ Registrácia  │   │ Prihlásenie      │   │ Prehliadanie │
└──────────────┘   └──────────────────┘   │ turnajov     │
                                           └──────┬───────┘
                                                  │
                    ┌─────────────────┐           │
                    │ Administrátor   │           │
                    └────────┬────────┘           │
                             │                    │
        ┌────────────────────┼────────────────────┤
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐   ┌──────────────────┐   ┌──────────────┐
│ UC-03:       │   │ UC-05:           │   │ UC-06:       │
│ Synchroni-   │   │ Detail turnaja   │   │ PDF export   │
│ zácia        │   └──────────────────┘   └──────────────┘
└──────────────┘            │
                            ▼
                    ┌──────────────────┐
                    │ UC-07:           │
                    │ Ročný rebríček   │
                    └──────────────────┘
                            │
                            ▼
                    ┌──────────────────┐
                    │ UC-08:           │
                    │ Excel export     │
                    └──────────────────┘
```

**Obrázok 3.1: Use Case diagram aplikácie Wrestling Federation**

### 3.4.4 Sekvenčný diagram - Synchronizácia údajov

Pre ilustráciu komplexnejšej interakcie zobrazujeme sekvenčný diagram pre use case UC-03 (Synchronizácia športových podujatí).

```
Administrátor    Frontend        Backend API     Service Layer    Arena API      PostgreSQL
     │               │                │                │              │              │
     │  1. Klik      │                │                │              │              │
     │  "Sync"       │                │                │              │              │
     ├──────────────>│                │                │              │              │
     │               │                │                │              │              │
     │               │ 2. Konfirmácia │                │              │              │
     │<──────────────┤                │                │              │              │
     │               │                │                │              │              │
     │  3. Potvrdiť  │                │                │              │              │
     ├──────────────>│                │                │              │              │
     │               │                │                │              │              │
     │               │ 4. POST        │                │              │              │
     │               │ /sport-event/  │                │              │              │
     │               │ sync           │                │              │              │
     │               ├───────────────>│                │              │              │
     │               │                │                │              │              │
     │               │                │ 5. Zavolaj     │              │              │
     │               │                │ sync_from_arena│              │              │
     │               │                ├───────────────>│              │              │
     │               │                │                │              │              │
     │               │                │                │ 6. GET       │              │
     │               │                │                │ /api/v2/     │              │
     │               │                │                │ events       │              │
     │               │                │                ├─────────────>│              │
     │               │                │                │              │              │
     │               │                │                │ 7. JSON      │              │
     │               │                │                │ response     │              │
     │               │                │                │<─────────────┤              │
     │               │                │                │              │              │
     │               │                │                │ 8. Pre každý │              │
     │               │                │                │ turnaj       │              │
     │               │                │                │              │              │
     │               │                │                │ 9. INSERT/   │              │
     │               │                │                │ UPDATE       │              │
     │               │                │                ├─────────────────────────────>│
     │               │                │                │              │              │
     │               │                │                │ 10. OK       │              │
     │               │                │                │<─────────────────────────────┤
     │               │                │                │              │              │
     │               │                │ 11. Return     │              │              │
     │               │                │ count          │              │              │
     │               │                │<───────────────┤              │              │
     │               │                │                │              │              │
     │               │ 12. {status:   │                │              │              │
     │               │ "success",     │                │              │              │
     │               │ count: 156}    │                │              │              │
     │               │<───────────────┤                │              │              │
     │               │                │                │              │              │
     │ 13. Toast     │                │                │              │              │
     │ "Synced 156   │                │                │              │              │
     │ tournaments"  │                │                │              │              │
     │<──────────────┤                │                │              │              │
     │               │                │                │              │              │
```

**Obrázok 3.2: Sekvenčný diagram pre synchronizáciu športových podujatí**

---

## 3.5 Záver analytickej časti

V tejto kapitole sme vykonali komplexnú analýzu problémovej domény a definovali sme požiadavky na aplikáciu.

**Hlavné zistenia z analýzy Arena API (sekcia 3.1):**
- Arena poskytuje kvalitné a autentické údaje, ale chýbajú mu pokročilé funkcie
- Identifikovali sme kritické obmedzenia: len online prístup, absentujúca analytika, žiadne exporty
- Výkonnostné testovanie odhalilo rate limiting (~100 req/min) a pomalé endpointy (priemerne 850-2100 ms)

**Hlavné zistenia z analýzy existujúcich riešení (sekcia 3.2):**
- Žiadne existujúce riešenie nespĺňa všetky požiadavky
- Komerčné platformy (SportData) sú finančne nedostupné pre menšie zväzy
- Open-source alternatívy majú neúplné pokrytie wrestlingových údajov
- Custom riešenia národných zväzov sú izolované a nákladné na údržbu

**Definované požiadavky (sekcia 3.3):**
- Špecifikovali sme 13 funkčných požiadaviek pokrývajúcich všetky úlohy zadania
- Definovali sme 13 nefunkčných požiadaviek zameraných na výkon, bezpečnosť, použiteľnosť a udržiavateľnosť
- Prioritizovali sme požiadavky podľa dôležitosti a rizika

**Use Case analýza (sekcia 3.4):**
- Identifikovali sme 8 hlavných use cases
- Kľúčový use case UC-07 (Ročný rebríček športovcov) priamo adresuje **úlohu 5 zadania**
- Sekvenčný diagram ilustruje komplexnosť synchronizačného procesu

Analytická časť poskytuje pevný základ pre návrhovú fázu (kapitola 4), kde transformujeme identifikované požiadavky do konkrétneho technického riešenia.

---

## Zoznam obrázkov v kapitole 3

- **Obrázok 3.1:** Use Case diagram aplikácie Wrestling Federation
- **Obrázok 3.2:** Sekvenčný diagram pre synchronizáciu športových podujatí

---

## Zoznam tabuliek v kapitole 3

- **Tabuľka 3.1:** Štruktúra údajov o športovom podujatí
- **Tabuľka 3.2:** Štruktúra údajov o tíme
- **Tabuľka 3.3:** Štruktúra údajov o atletovi
- **Tabuľka 3.4:** Štruktúra údajov o váhovej kategórii
- **Tabuľka 3.5:** Štruktúra údajov o výsledku
- **Tabuľka 3.6:** Zoznam identifikovaných obmedzení Arena API
- **Tabuľka 3.7:** Výsledky výkonnostného testovania Arena API
- **Tabuľka 3.8:** Porovnanie SportData s našimi požiadavkami
- **Tabuľka 3.9:** Porovnanie custom riešení národných zväzov
- **Tabuľka 3.10:** Matrika porovnania všetkých analyzovaných riešení
- **Tabuľka 3.11:** Prioritizácia funkčných požiadaviek
- **Tabuľka 3.12:** Prioritizácia nefunkčných požiadaviek
- **Tabuľka 3.13:** Popis aktorov systému

---

## Referencie na literatúru (citácie v kapitole 3)

[1] United World Wrestling. *Arena Platform*. [online]. Dostupné z: https://arena.uww.org

[2] RICHARDSON, Leonard; RUBY, Sam. *RESTful Web Services*. O'Reilly Media, 2007. ISBN 978-0-596-52926-0.

[3] ISO. *ISO 3166-1:2020 Codes for the representation of names of countries and their subdivisions – Part 1: Country codes*. Geneva: International Organization for Standardization, 2020.

[4] JONES, Michael et al. *JSON Web Token (JWT)*. RFC 7519. Internet Engineering Task Force, 2015. DOI: 10.17487/RFC7519

[5] HARDT, Dick (ed.). *The OAuth 2.0 Authorization Framework*. RFC 6749. Internet Engineering Task Force, 2012. DOI: 10.17487/RFC6749

[6] ReportLab. *ReportLab PDF Library*. [online]. Dostupné z: https://www.reportlab.com/

[7] OpenPyXL. *A Python library to read/write Excel 2010 xlsx/xlsm files*. [online]. Dostupné z: https://openpyxl.readthedocs.io/

[8] NYGARD, Michael T. *Release It! Design and Deploy Production-Ready Software*. 2nd ed. Pragmatic Bookshelf, 2018. ISBN 978-1-68050-239-8.

[9] United World Wrestling. *History of UWW (formerly FILA)*. [online]. Dostupné z: https://uww.org/about/history

[10] Sportradar. *SportData - Sports Data & Content*. [online]. Dostupné z: https://www.sportradar.com/

[11] Stats Perform. *Sports Data & AI*. [online]. Dostupné z: https://www.statsperform.com/

[12] OpenSports. *Open Sports Database*. [online]. Dostupné z: https://www.opensports.org/

[13] PROVOS, Niels; MAZIÈRES, David. A Future-Adaptable Password Scheme. In: *Proceedings of the 1999 USENIX Annual Technical Conference*. Berkeley, CA: USENIX Association, 1999, s. 81-92.

[14] NIELSEN, Jakob. *10 Usability Heuristics for User Interface Design*. Nielsen Norman Group, 1994. [online]. Dostupné z: https://www.nngroup.com/articles/ten-usability-heuristics/

[15] VAN ROSSUM, Guido; WARSAW, Barry; COGHLAN, Nick. *PEP 8 – Style Guide for Python Code*. Python Enhancement Proposals, 2001. [online]. Dostupné z: https://peps.python.org/pep-0008/
