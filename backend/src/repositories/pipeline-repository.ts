import { inMemoryDb } from '../../packages/database/index.js';

export interface CrmPipelineItem {
  id: string;
  workspaceId: string;
  name: string;
  isDefault: boolean;
  stages: CrmPipelineStageItem[];
}

export interface CrmPipelineStageItem {
  id: string;
  pipelineId: string;
  name: string;
  color: string;
  orderIndex: number;
}

export class PipelineRepository {
  /**
   * Create custom industry pipeline
   */
  public static async createPipeline(data: {
    workspaceId: string;
    name: string;
    isDefault?: boolean;
    stages: Array<{ name: string; color?: string }>;
  }): Promise<CrmPipelineItem> {
    const pipelineId = `pipe-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const pipeline = {
      id: pipelineId,
      workspaceId: data.workspaceId,
      name: data.name,
      isDefault: data.isDefault || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryDb.crmPipelines.set(pipelineId, pipeline);

    const createdStages: CrmPipelineStageItem[] = [];
    data.stages.forEach((st, idx) => {
      const stageId = `stg-${Date.now()}-${idx}`;
      const stage: CrmPipelineStageItem = {
        id: stageId,
        pipelineId,
        name: st.name,
        color: st.color || '#3B82F6',
        orderIndex: idx,
      };
      inMemoryDb.crmPipelineStages.set(stageId, stage);
      createdStages.push(stage);
    });

    return {
      ...pipeline,
      stages: createdStages,
    };
  }

  /**
   * Get all pipelines for workspace
   */
  public static async getWorkspacePipelines(workspaceId: string): Promise<CrmPipelineItem[]> {
    const list: CrmPipelineItem[] = [];
    for (const pipe of inMemoryDb.crmPipelines.values()) {
      if (pipe.workspaceId === workspaceId) {
        const stages: CrmPipelineStageItem[] = [];
        for (const stg of inMemoryDb.crmPipelineStages.values()) {
          if (stg.pipelineId === pipe.id) stages.push(stg);
        }
        list.push({
          ...pipe,
          stages: stages.sort((a, b) => a.orderIndex - b.orderIndex),
        });
      }
    }
    return list;
  }
}
