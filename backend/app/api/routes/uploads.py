from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import uuid

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.csv_upload import CsvUpload, UploadStatus
from app.schemas.csv_upload import CsvUploadResponse
from app.core.minio_client import get_minio_client, BUCKET_NAME

router = APIRouter()


@router.post("/csv", response_model=CsvUploadResponse)
def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    object_key = f"uploads/{current_user.id}/{uuid.uuid4()}.csv"

    # upload to MinIO
    minio = get_minio_client()
    try:
        file_bytes = file.file.read()
        file_size = len(file_bytes)

        import io
        minio.put_object(
            bucket_name=BUCKET_NAME,
            object_name=object_key,
            data=io.BytesIO(file_bytes),
            length=file_size,
            content_type="text/csv",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MinIO upload failed: {str(e)}")

    # create upload record in DB
    upload = CsvUpload(
        uploaded_by=current_user.id,
        minio_object_key=object_key,
        status=UploadStatus.pending,
    )
    db.add(upload)
    db.commit()
    db.refresh(upload)

    return upload


@router.get("/{upload_id}/status", response_model=CsvUploadResponse)
def get_upload_status(
    upload_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    upload = db.query(CsvUpload).filter(CsvUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    return upload