"""
Legacy view endpoints for displaying PDFs inline
These were moved from sport_events.py during refactoring
"""
from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter()


@router.get("/show/team/{sportEventId}")
async def show_teams_list_pdf(sportEventId: str):
    """
    Show PDF with teams list in an HTML viewer

    Args:
        sportEventId: Sport event UUID

    Returns HTML page with embedded PDF
    """
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Teams List - {sportEventId}</title>
        <style>
            body, html {{
                margin: 0;
                padding: 0;
                height: 100%;
                overflow: hidden;
            }}
            object {{
                width: 100%;
                height: 100%;
            }}
        </style>
    </head>
    <body>
        <object data="/team/{sportEventId}/print" type="application/pdf" width="100%" height="100%">
            <p>Unable to display PDF. <a href="/team/{sportEventId}/print">Download PDF</a> instead.</p>
        </object>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


@router.get("/show/athlete/{sportEventId}")
async def show_athletes_list_pdf(sportEventId: str):
    """
    Show PDF with athletes list in an HTML viewer

    Args:
        sportEventId: Sport event UUID

    Returns HTML page with embedded PDF
    """
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Athletes List - {sportEventId}</title>
        <style>
            body, html {{
                margin: 0;
                padding: 0;
                height: 100%;
                overflow: hidden;
            }}
            object {{
                width: 100%;
                height: 100%;
            }}
        </style>
    </head>
    <body>
        <object data="/athlete/{sportEventId}/print" type="application/pdf" width="100%" height="100%">
            <p>Unable to display PDF. <a href="/athlete/{sportEventId}/print">Download PDF</a> instead.</p>
        </object>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


@router.get("/show/start-list/{sportEventId}")
async def show_start_list_pdf(sportEventId: str):
    """
    Show PDF with start list in an HTML viewer

    Args:
        sportEventId: Sport event UUID

    Returns HTML page with embedded PDF
    """
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Start List - {sportEventId}</title>
        <style>
            body, html {{
                margin: 0;
                padding: 0;
                height: 100%;
                overflow: hidden;
            }}
            object {{
                width: 100%;
                height: 100%;
            }}
        </style>
    </head>
    <body>
        <object data="/sport-event/{sportEventId}/start-list/print" type="application/pdf" width="100%" height="100%">
            <p>Unable to display PDF. <a href="/sport-event/{sportEventId}/start-list/print">Download PDF</a> instead.</p>
        </object>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)
