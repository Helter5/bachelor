"""Protected Admin API - user management (requires admin role)"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import Optional

from ....database import get_session
from ....domain.entities.user import User
from ....domain.schemas.responses import UserOut
from ....core.dependencies import require_admin

router = APIRouter(prefix="/admin/users")


@router.get("", response_model=list[UserOut])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    List all users (admin only)
    
    Query parameters:
    - **skip**: Pagination offset
    - **limit**: Max records
    - **role**: Filter by role (admin/user)
    - **is_active**: Filter by active status
    
    Requires: Admin role + Bearer token
    """
    statement = select(User)
    
    if role:
        statement = statement.where(User.role == role)
    if is_active is not None:
        statement = statement.where(User.is_active == is_active)
    
    statement = statement.offset(skip).limit(limit)
    users = session.exec(statement).all()
    
    return [UserOut.model_validate(u) for u in users]


@router.get("/{user_id}", response_model=UserOut)
async def get_user(
    user_id: int,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Get specific user by ID (admin only)
    
    Requires: Admin role + Bearer token
    """
    user = session.get(User, user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )
    
    return UserOut.model_validate(user)


@router.patch("/{user_id}/role")
async def update_user_role(
    user_id: int,
    role: str,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Update user role (admin only)
    
    Body:
    - **role**: New role (admin/user)
    
    Requires: Admin role + Bearer token
    """
    if role not in ["admin", "user"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'admin' or 'user'"
        )
    
    user = session.get(User, user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )
    
    user.role = role
    session.add(user)
    session.commit()
    session.refresh(user)
    
    return UserOut.model_validate(user)


@router.patch("/{user_id}/status")
async def toggle_user_status(
    user_id: int,
    is_active: bool,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Activate/deactivate user (admin only)
    
    Body:
    - **is_active**: Active status (true/false)
    
    Requires: Admin role + Bearer token
    """
    user = session.get(User, user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )
    
    user.is_active = is_active
    session.add(user)
    session.commit()
    session.refresh(user)
    
    return UserOut.model_validate(user)
