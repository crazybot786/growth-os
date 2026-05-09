import { z } from 'zod';

const buildSchema = z.object({
  campaign_id: z.string().uuid().optional(),
  variant_id: z.string().uuid().optional(),
  utm_source: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  extra: z.record(z.string(), z.string()).optional(),
});

export const trackingService = {
  /**
   * Gera um querystring rastreável (UTM + IDs internos).
   * Mantém atribuição “real” por hook/variante/campanha.
   */
  buildTrackingQuery(input: z.infer<typeof buildSchema>) {
    const data = buildSchema.parse(input);
    const params = new URLSearchParams();

    if (data.utm_source) params.set('utm_source', data.utm_source);
    if (data.utm_campaign) params.set('utm_campaign', data.utm_campaign);
    if (data.utm_content) params.set('utm_content', data.utm_content);

    if (data.campaign_id) params.set('campaign_id', data.campaign_id);
    if (data.variant_id) params.set('variant_id', data.variant_id);

    if (data.extra) {
      for (const [k, v] of Object.entries(data.extra)) {
        if (v) params.set(k, v);
      }
    }

    const qs = params.toString();
    return qs ? `?${qs}` : '';
  },
};

