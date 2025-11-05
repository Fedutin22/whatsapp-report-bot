// WhatsApp Cloud API Types

export interface WhatsAppMessage {
  messaging_product: 'whatsapp';
  recipient_type?: 'individual';
  to: string;
  type: 'text' | 'interactive';
}

export interface TextMessage extends WhatsAppMessage {
  type: 'text';
  text: {
    body: string;
  };
}

export interface InteractiveListMessage extends WhatsAppMessage {
  type: 'interactive';
  interactive: {
    type: 'list';
    body: {
      text: string;
    };
    action: {
      button: string;
      sections: Array<{
        title: string;
        rows: Array<{
          id: string;
          title: string;
          description?: string;
        }>;
      }>;
    };
  };
}

export interface InteractiveButtonMessage extends WhatsAppMessage {
  type: 'interactive';
  interactive: {
    type: 'button';
    body: {
      text: string;
    };
    action: {
      buttons: Array<{
        type: 'reply';
        reply: {
          id: string;
          title: string;
        };
      }>;
    };
  };
}

export interface WhatsAppApiResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

export interface WhatsAppError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

// Webhook payload types
export interface WebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts?: Array<{
        profile: {
          name: string;
        };
        wa_id: string;
      }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        type: 'text' | 'interactive';
        text?: {
          body: string;
        };
        interactive?: {
          type: 'button_reply' | 'list_reply';
          button_reply?: {
            id: string;
            title: string;
          };
          list_reply?: {
            id: string;
            title: string;
            description?: string;
          };
        };
      }>;
      statuses?: Array<{
        id: string;
        status: 'sent' | 'delivered' | 'read' | 'failed';
        timestamp: string;
        recipient_id: string;
      }>;
    };
    field: string;
  }>;
}

export interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

// Blood pressure value type
export type BloodPressureValue = '<110' | '115' | '120' | '125' | '130' | '135' | '140' | '145' | '150' | '>160';

export const BLOOD_PRESSURE_BUTTON_MAP: Record<string, BloodPressureValue> = {
  bp_lt110: '<110',
  bp_115: '115',
  bp_120: '120',
  bp_125: '125',
  bp_130: '130',
  bp_135: '135',
  bp_140: '140',
  bp_145: '145',
  bp_150: '150',
  bp_gt160: '>160',
};
