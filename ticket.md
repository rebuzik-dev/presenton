# Ticket: Handover & Analysis Summary

## Task
Analyze the Server-Side Template Generation logic and refactor OpenAI configuration.

## Goal
1. Understand how the system creates new templates from uploaded presentations.
2. Externalize hardcoded AI model settings to allow configuration via environment variables.

## Context
The user wanted to know "where the generator is" and "how to change the model". We discovered that "generation" is an AI-driven pipeline, not a simple script.

## System Architecture Findings (The "Magic")
The template generation is a **Hybrid AI Pipeline**:
1.  **Input**: User uploads a `.pptx` file.
2.  **Processing**: `pptx_slides.py` unzips it, extracts OXML (structure), and screenshots the slides (visuals).
3.  **AI Transformation**: `slide_to_html.py` calls OpenAI (GPT-5 by default) with `GENERATE_HTML_SYSTEM_PROMPT` to convert the Screenshot+OXML into HTML/Tailwind.
4.  **React Conversion**: `slide_to_html.py` calls OpenAI again with `HTML_TO_REACT_SYSTEM_PROMPT` to turn that HTML into a dynamic React component and Zod schema.

## Decisions Made
- **Config Externalization**: We moved the OpenAI model name and API base URL out of `slide_to_html.py` and into `os.getenv` calls.
    - `TEMPLATE_MODEL`: Defaults to `gpt-5`.
    - `TEMPLATE_API_BASE`: Defaults to `None` (standard OpenAI API).
- **Documentation**: We updated `ARCHITECTURE.md` to reflect the Next.js (Frontend) + FastAPI (Backend) split.

## Next Actions for Developer
- Ensure `OPENAI_API_KEY` is set in `.env`.
- If using a different model (e.g., `gpt-4o` or a local LLM), set `OPENAI_MODEL` and `OPENAI_API_BASE` in `.env`.
- To modify the "instructions" for generation, edit `servers/fastapi/api/v1/ppt/endpoints/prompts.py`.
