import { useCallback, useEffect, useReducer } from 'react';
import { usersApi } from '@/api/users';
import { extractApiError } from '@/lib/utils';
import type {
  EmergencyContactResponse,
  CreateEmergencyContactRequest,
  UpdateEmergencyContactRequest,
} from '@/types/api';

interface EmergencyContactsState {
  contacts: EmergencyContactResponse[];
  loading: boolean;
  submitting: boolean;
  deletingId: string | null;
  error: string | null;
}

type Action =
  | { type: 'LOAD_START'; }
  | { type: 'LOAD_SUCCESS'; payload: EmergencyContactResponse[]; }
  | { type: 'LOAD_ERROR'; payload: string; }
  | { type: 'SUBMIT_START'; }
  | { type: 'SUBMIT_DONE'; }
  | { type: 'UPSERT'; payload: EmergencyContactResponse; }
  | { type: 'DELETE_START'; payload: string; }
  | { type: 'DELETE_DONE'; payload: string; }
  | { type: 'ACTION_ERROR'; payload: string; }
  | { type: 'CLEAR_ERROR'; };

const initialState: EmergencyContactsState = {
  contacts: [],
  loading: true,
  submitting: false,
  deletingId: null,
  error: null,
};

function reducer(state: EmergencyContactsState, action: Action): EmergencyContactsState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true, error: null };
    case 'LOAD_SUCCESS':
      return { ...state, loading: false, contacts: action.payload, error: null };
    case 'LOAD_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'SUBMIT_START':
      return { ...state, submitting: true, error: null };
    case 'SUBMIT_DONE':
      return { ...state, submitting: false };
    case 'UPSERT': {
      const exists = state.contacts.some((c) => c.id === action.payload.id);
      const contacts = exists
        ? state.contacts.map((c) => (c.id === action.payload.id ? action.payload : c))
        : [action.payload, ...state.contacts];
      return { ...state, contacts, submitting: false, error: null };
    }
    case 'DELETE_START':
      return { ...state, deletingId: action.payload, error: null };
    case 'DELETE_DONE':
      return {
        ...state,
        deletingId: null,
        contacts: state.contacts.filter((c) => c.id !== action.payload),
        error: null,
      };
    case 'ACTION_ERROR':
      return { ...state, submitting: false, deletingId: null, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

export function useEmergencyContacts() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadContacts = useCallback(async () => {
    dispatch({ type: 'LOAD_START' });
    try {
      const { data } = await usersApi.getEmergencyContacts();
      dispatch({ type: 'LOAD_SUCCESS', payload: data.data ?? [] });
    } catch (err) {
      dispatch({
        type: 'LOAD_ERROR',
        payload: extractApiError(err, 'No se pudieron cargar los contactos de emergencia.'),
      });
    }
  }, []);

  const createContact = useCallback(async (payload: CreateEmergencyContactRequest) => {
    dispatch({ type: 'SUBMIT_START' });
    try {
      const { data } = await usersApi.createEmergencyContact(payload);
      if (!data.data) throw new Error('No se pudo crear el contacto.');
      dispatch({ type: 'UPSERT', payload: data.data });
      return true;
    } catch (err) {
      dispatch({
        type: 'ACTION_ERROR',
        payload: extractApiError(err, 'No se pudo crear el contacto de emergencia.'),
      });
      return false;
    } finally {
      dispatch({ type: 'SUBMIT_DONE' });
    }
  }, []);

  const updateContact = useCallback(async (id: string, payload: UpdateEmergencyContactRequest) => {
    dispatch({ type: 'SUBMIT_START' });
    try {
      const { data } = await usersApi.updateEmergencyContact(id, payload);
      if (!data.data) throw new Error('No se pudo actualizar el contacto.');
      dispatch({ type: 'UPSERT', payload: data.data });
      return true;
    } catch (err) {
      dispatch({
        type: 'ACTION_ERROR',
        payload: extractApiError(err, 'No se pudo actualizar el contacto de emergencia.'),
      });
      return false;
    } finally {
      dispatch({ type: 'SUBMIT_DONE' });
    }
  }, []);

  const deleteContact = useCallback(async (id: string) => {
    dispatch({ type: 'DELETE_START', payload: id });
    try {
      await usersApi.deleteEmergencyContact(id);
      dispatch({ type: 'DELETE_DONE', payload: id });
      return true;
    } catch (err) {
      dispatch({
        type: 'ACTION_ERROR',
        payload: extractApiError(err, 'No se pudo eliminar el contacto de emergencia.'),
      });
      return false;
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  return {
    ...state,
    loadContacts,
    createContact,
    updateContact,
    deleteContact,
    clearError,
  };
}
