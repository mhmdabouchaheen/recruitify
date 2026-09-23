from pathlib import Path

from app.core.config import settings

UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads" / "cvs"


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
    except ImportError as exc:
        raise CVStorageError("boto3 is required for S3 CV storage") from exc

    kwargs = {}
    if settings.aws_endpoint_url_s3:
        kwargs["endpoint_url"] = settings.aws_endpoint_url_s3
    if settings.aws_region:
        kwargs["region_name"] = settings.aws_region
    return boto3.client("s3", **kwargs)


def _bucket() -> str:
    if not settings.cv_storage_bucket:
        raise CVStorageError("CV_STORAGE_BUCKET is required when CV_STORAGE_BACKEND=s3")
    return settings.cv_storage_bucket


def save_cv_bytes(stored_filename: str, content: bytes, content_type: str = "application/pdf") -> None:
    if _backend() == "s3":
        _s3_client().put_object(
            Bucket=_bucket(),
            Key=_object_key(stored_filename),
            Body=content,
            ContentType=content_type or "application/pdf",
        )
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
                raise FileNotFoundError("Stored CV file could not be found") from exc
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
        except Exception:
            # Deleting a missing object should not break application state.
            return
        return

    safe_name = Path(stored_filename).name
    path = UPLOAD_ROOT / safe_name
    if path.exists() and path.is_file() and path.parent == UPLOAD_ROOT:
        path.unlink()
