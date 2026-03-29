import { api } from './client';
import type {
  ApiResponse,
  VehicleResponse,
  VehiclePublicResponse,
  CreateVehicleRequest,
  UpdateVehicleRequest,
} from '@/types/api';

export const vehiclesApi = {
  create: (data: CreateVehicleRequest) =>
    api.post<ApiResponse<VehicleResponse>>('/v1/vehicles', data),

  getById: (id: string) =>
    api.get<ApiResponse<VehicleResponse>>(`/v1/vehicles/${encodeURIComponent(id)}`),

  getPublic: (id: string) =>
    api.get<ApiResponse<VehiclePublicResponse>>(`/v1/vehicles/${encodeURIComponent(id)}/public`),

  getMine: () => api.get<ApiResponse<VehicleResponse[]>>('/v1/vehicles/me'),

  update: (id: string, data: UpdateVehicleRequest) =>
    api.put<ApiResponse<VehicleResponse>>(`/v1/vehicles/${encodeURIComponent(id)}`, data),

  remove: (id: string) =>
    api.delete<ApiResponse<null>>(`/v1/vehicles/${encodeURIComponent(id)}`),
};
