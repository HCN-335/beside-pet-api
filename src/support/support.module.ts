/**
 * support.module.ts — wiring for the support bounded context.
 * Binds ports (abstractions) to adapters (implementations). To swap persistence/LLM/knowledge, change a single line here.
 */
import { Module } from '@nestjs/common';
import { IdentityModule } from '@/identity/identity.module';
import { MindReportAgent } from './application/mind-report.agent';
import { PlannerAgent } from './application/planner.agent';
import { SendMessageUseCase } from './application/send-message.usecase';
import { StartSessionUseCase } from './application/start-session.usecase';
import { SummarizerAgent } from './application/summarizer.agent';
import { SupervisorAgent } from './application/supervisor.agent';
import { SupportOrchestrator } from './application/support.orchestrator';
import { SupportQuery } from './application/support.query';
import { KNOWLEDGE_PORT, LLM_PORT } from './domain/port/tokens';
import { SafetyCheckService } from './domain/service/safety-check.service';
import { TaskProgressionService } from './domain/service/task-progression.service';
import { RagKnowledgeAdapter } from './infrastructure/knowledge/rag.adapter';
import { ClaudeAdapter } from './infrastructure/llm/claude.adapter';
import { SupportController } from './interface/support.controller';

@Module({
  imports: [IdentityModule],
  controllers: [SupportController],
  providers: [
    // domain services
    SafetyCheckService,
    TaskProgressionService,
    // agents (deterministic mock now; LLM-backed later)
    PlannerAgent,
    SupervisorAgent,
    SummarizerAgent,
    MindReportAgent,
    // application
    SupportOrchestrator,
    StartSessionUseCase,
    SendMessageUseCase,
    SupportQuery,
    // port → adapter bindings (SESSION_REPOSITORY comes from the global PersistenceModule)
    { provide: LLM_PORT, useClass: ClaudeAdapter },
    { provide: KNOWLEDGE_PORT, useClass: RagKnowledgeAdapter },
  ],
  exports: [LLM_PORT],
})
export class SupportModule {}
