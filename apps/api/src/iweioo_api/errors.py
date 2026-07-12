from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


@dataclass(slots=True)
class ProblemError(Exception):
    status: int
    code: str
    title: str
    detail: str | None = None
    headers: dict[str, str] | None = None


def problem_response(
    request: Request,
    *,
    status: int,
    code: str,
    title: str,
    detail: str | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    body: dict[str, Any] = {
        "type": f"https://iweioo.com/problems/{code}",
        "title": title,
        "status": status,
        "code": code,
    }
    if detail:
        body["detail"] = detail
    if isinstance(request_id, str):
        body["request_id"] = request_id
    response_headers = {"Cache-Control": "no-store", **(headers or {})}
    return JSONResponse(
        body,
        status_code=status,
        headers=response_headers,
        media_type="application/problem+json",
    )


def install_problem_handlers(application: FastAPI) -> None:
    @application.exception_handler(ProblemError)
    async def handle_problem(request: Request, error: ProblemError) -> JSONResponse:
        return problem_response(
            request,
            status=error.status,
            code=error.code,
            title=error.title,
            detail=error.detail,
            headers=error.headers,
        )

    @application.exception_handler(RequestValidationError)
    async def handle_validation(request: Request, _: RequestValidationError) -> JSONResponse:
        return problem_response(
            request,
            status=400,
            code="invalid_request",
            title="The request did not match the API contract",
        )
