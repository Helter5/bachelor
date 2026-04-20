export interface ApiUserDto {
  id: string | number
  username: string
  first_name: string
  last_name: string
  email: string
  role: string
  avatar_url: string | null
  created_at?: string | null
}

export interface AppUser {
  id: string
  username: string
  first_name: string
  last_name: string
  email: string
  role: string
  avatar_url: string | null
  created_at: string
}

export function mapApiUserDto(dto: ApiUserDto, fallbackCreatedAt?: string): AppUser {
  return {
    id: String(dto.id),
    username: dto.username,
    first_name: dto.first_name,
    last_name: dto.last_name,
    email: dto.email,
    role: dto.role,
    avatar_url: dto.avatar_url,
    created_at: dto.created_at ?? fallbackCreatedAt ?? new Date().toISOString(),
  }
}
