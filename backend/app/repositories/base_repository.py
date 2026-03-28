"""Base Repository with generic CRUD operations"""
from typing import Generic, TypeVar, Type, List, Optional
from sqlmodel import Session, SQLModel, select
from uuid import UUID

T = TypeVar('T', bound=SQLModel)


class BaseRepository(Generic[T]):
    """Generic repository for common database operations"""
    
    def __init__(self, session: Session, model: Type[T]):
        self.session = session
        self.model = model
    
    def get_by_id(self, id: int) -> Optional[T]:
        """Get entity by primary key ID"""
        return self.session.get(self.model, id)
    
    def get_by_uid(self, uid: UUID) -> Optional[T]:
        """Get entity by UUID (for synced entities)"""
        statement = select(self.model).where(self.model.uid == uid)
        return self.session.exec(statement).first()
    
    def get_all(self, skip: int = 0, limit: int = 100) -> List[T]:
        """Get all entities with pagination"""
        statement = select(self.model).offset(skip).limit(limit)
        return list(self.session.exec(statement).all())
    
    def create(self, entity: T) -> T:
        """Create new entity"""
        self.session.add(entity)
        self.session.commit()
        self.session.refresh(entity)
        return entity
    
    def update(self, entity: T) -> T:
        """Update existing entity"""
        self.session.add(entity)
        self.session.commit()
        self.session.refresh(entity)
        return entity
    
    def delete(self, entity: T) -> None:
        """Delete entity"""
        self.session.delete(entity)
        self.session.commit()
    
    def count(self) -> int:
        """Count total entities"""
        statement = select(self.model)
        return len(list(self.session.exec(statement).all()))
