/* Type-only stand-in for @msg91comm/react-native-sendotp.
 *
 * The real package ships raw, uncompiled .tsx as its main entry with no
 * separate .d.ts -- so `tsc` walks straight into its source and hits its own
 * pre-existing type errors (implicit anys, a wrong argument count) that have
 * nothing to do with this app. tsconfig.json redirects the type resolution
 * for this package to this file via `paths`; Metro is unaffected and still
 * bundles the real package at runtime, since it does not read tsconfig paths.
 *
 * Kept intentionally narrow -- just the shape src/services/msg91Otp.ts
 * actually uses, taken from the package's README and source at version 3.1.0.
 */

declare module '@msg91comm/react-native-sendotp' {
  import { Component } from 'react';

  export type ExposeMethodResponse = {
    message: string;
    type: 'success' | 'error';
    code?: string;
  };

  export interface ExposeOTPVerificationRefProps {
    sendOtp: (identifier: string) => Promise<ExposeMethodResponse>;
    retryOtp: (retryOn?: 'SMS' | 'VOICE' | 'EMAIL' | 'WHATSAPP') => Promise<ExposeMethodResponse>;
    verifyOtp: (otp: number) => Promise<ExposeMethodResponse>;
  }

  export interface ExposeOTPVerificationProps {
    authToken: string;
    widgetId: string;
    getWidgetData?: (data: unknown) => void;
  }

  export type ExposeOTPVerification = ExposeOTPVerificationRefProps;
  export const ExposeOTPVerification: React.ForwardRefExoticComponent<
    ExposeOTPVerificationProps & React.RefAttributes<ExposeOTPVerificationRefProps>
  >;

  export interface OTPVerificationProps {
    onVisible: boolean;
    authToken: string;
    widgetId: string;
    onCompletion: (data: ExposeMethodResponse) => void;
    identifier?: string;
    extraProps?: Record<string, string>;
  }

  export const OTPVerification: Component<OTPVerificationProps>;
}
