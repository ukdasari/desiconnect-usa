// Client-safe copy of the action state shape (lib/action-state.ts imports server-only code).
export interface ActionState {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  values?: Record<string, string>;
}

export const initialState: ActionState = {};
