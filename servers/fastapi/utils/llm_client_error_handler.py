from fastapi import HTTPException
from openai import APIError as OpenAIAPIError
from google.genai.errors import APIError as GoogleAPIError
from llmai.shared.errors import BaseError as LLMAIBaseError
from utils.llm_failure import classify_llm_exception


def handle_llm_client_exceptions(e: Exception) -> HTTPException:
    if isinstance(e, HTTPException):
        return e
    if isinstance(e, LLMAIBaseError):
        return HTTPException(status_code=e.status_code, detail=e.message)
    if isinstance(e, OpenAIAPIError):
        failure = classify_llm_exception(e)
        return HTTPException(status_code=failure.http_status, detail=failure.detail)
    if isinstance(e, GoogleAPIError):
        return HTTPException(status_code=500, detail=f"Google API error: {e.message}")
    return HTTPException(status_code=500, detail=f"LLM API error: {e}")
