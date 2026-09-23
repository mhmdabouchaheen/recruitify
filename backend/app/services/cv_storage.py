import logging
from pathlib import Path

from app.core.config import settings

UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads" / "cvs"
logger = logging.getLogger(__name__)


class CVStorageError(RuntimeError):
    pass


def _backend() -> str:
    return settings.cv_storage_backend.strip().lower()


def _object_key(stored_filename: str) -> str:
    safe_name = Path(stored_filename).name
    prefix = settings.cv_storage_prefix.strip().strip("/")
    return f"{prefix}/{safe_name}" if prefix else safe_name


def _s3_client():
    try:
        import boto3
        from botocore.config import Config
    except ImportError as exc:
        raise CVStorageError("boto3 is required for S3 CV storage") from exc

    kwargs = {}
    if settings.aws_endpoint_url_s3:
        kwargs["endpoint_url"] = settings.aws_endpoint_url_s3
    if settings.aws_region:
        kwargs["region_name"] = settings.aws_region
    if settings.cv_storage_force_path_style:
        kwargs["config"] = Config(signature_version="s3v4", s3={"addressing_style": "path"})
    return boto3.client("s3", **kwargs)


def _bucket() -> str:
    if not settings.cv_storage_bucket:
        raise CVStorageError("CV_STORAGE_BUCKET is required when CV_STORAGE_BACKEND=s3")
    return settings.cv_storage_bucket


def _safe_error_details(exc: Exception) -> dict[str, str | bool | None]:
    response = getattr(exc, "response", {}) or {}
    error = response.get("Error", {}) if isinstance(response, dict) else {}
    return {
        "error_type": exc.__class__.__name__,
        "error_code": error.get("Code"),
        "http_status": response.get("ResponseMetadata", {}).get("HTTPStatusCode") if isinstance(response, dict) else None,
        "backend": _backend(),
        "bucket": settings.cv_storage_bucket,
        "endpoint_configured": bool(settings.aws_endpoint_url_s3),
        "region": settings.aws_region,
        "force_path_style": settings.cv_storage_force_path_style,
    }


def _log_storage_error(operation: str, stored_filename: str, exc: Exception) -> None:
    key = _object_key(stored_filename)
    logger.exception(
        "CV storage %s failed for bucket=%s key=%s backend=%s endpoint_configured=%s region=%s force_path_style=%s error_type=%s error_code=%s http_status=%s",
        operation,
        settings.cv_storage_bucket,
        key,
        _backend(),
        bool(settings.aws_endpoint_url_s3),
        settings.aws_region,
        settings.cv_storage_force_path_style,
        _safe_error_details(exc).get("error_type"),
        _safe_error_details(exc).get("error_code"),
        _safe_error_details(exc).get("http_status"),
    )


def save_cv_bytes(stored_filename: str, content: bytes, content_type: str = "application/pdf") -> None:
    if _backend() == "s3":
        try:
            _s3_client().put_object(
                Bucket=_bucket(),
                Key=_object_key(stored_filename),
                Body=content,
                ContentType=content_type or "application/pdf",
            )
        except Exception as exc:
            _log_storage_error("upload", stored_filename, exc)
            raise CVStorageError("Stored CV file could not be uploaded to object storage") from exc
        return

    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    (UPLOAD_ROOT / Path(stored_filename).name).write_bytes(content)


def read_cv_bytes(stored_filename: str) -> bytes:
    if _backend() == "s3":
        try:
            response = _s3_client().get_object(Bucket=_bucket(), Key=_object_key(stored_filename))
            return response["Body"].read()
        except Exception as exc:
            code = getattr(exc, "response", {}).get("Error", {}).get("Code")
            if code in {"NoSuchKey", "404", "NotFound"}:
                _log_storage_error("read_missing", stored_filename, exc)
                raise FileNotFoundError("Stored CV file could not be found") from exc
            _log_storage_error("read", stored_filename, exc)
            raise CVStorageError("Stored CV file could not be read from object storage") from exc

    safe_name = Path(stored_filename).name
    path = UPLOAD_ROOT / safe_name
    if not path.exists() or not path.is_file() or path.parent != UPLOAD_ROOT:
        raise FileNotFoundError("Stored CV file could not be found")
    return path.read_bytes()


def delete_cv_file(stored_filename: str) -> None:
    if _backend() == "s3":
        try:
            _s3_client().delete_object(Bucket=_bucket(), Key=_object_key(stored_filename))
        except Exception as exc:
            code = getattr(exc, "response", {}).get("Error", {}).get("Code")
            if code in {"NoSuchKey", "404", "NotFound"}:
                _log_storage_error("delete_missing", stored_filename, exc)
                return
            _log_storage_error("delete", stored_filename, exc)
            raise CVStorageError("Stored CV file could not be deleted from object storage") from exc
        return

    safe_name = Path(stored_filename).name
    path = UPLOAD_ROOT / safe_name
    if path.exists() and path.is_file() and path.parent == UPLOAD_ROOT:
        path.unlink()
