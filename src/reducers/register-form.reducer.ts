export type RegisterFormField =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'password'
  | 'confirmPassword';

export interface RegisterFormState {
  fields: Record<RegisterFormField, string>;
  errors: Partial<Record<RegisterFormField, string>>;
}

type RegisterFormAction =
  | { type: 'SET_FIELD'; field: RegisterFormField; value: string }
  | { type: 'SET_ERRORS'; errors: Partial<Record<RegisterFormField, string>> };

export const initialRegisterFormState: RegisterFormState = {
  fields: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  },
  errors: {},
};

export function registerFormReducer(
  state: RegisterFormState,
  action: RegisterFormAction,
): RegisterFormState {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        fields: { ...state.fields, [action.field]: action.value },
        errors: { ...state.errors, [action.field]: undefined },
      };
    case 'SET_ERRORS':
      return { ...state, errors: action.errors };
  }
}
