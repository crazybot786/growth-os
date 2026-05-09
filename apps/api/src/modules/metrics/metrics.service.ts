import { supabaseAdmin } from '../../shared/db/supabaseAdmin.js';

const STATUSES = ['new', 'contacted', 'replied', 'qualified', 'scheduled', 'won', 'lost'] as const;

export const metricsService = {
  async dashboardSummary(params: { workspaceId: string; from?: string; to?: string }) {
    const base = supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }).eq('workspace_id', params.workspaceId);

    const applyRange = (q: any) => {
      if (params.from) q = q.gte('created_at', params.from);
      if (params.to) q = q.lte('created_at', params.to);
      return q;
    };

    const totalRes = await applyRange(base);
    if (totalRes.error) throw totalRes.error;

    const byStatus: Record<string, number> = {};
    for (const st of STATUSES) {
      const res = await applyRange(
        supabaseAdmin
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', params.workspaceId)
          .eq('status', st as any),
      );
      if (res.error) throw res.error;
      byStatus[st] = res.count ?? 0;
    }

    // MVP: reply_rate = replied+ / contacted+ (aproximação operacional)
    const contacted = byStatus['contacted'] ?? 0;
    const replied = byStatus['replied'] ?? 0;
    const replyRate = contacted > 0 ? replied / contacted : 0;

    return {
      leads_total: totalRes.count ?? 0,
      by_status: byStatus,
      reply_rate: replyRate,
    };
  },
};

