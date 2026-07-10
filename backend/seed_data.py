"""
Seed script — populates the database with realistic demo data.
Run from backend/ directory:
    python seed_data.py
"""

import uuid
from datetime import date, datetime, timezone, timedelta
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.core.security import hash_password
from app.models.nbfc import Nbfc
from app.models.user import User
from app.models.borrower import Borrower, SmaBucket, PriorityAction
from app.models.interaction_log import InteractionLog, InteractionType, InteractionOutcome


def run_seed():
    db: Session = SessionLocal()

    try:
        print("🌱 Starting seed...")

        # 1. Create NBFC
        existing_nbfc = db.query(Nbfc).filter(Nbfc.slug == "demo-finance").first()
        if existing_nbfc:
            nbfc = existing_nbfc
            print("  ✓ NBFC already exists, skipping")
        else:
            nbfc = Nbfc(
                id=uuid.uuid4(),
                name="Demo Finance Pvt Ltd",
                slug="demo-finance",
                is_active=True,
            )
            db.add(nbfc)
            db.commit()
            db.refresh(nbfc)
            print(f"  ✓ Created NBFC: {nbfc.name}")

        # 2. Create users
        manager_email = "manager@demofin.com"
        existing_manager = db.query(User).filter(User.email == manager_email).first()
        if existing_manager:
            manager = existing_manager
            print("  ✓ Manager already exists, skipping")
        else:
            manager = User(
                id=uuid.uuid4(),
                nbfc_id=nbfc.id,
                email=manager_email,
                hashed_password=hash_password("Demo@1234"),
                role="manager",
                full_name="Anil Sharma",
            )
            db.add(manager)
            db.commit()
            db.refresh(manager)
            print(f"  ✓ Created manager: {manager.email}")

        telecaller_email = "telecaller@demofin.com"
        existing_telecaller = db.query(User).filter(User.email == telecaller_email).first()
        if existing_telecaller:
            telecaller = existing_telecaller
            print("  ✓ Telecaller already exists, skipping")
        else:
            telecaller = User(
                id=uuid.uuid4(),
                nbfc_id=nbfc.id,
                email=telecaller_email,
                hashed_password=hash_password("Demo@1234"),
                role="telecaller",
                full_name="Sunita Verma",
            )
            db.add(telecaller)
            db.commit()
            db.refresh(telecaller)
            print(f"  ✓ Created telecaller: {telecaller.email}")
        
        field_agent_email = "agent@demofin.com"
        existing_agent = db.query(User).filter(User.email == field_agent_email).first()
        if existing_agent:
            field_agent = existing_agent
            print("  ✓ Field agent already exists, skipping")
        else:
            field_agent = User(
                id=uuid.uuid4(),
                nbfc_id=nbfc.id,
                email=field_agent_email,
                hashed_password=hash_password("Demo@1234"),
                role="field_agent",
                full_name="Ravi Kumar",
            )
            db.add(field_agent)
            db.commit()
            db.refresh(field_agent)
            print(f"  ✓ Created field agent: {field_agent.email}")

        # 3. Create borrowers
        borrowers_data = [
            {
                "loan_account_number": "SEED-2024-0001",
                "full_name": "Arvind Mehta",
                "phone_number": "9812345670",
                "state": "Maharashtra",
                "emi_amount": 12000,
                "outstanding_balance": 288000,
                "due_date": date(2025, 6, 1),
                "dpd_days": 95,
                "sma_bucket": SmaBucket.NPA,
                "priority_action": PriorityAction.field_visit,
                "priority_reason": "NPA — 95 days overdue. Field visit required for recovery.",
            },
            {
                "loan_account_number": "SEED-2024-0002",
                "full_name": "Kavitha Reddy",
                "phone_number": "9823456781",
                "state": "Telangana",
                "emi_amount": 8500,
                "outstanding_balance": 170000,
                "due_date": date(2025, 6, 1),
                "dpd_days": 62,
                "sma_bucket": SmaBucket.SMA_2,
                "priority_action": PriorityAction.whatsapp,
                "priority_reason": "Serious delinquency — 62 days overdue. WhatsApp reminder with payment link.",
            },
            {
                "loan_account_number": "SEED-2024-0003",
                "full_name": "Harpreet Singh",
                "phone_number": "9834567892",
                "state": "Punjab",
                "emi_amount": 15000,
                "outstanding_balance": 450000,
                "due_date": date(2025, 6, 1),
                "dpd_days": 45,
                "sma_bucket": SmaBucket.SMA_1,
                "priority_action": PriorityAction.telecaller_call,
                "priority_reason": "Moderate delinquency — 45 days overdue. Immediate telecaller contact required.",
            },
            {
                "loan_account_number": "SEED-2024-0004",
                "full_name": "Meena Pillai",
                "phone_number": "9845678903",
                "state": "Kerala",
                "emi_amount": 6000,
                "outstanding_balance": 72000,
                "due_date": date(2025, 6, 1),
                "dpd_days": 18,
                "sma_bucket": SmaBucket.SMA_0,
                "priority_action": PriorityAction.telecaller_call,
                "priority_reason": "Early delinquency — 18 days overdue. Telecaller follow-up recommended.",
            },
            {
                "loan_account_number": "SEED-2024-0005",
                "full_name": "Rajan Gupta",
                "phone_number": "9856789014",
                "state": "Delhi",
                "emi_amount": 20000,
                "outstanding_balance": 600000,
                "due_date": date(2025, 6, 1),
                "dpd_days": 110,
                "sma_bucket": SmaBucket.NPA,
                "priority_action": PriorityAction.field_visit,
                "priority_reason": "NPA — 110 days overdue. Field visit required for recovery.",
            },
        ]

        created_borrowers = []
        for b in borrowers_data:
            existing = db.query(Borrower).filter(
                Borrower.loan_account_number == b["loan_account_number"]
            ).first()
            if existing:
                created_borrowers.append(existing)
                print(f"  ✓ Borrower {b['loan_account_number']} already exists, skipping")
            else:
                borrower = Borrower(
                    nbfc_id=nbfc.id,
                    **b
                )
                db.add(borrower)
                db.commit()
                db.refresh(borrower)
                created_borrowers.append(borrower)
                print(f"  ✓ Created borrower: {borrower.full_name}")

        # 4. Create interaction logs
        interactions_data = [
            {
                "borrower": created_borrowers[0],  # Arvind Mehta — NPA
                "interaction_type": InteractionType.telecall,
                "outcome": InteractionOutcome.not_reachable,
                "note": "Phone switched off",
                "days_ago": 5,
            },
            {
                "borrower": created_borrowers[0],
                "interaction_type": InteractionType.telecall,
                "outcome": InteractionOutcome.refused,
                "note": "Borrower refused to pay, claims dispute",
                "days_ago": 10,
            },
            {
                "borrower": created_borrowers[1],  # Kavitha Reddy — SMA-2
                "interaction_type": InteractionType.telecall,
                "outcome": InteractionOutcome.promise_to_pay,
                "ptp_date": date.today() + timedelta(days=5),
                "ptp_amount": 8500,
                "note": "Will pay by next Friday",
                "days_ago": 3,
            },
            {
                "borrower": created_borrowers[2],  # Harpreet Singh — SMA-1
                "interaction_type": InteractionType.telecall,
                "outcome": InteractionOutcome.not_reachable,
                "note": "No answer, tried 3 times",
                "days_ago": 1,
            },
        ]

        for i in interactions_data:
            borrower = i["borrower"]
            log = InteractionLog(
                borrower_id=borrower.id,
                nbfc_id=nbfc.id,
                logged_by=telecaller.id,
                interaction_type=i["interaction_type"],
                outcome=i["outcome"],
                ptp_date=i.get("ptp_date"),
                ptp_amount=i.get("ptp_amount"),
                note=i.get("note"),
                created_at=datetime.now(timezone.utc) - timedelta(days=i["days_ago"]),
            )
            db.add(log)

        db.commit()
        print(f"  ✓ Created {len(interactions_data)} interaction logs")

        print("\n✅ Seed complete.")
        print("\nDemo credentials:")
        print("  Manager:    manager@demofin.com  /  Demo@1234")
        print("  Telecaller: telecaller@demofin.com  /  Demo@1234")
        print("  Field Agent: agent@demofin.com  /  Demo@1234")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()