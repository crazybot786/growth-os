import { supabaseAdmin } from '../../shared/db/supabaseAdmin.js';
import { newId } from '../../shared/utils/ids.js';
import { eventsService } from '../events/events.service.js';

export async function createWorkspace(params: {
  userId: string;
  name: string;
  correlationId: string;
}): Promise<{ workspaceId: string }> {
  const workspaceId = newId();

  const { error: wsErr } = await supabaseAdmin.from('workspaces').insert({
    id: workspaceId,
    name: params.name,
  });
  if (wsErr) throw wsErr;

  const { error: memErr } = await supabaseAdmin.from('workspace_members').insert({
    workspace_id: workspaceId,
    user_id: params.userId,
    role: 'owner',
  });
  if (memErr) throw memErr;

  await eventsService.emitEvent({
    workspaceId,
    correlationId: params.correlationId,
    idempotencyKey: `workspace.created:${workspaceId}`,
    actor: { type: 'user', id: params.userId },
    entity: { type: 'workspace', id: workspaceId },
    eventType: 'workspace.created',
    payload: { name: params.name },
  });

  return { workspaceId };
}

export async function listUserWorkspaces(params: { userId: string }): Promise<
  Array<{ workspace_id: string; role: string | null; name: string }>
> {
  const { data, error } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id, role, workspaces(name)')
    .eq('user_id', params.userId);

  if (error) throw error;

  return (
    data?.map((row: any) => ({
      workspace_id: row.workspace_id,
      role: row.role ?? null,
      name: row.workspaces?.name ?? 'Workspace',
    })) ?? []
  );
}

