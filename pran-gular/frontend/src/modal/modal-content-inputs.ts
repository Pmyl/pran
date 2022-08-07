import { InterceptResult } from './modal';

export type ModalContentInputs<TResult> = {
  close?: (returnValue?: TResult) => void;
  interceptDismiss?: (interceptPromise: () => Promise<InterceptResult>) => void;
  dismiss?: () => void;
};