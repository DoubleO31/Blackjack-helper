import { z } from 'zod';
import { insertRulesetSchema, insertSessionSchema, insertHandSchema, rulesets, sessions, hands } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  rulesets: {
    list: {
      method: 'GET' as const,
      path: '/api/rulesets',
      responses: {
        200: z.array(z.custom<typeof rulesets.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/rulesets',
      input: insertRulesetSchema,
      responses: {
        201: z.custom<typeof rulesets.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/rulesets/:id',
      responses: {
        200: z.custom<typeof rulesets.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    }
  },
  sessions: {
    list: {
      method: 'GET' as const,
      path: '/api/sessions',
      responses: {
        200: z.array(z.custom<typeof sessions.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/sessions',
      input: insertSessionSchema,
      responses: {
        201: z.custom<typeof sessions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/sessions/:id',
      responses: {
        200: z.custom<typeof sessions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
        method: 'PUT' as const,
        path: '/api/sessions/:id',
        input: insertSessionSchema.partial().extend({ endTime: z.string().optional(), currentBankroll: z.number().optional() }),
        responses: {
            200: z.custom<typeof sessions.$inferSelect>(),
            404: errorSchemas.notFound,
        }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/sessions/:id',
      responses: {
        204: z.undefined(),
        404: errorSchemas.notFound,
      },
    },
  },
  hands: {
    list: {
      method: 'GET' as const,
      path: '/api/sessions/:sessionId/hands',
      responses: {
        200: z.array(z.custom<typeof hands.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/hands',
      input: insertHandSchema,
      responses: {
        201: z.custom<typeof hands.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  strategy: {
    calculate: {
      method: 'POST' as const,
      path: '/api/strategy/calculate',
      input: z.object({
        rulesetId: z.number(),
        dealerUpCard: z.string(),
        playerCards: z.array(z.string()),
      }),
      responses: {
        200: z.object({
          recommendation: z.enum(["HIT", "STAND", "DOUBLE", "SPLIT", "SURRENDER"]),
          reasoning: z.string().optional(),
        }),
        400: errorSchemas.validation,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
