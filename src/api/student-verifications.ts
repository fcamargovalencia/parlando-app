import { api } from './client';
import type {
  ApiResponse,
  CreateStudentVerificationRequest,
  StudentVerificationResponse,
} from '@/types/api';

export const studentVerificationsApi = {
  create: (data: CreateStudentVerificationRequest) =>
    api.post<ApiResponse<StudentVerificationResponse>>('/v1/student-verifications', data),

  getMine: () =>
    api.get<ApiResponse<StudentVerificationResponse[]>>('/v1/student-verifications/my'),
};
