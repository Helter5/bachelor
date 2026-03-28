"""
Base Service Class
Provides common functionality for all service classes
"""
from sqlmodel import Session
from typing import Generic, TypeVar, Type, Optional, List
from sqlmodel import select

ModelType = TypeVar("ModelType")


class BaseService(Generic[ModelType]):
    """Base service with common CRUD operations"""

    def __init__(self, session: Session, model: Type[ModelType]):
        self.session = session
        self.model = model

    def get_by_id(self, id: int) -> Optional[ModelType]:
        """Get entity by ID"""
        return self.session.get(self.model, id)

    def get_all(self) -> List[ModelType]:
        """Get all entities"""
        return list(self.session.exec(select(self.model)).all())

    def create(self, entity: ModelType) -> ModelType:
        """Create new entity"""
        self.session.add(entity)
        self.session.commit()
        self.session.refresh(entity)
        return entity

    def update(self, entity: ModelType) -> ModelType:
        """Update existing entity"""
        self.session.add(entity)
        self.session.commit()
        self.session.refresh(entity)
        return entity

    def delete(self, id: int) -> bool:
        """Delete entity by ID"""
        entity = self.get_by_id(id)
        if entity:
            self.session.delete(entity)
            self.session.commit()
            return True
        return False

    @staticmethod
    def has_changes(existing, new_data: dict, exclude_fields: set = None) -> bool:
        """Compare new data with existing DB record. Returns True if any field actually changed."""
        exclude = exclude_fields or set()
        for key, new_value in new_data.items():
            if key in exclude:
                continue
            old_value = getattr(existing, key, None)
            # Both None
            if old_value is None and new_value is None:
                continue
            # One is None
            if old_value is None or new_value is None:
                return True
            # Compare as stripped strings to handle type mismatches
            # and PostgreSQL CHAR padding (e.g. 'TH ' vs 'TH')
            if str(old_value).strip() != str(new_value).strip():
                return True
        return False
