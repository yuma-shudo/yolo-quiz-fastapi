from sqlalchemy import Column, Integer, String, DateTime
from database import Base
import datetime

class ImageRecord(Base):
    __tablename__ = "images"
    id = Column(Integer, primary_key=True)
    file_path = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    order = Column(Integer, nullable=True)

    class Config:
        from_attributes = True