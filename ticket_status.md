# Ticket Status

## Done
- **Analyzed Template Generation Logic**: 
    - Discovered it's a 3-part pipeline:
        1. Deconstruction (`pptx_slides.py`): Unzip PPTX, extract OXML, screenshot slides.
        2. "Vision" Analysis (`slide_to_html.py`): OpenAI GPT-4/5 converts Screenshot+OXML -> HTML.
        3. Componentization (`slide_to_html.py`): OpenAI converts HTML -> React Component + Zod Schema.
- **Refactored OpenAI Configuration**:
    - Modified `servers/fastapi/api/v1/ppt/endpoints/slide_to_html.py` to read `TEMPLATE_MODEL` and `TEMPLATE_API_BASE` from environment variables.
    - Updated `.env` to include `TEMPLATE_MODEL=gpt-5` and `TEMPLATE_API_BASE` (commented out).
- **Basic Documentation**:
    - Created `README.md` (developer guide), `ARCHITECTURE.md` (project structure).

## In Progress
- None (Handover phase).

## Deferred / Next Steps
- **Verify Generation**: Run a real test of the generation pipeline to ensure the new env vars work as expected (requires valid API key).
- **Prompt Management**: Consider extracting the long system prompts in `prompts.py` to external text/markdown files for better manageability.
