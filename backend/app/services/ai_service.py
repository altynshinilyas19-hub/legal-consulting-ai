from __future__ import annotations

import importlib.util
import os
from pathlib import Path

from app.core.config import get_settings


_AI_MODULE = None


def _set_env_if_present(key: str, value: str | None) -> None:
    if value:
        os.environ.setdefault(key, value)


def _load_ai_module():
    global _AI_MODULE
    if _AI_MODULE is not None:
        return _AI_MODULE

    settings = get_settings()
    ai_path = settings.project_root / "ai.py"
    _set_env_if_present("LEGAL_DB_DSN", settings.legal_db_dsn)
    _set_env_if_present("LEGAL_AI_API_KEY", settings.legal_ai_api_key)
    _set_env_if_present("LEGAL_AI_BASE_URL", settings.legal_ai_base_url)
    _set_env_if_present("LEGAL_AI_MODEL", settings.legal_ai_model)
    spec = importlib.util.spec_from_file_location("legacy_legal_ai", ai_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load ai.py from {ai_path}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    _AI_MODULE = module
    return module


def run_ai_consultation(message: str, history: list[dict]) -> dict:
    module = _load_ai_module()
    return module.run_consultation(message, history)


def get_case_from_ai(case_id: int):
    module = _load_ai_module()
    if hasattr(module, "get_case_by_id"):
        return module.get_case_by_id(case_id)
    return None
