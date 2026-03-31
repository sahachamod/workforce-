import uuid
from datetime import datetime
from typing import Optional
import logging
import logging.handlers


def generate_uuid() -> str:
    return str(uuid.uuid4())


def now_utc() -> datetime:
    return datetime.utcnow()


def format_datetime(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None


def parse_datetime(dt_str: Optional[str]) -> Optional[datetime]:
    return datetime.fromisoformat(dt_str) if dt_str else None


def setup_logging(service_name: str, log_file: Optional[str] = None) -> logging.Logger:
    logger = logging.getLogger(service_name)
    logger.setLevel(logging.INFO)

    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    if log_file:
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=10 * 1024 * 1024,
            backupCount=5
        )
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    return logger


def calculate_date_diff(start_date: datetime, end_date: datetime) -> float:
    delta = end_date - start_date
    return delta.total_seconds() / (24 * 3600)


def get_year_range(year: int) -> tuple[datetime, datetime]:
    start = datetime(year, 1, 1)
    end = datetime(year, 12, 31, 23, 59, 59)
    return start, end


def chunk_list(lst: list, chunk_size: int) -> list:
    return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)]


def sanitize_string(s: str) -> str:
    return s.strip().replace('\x00', '')
