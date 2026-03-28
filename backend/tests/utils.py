"""
Testovacie utility — jednotný formát výstupu pre sync validácie.
"""


def check(label: str, arena_val, app_val, *, width: int = 20) -> bool:
    """
    Porovná arena_val a app_val, vypíše riadok a vráti True ak sa zhodujú.

    Príklad výstupu:
      [PASS] name               Arena: Slovakia              App: Slovakia
      [FAIL] athlete_count      Arena: 5                     App: 3
    """
    ok = str(arena_val).strip() == str(app_val).strip()
    status = "PASS" if ok else "FAIL"
    print(f"    [{status}] {label:<{width}} Arena: {str(arena_val):<28} App: {str(app_val)}")
    return ok


def section(title: str) -> None:
    """Vypíše nadpis sekcie (napr. názov eventu)."""
    print(f"\n  {title}")


def result(errors: list[str], context: str = "") -> None:
    """
    Na konci testu vypíše súhrnný výsledok.
    Ak sú chyby, vyhodí AssertionError.
    """
    if errors:
        msg = "\n".join(errors)
        raise AssertionError(f"{context}\n{msg}" if context else msg)
