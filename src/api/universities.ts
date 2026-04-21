import { api } from './client';
import type { ApiResponse, PageResponse, UniversityResponse, SearchUniversitiesParams } from '@/types/api';

export const universitiesApi = {
  list: (params?: Pick<SearchUniversitiesParams, 'city' | 'page' | 'size'>) =>
    api.get<ApiResponse<PageResponse<UniversityResponse>>>('/v1/universities', { params }),

  getById: (id: string) =>
    api.get<ApiResponse<UniversityResponse>>(`/v1/universities/${encodeURIComponent(id)}`),

  search: (params: SearchUniversitiesParams) =>
    api.get<ApiResponse<PageResponse<UniversityResponse>>>('/v1/universities/search', { params }),
};
