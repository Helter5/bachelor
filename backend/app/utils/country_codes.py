"""Country code helpers used across services and API responses."""

from typing import Optional


ISO3_TO_ISO2: dict[str, str] = {
    "ALB": "AL",
    "ARM": "AM",
    "AUT": "AT",
    "AZE": "AZ",
    "BEL": "BE",
    "BGR": "BG",
    "BIH": "BA",
    "BLR": "BY",
    "BRA": "BR",
    "CAN": "CA",
    "CHE": "CH",
    "CHN": "CN",
    "COL": "CO",
    "CRO": "HR",
    "CUB": "CU",
    "CYP": "CY",
    "CZE": "CZ",
    "DEU": "DE",
    "DNK": "DK",
    "EGY": "EG",
    "ESP": "ES",
    "EST": "EE",
    "FIN": "FI",
    "FRA": "FR",
    "GBR": "GB",
    "GEO": "GE",
    "GRC": "GR",
    "HUN": "HU",
    "IND": "IN",
    "IRL": "IE",
    "IRN": "IR",
    "ISL": "IS",
    "ISR": "IL",
    "ITA": "IT",
    "JPN": "JP",
    "KAZ": "KZ",
    "KGZ": "KG",
    "KOR": "KR",
    "LTU": "LT",
    "LVA": "LV",
    "MDA": "MD",
    "MKD": "MK",
    "MNE": "ME",
    "MNG": "MN",
    "NLD": "NL",
    "NOR": "NO",
    "POL": "PL",
    "PRT": "PT",
    "ROU": "RO",
    "SRB": "RS",
    "SVK": "SK",
    "SVN": "SI",
    "SWE": "SE",
    "TJK": "TJ",
    "TUR": "TR",
    "UKR": "UA",
    "USA": "US",
    "UZB": "UZ",
}


def normalize_country_iso_code(code: Optional[str]) -> Optional[str]:
    """Normalize country code to uppercase ISO-3166 alpha-2 when possible."""
    if not code:
        return None

    trimmed = code.strip().upper()
    if not trimmed:
        return None

    if len(trimmed) == 2:
        return trimmed

    if len(trimmed) == 3:
        return ISO3_TO_ISO2.get(trimmed, trimmed)

    return trimmed
