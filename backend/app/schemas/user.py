from pydantic import BaseModel
import uuid


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: str

    class Config:
        from_attributes = True
