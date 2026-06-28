## SQLAlchemy base class all models inherit from

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass