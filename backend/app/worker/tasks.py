import csv
import io
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.core.minio_client import get_minio_client, BUCKET_NAME
from app.models.nbfc import Nbfc  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.csv_upload import CsvUpload, UploadStatus
from app.models.borrower import Borrower, SmaBucket, PriorityAction


def compute_sma_bucket(dpd_days: int) -> SmaBucket:
    if dpd_days == 0:
        return None  # not overdue
    elif 1 <= dpd_days <= 30:
        return SmaBucket.SMA_0
    elif 31 <= dpd_days <= 60:
        return SmaBucket.SMA_1
    elif 61 <= dpd_days <= 89:
        return SmaBucket.SMA_2
    else:
        return SmaBucket.NPA


def compute_priority_action(sma_bucket: SmaBucket) -> PriorityAction:
    if sma_bucket in (SmaBucket.SMA_0, SmaBucket.SMA_1):
        return PriorityAction.telecaller_call
    elif sma_bucket == SmaBucket.SMA_2:
        return PriorityAction.whatsapp
    elif sma_bucket == SmaBucket.NPA:
        return PriorityAction.field_visit
    return PriorityAction.telecaller_call


def compute_priority_reason(sma_bucket: SmaBucket, dpd_days: int) -> str:
    if sma_bucket is None:
        return "Account is current — no overdue amount"
    elif sma_bucket == SmaBucket.SMA_0:
        return f"Early delinquency — {dpd_days} days overdue. Telecaller follow-up recommended."
    elif sma_bucket == SmaBucket.SMA_1:
        return f"Moderate delinquency — {dpd_days} days overdue. Immediate telecaller contact required."
    elif sma_bucket == SmaBucket.SMA_2:
        return f"Serious delinquency — {dpd_days} days overdue. WhatsApp reminder with payment link."
    else:
        return f"NPA — {dpd_days} days overdue. Field visit required for recovery."


async def process_csv_upload(ctx, upload_id: str):
    """
    ARQ background task — parses CSV from MinIO and upserts borrower records.
    """
    db: Session = SessionLocal()
    minio = get_minio_client()

    try:
        # 1. fetch the upload record
        upload = db.query(CsvUpload).filter(CsvUpload.id == upload_id).first()
        if not upload:
            return {"error": "Upload record not found"}

        # mark as processing
        upload.status = UploadStatus.processing
        upload.processing_started_at = datetime.now(timezone.utc)
        db.commit()

        # 2. download CSV from MinIO
        response = minio.get_object(BUCKET_NAME, upload.minio_object_key)
        csv_bytes = response.read()
        response.close()

        # 3. parse CSV
        csv_text = csv_bytes.decode("utf-8")
        reader = csv.DictReader(io.StringIO(csv_text))
        rows = list(reader)

        ingested = 0
        skipped = 0
        errors = []

        for i, row in enumerate(rows, start=2):  # start=2 because row 1 is header
            try:
                loan_account_number = row.get("loan_account_number", "").strip()
                if not loan_account_number:
                    skipped += 1
                    errors.append({"row": i, "field": "loan_account_number", "reason": "Missing value"})
                    continue

                dpd_days = int(row.get("dpd_days") or 0)
                sma_bucket = compute_sma_bucket(dpd_days)
                priority_action = compute_priority_action(sma_bucket)
                priority_reason = compute_priority_reason(sma_bucket, dpd_days)

                # upsert — update if exists, create if not
                borrower = db.query(Borrower).filter(
                    Borrower.loan_account_number == loan_account_number
                ).first()

                if borrower:
                    # update existing
                    borrower.full_name = row.get("full_name", borrower.full_name).strip()
                    borrower.phone_number = row.get("phone_number", borrower.phone_number).strip()
                    borrower.state = row.get("state", "").strip() or borrower.state
                    borrower.emi_amount = row.get("emi_amount") or borrower.emi_amount
                    borrower.outstanding_balance = row.get("outstanding_balance") or borrower.outstanding_balance
                    borrower.due_date = row.get("due_date") or borrower.due_date
                    borrower.dpd_days = dpd_days
                    borrower.last_payment_date = row.get("last_payment_date") or borrower.last_payment_date
                    borrower.last_payment_amount = row.get("last_payment_amount") or borrower.last_payment_amount
                    borrower.sma_bucket = sma_bucket
                    borrower.priority_action = priority_action
                    borrower.priority_reason = priority_reason
                    borrower.updated_at = datetime.now(timezone.utc)
                else:
                    # create new
                    borrower = Borrower(
                        loan_account_number=loan_account_number,
                        full_name=row.get("full_name", "").strip(),
                        phone_number=row.get("phone_number", "").strip(),
                        state=row.get("state", "").strip(),
                        emi_amount=row.get("emi_amount") or None,
                        outstanding_balance=row.get("outstanding_balance") or None,
                        due_date=row.get("due_date") or None,
                        dpd_days=dpd_days,
                        last_payment_date=row.get("last_payment_date") or None,
                        last_payment_amount=row.get("last_payment_amount") or None,
                        sma_bucket=sma_bucket,
                        priority_action=priority_action,
                        priority_reason=priority_reason,
                    )
                    db.add(borrower)

                db.commit()
                ingested += 1

            except Exception as e:
                skipped += 1
                errors.append({"row": i, "field": "unknown", "reason": str(e)})
                db.rollback()

        # 4. update upload record with results
        upload.status = UploadStatus.complete
        upload.row_count = len(rows)
        upload.ingested_count = ingested
        upload.skipped_count = skipped
        upload.error_summary = errors if errors else None
        upload.completed_at = datetime.now(timezone.utc)
        db.commit()

        return {"ingested": ingested, "skipped": skipped}

    except Exception as e:
        if upload:
            upload.status = UploadStatus.failed
            upload.completed_at = datetime.now(timezone.utc)
            db.commit()
        return {"error": str(e)}

    finally:
        db.close()