export interface LoginRequest {
  username: string;
  password: string;
  captchaToken?: string;
  totpCode?: string;
  totpSecret?: string;
}

export interface Email {
  id: string;
  subject: string;
  sender: string;
  timestamp: number;
  content: string;
}

export interface LoginResponse {
  session_id: string;
  error?: {
    type: string;
    message: string;
    captcha_url?: string;
  };
}

export interface EmailsResponse {
  mails: Email[];
}
