import { useState, useCallback, useRef } from 'react';
import { studentVerificationsApi } from '@/api/student-verifications';
import { extractApiError } from '@/lib/utils';
import type {
  StudentVerificationResponse,
  CreateStudentVerificationRequest,
} from '@/types/api';

export interface UseStudentVerificationHook {
  verifications: StudentVerificationResponse[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  submitError: string | null;
  fetch: () => Promise<void>;
  submit: (req: CreateStudentVerificationRequest) => Promise<void>;
  getForUniversity: (universityId: string) => StudentVerificationResponse | undefined;
  hasValidVerification: (universityId: string) => boolean;
}

export function useStudentVerification(): UseStudentVerificationHook {
  const [verifications, setVerifications] = useState<StudentVerificationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const initialized = useRef(false);
  const fetchingRef = useRef(false);

  const fetch = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const res = await studentVerificationsApi.getMine();
      setVerifications(res.data.data ?? []);
      initialized.current = true;
    } catch (err) {
      setError(extractApiError(err, 'No se pudieron cargar tus verificaciones estudiantiles'));
    } finally {
      fetchingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  const submit = useCallback(
    async (req: CreateStudentVerificationRequest) => {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        const res = await studentVerificationsApi.create(req);
        const created = res.data.data;
        if (created) {
          setVerifications((prev) => {
            // Replace existing entry for same university if any
            const filtered = prev.filter((v) => v.universityId !== created.universityId);
            return [created, ...filtered];
          });
        }
      } catch (err) {
        const msg = extractApiError(err, 'No se pudo enviar la verificación');
        setSubmitError(msg);
        throw new Error(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const getForUniversity = useCallback(
    (universityId: string) => verifications.find((v) => v.universityId === universityId),
    [verifications],
  );

  const hasValidVerification = useCallback(
    (universityId: string) => {
      const v = verifications.find((v) => v.universityId === universityId);
      return v?.status === 'APPROVED';
    },
    [verifications],
  );

  return {
    verifications,
    isLoading,
    isSubmitting,
    error,
    submitError,
    fetch,
    submit,
    getForUniversity,
    hasValidVerification,
  };
}
