/**
 * OneAgenda Agentic Planner
 *
 * Pianificatore proattivo con AI usando SDK 2.5 (OneAgent SDK).
 * Rifattorizzato per usare SDK 2.5 direttamente seguendo principi KISS, SOLID, DRY.
 */

// Import from lib package (workspace dependency)
import { createAgent, type AgentConfig } from '@onecoach/lib-ai-agents';
import { createModel } from '@onecoach/lib-ai';
import { getModelByTier } from '@onecoach/lib-ai';
import type { ModelTier } from '@onecoach/lib-ai';
import { Output, ToolLoopAgent, stepCountIs, tool } from 'ai';

import { z } from 'zod';
import {
  PlanSchema,
  PlannerInputSchema,
  PlannerOptionsSchema,
  WhatIfScenarioSchema,
  type Plan,
  type PlannerInput,
  type PlannerOptions,
  type WhatIfScenario,
} from '../domain/types';
import { planDay } from '../planner/plan-day';
import { runWhatIfScenario } from '../planner/what-if';

// Schema per i parametri dei tool
const GeneratePlanToolParamsSchema = z.object({
  input: PlannerInputSchema,
  options: PlannerOptionsSchema.partial().optional(),
});

const SimulateScenarioToolParamsSchema = z.object({
  input: PlannerInputSchema,
  baseline: PlanSchema.optional(),
  scenario: WhatIfScenarioSchema,
});

// Type inference per i parametri dei tool
type GeneratePlanToolParams = z.infer<typeof GeneratePlanToolParamsSchema>;
type GeneratePlanToolResult = Plan;
type SimulateScenarioToolParams = z.infer<typeof SimulateScenarioToolParamsSchema>;
type SimulateScenarioToolResult = ReturnType<typeof runWhatIfScenario>;

// Tools per SDK 2.5
const generatePlanTool = tool<GeneratePlanToolParams, GeneratePlanToolResult>({
  description:
    'Genera un piano giornaliero proattivo applicando euristiche OneAgenda e proteggendo i blocchi di focus.',
  inputSchema: GeneratePlanToolParamsSchema,
  execute: async (params: GeneratePlanToolParams) => {
    return planDay(params.input, params.options);
  },
});

const simulateScenarioTool = tool<SimulateScenarioToolParams, SimulateScenarioToolResult>({
  description:
    "Simula scenari what-if per valutare impatti su priorità, scadenze o nuovi task all'interno del piano.",
  inputSchema: SimulateScenarioToolParamsSchema,
  execute: async (params: SimulateScenarioToolParams) => {
    const baselinePlan = params.baseline ?? planDay(params.input);
    return runWhatIfScenario(params.input, baselinePlan, params.scenario);
  },
});

const ONE_AGENDA_SYSTEM_PROMPT = `Sei un assistente AI specializzato nella pianificazione proattiva della giornata.

Il tuo compito è aiutare a generare piani giornalieri ottimizzati che:
- Rispettano vincoli temporali e preferenze
- Proteggono blocchi di focus per lavoro profondo
- Massimizzano la produttività attraverso time-blocking intelligente
- Gestiscono scenari what-if per valutare impatti di cambiamenti

Usa gli strumenti disponibili per generare piani e simulare scenari.`;

export interface OneAgendaAgenticPlannerOptions {
  tier?: ModelTier;
  enableLearning?: boolean;
}

/**
 * OneAgenda Agentic Planner con SDK 2.5
 *
 * Usa SDK 2.5 per reasoning avanzato e memory dei pattern di pianificazione.
 */
export class OneAgendaAgenticPlanner {
  private readonly tier: ModelTier;
  private readonly enableLearning: boolean;

  constructor(options: OneAgendaAgenticPlannerOptions = {}) {
    this.tier = options.tier ?? 'balanced';
    this.enableLearning = options.enableLearning ?? true;
  }

  /**
   * Genera un piano giornaliero usando SDK 2.5 per reasoning avanzato
   */
  async generatePlan(rawInput: PlannerInput, options?: Partial<PlannerOptions>): Promise<Plan> {
    const input = PlannerInputSchema.parse(rawInput);
    const validatedOptions = options ? PlannerOptionsSchema.partial().parse(options) : undefined;

    // Ottieni configurazione modello
    const modelConfig = await getModelByTier(this.tier);
    const apiKey = process.env.OPENROUTER_API_KEY || '';
    const model = createModel(modelConfig, apiKey);

    // SDK 2.5 Agent con memory e learning per ricordare pattern di pianificazione
    const agentConfig: AgentConfig = {
      model,
      memory: {
        short: true,
        long: this.enableLearning, // Long-term memory per ricordare pattern di pianificazione
        working: true,
      },
      learning: this.enableLearning, // Learning per migliorare i piani nel tempo
    };

    const sdkAgent = createAgent(agentConfig);

    // Analisi e reasoning con SDK 2.5 - sfrutta memory e learning automaticamente
    const prompt = `Genera un piano giornaliero proattivo per la data ${input.date}.
    
Input:
${JSON.stringify(input, null, 2)}

${validatedOptions ? `Opzioni: ${JSON.stringify(validatedOptions, null, 2)}` : ''}

Usa lo strumento generatePlan per creare il piano ottimizzato.`;

    const analysis = await sdkAgent.execute(prompt, ONE_AGENDA_SYSTEM_PROMPT);

    // Migliora il prompt usando insights e recommendations da SDK 2.5
    const enhancedPrompt = analysis.insights?.recommendations?.length
      ? `${prompt}\n\nNote: ${analysis.insights.recommendations.join(', ')}`
      : prompt;

    // Generazione strutturata con ToolLoopAgent - SDK 2.5 ha già fatto reasoning
    const agent = new ToolLoopAgent({
      model,
      tools: { generatePlan: generatePlanTool },
      instructions: ONE_AGENDA_SYSTEM_PROMPT,
      output: Output.object({
        schema: PlanSchema,
      }),
      stopWhen: stepCountIs(10),
    });

    const result = await agent.generate({
      prompt: enhancedPrompt,
    });

    return PlanSchema.parse(result.output);
  }

  /**
   * Simula uno scenario what-if usando SDK 2.5 per analisi avanzata
   */
  async simulateScenario(
    rawInput: PlannerInput,
    baselinePlan: Plan,
    scenario: WhatIfScenario
  ): Promise<ReturnType<typeof runWhatIfScenario>> {
    const input = PlannerInputSchema.parse(rawInput);
    const validatedBaseline = PlanSchema.parse(baselinePlan);
    const validatedScenario = WhatIfScenarioSchema.parse(scenario);

    // Ottieni configurazione modello
    const modelConfig = await getModelByTier(this.tier);
    const apiKey = process.env.OPENROUTER_API_KEY || '';
    const model = createModel(modelConfig, apiKey);

    // SDK 2.5 Agent con memory e learning per analisi scenari
    const agentConfig: AgentConfig = {
      model,
      memory: {
        short: true,
        long: this.enableLearning,
        working: true,
      },
      learning: this.enableLearning,
    };

    const sdkAgent = createAgent(agentConfig);

    // Analisi e reasoning con SDK 2.5
    const prompt = `Analizza uno scenario what-if per la data ${input.date}.

Piano baseline:
${JSON.stringify(validatedBaseline, null, 2)}

Scenario:
${JSON.stringify(validatedScenario, null, 2)}

Usa lo strumento simulateScenario per valutare l'impatto dello scenario.`;

    const analysis = await sdkAgent.execute(prompt, ONE_AGENDA_SYSTEM_PROMPT);

    // Migliora il prompt usando insights da SDK 2.5
    const enhancedPrompt = analysis.insights?.recommendations?.length
      ? `${prompt}\n\nNote: ${analysis.insights.recommendations.join(', ')}`
      : prompt;

    // Generazione strutturata con ToolLoopAgent
    const agent = new ToolLoopAgent({
      model,
      tools: { simulateScenario: simulateScenarioTool },
      instructions: ONE_AGENDA_SYSTEM_PROMPT,
      output: Output.object({
        schema: z.object({
          impact: z.string(),
          newPlan: PlanSchema.optional(),
          affectedBlocks: z.array(z.string()),
          recommendations: z.array(z.string()),
        }),
      }),
      stopWhen: stepCountIs(10),
    });

    // Analisi con SDK 2.5 completata - esegui la simulazione reale
    await agent.generate({
      prompt: enhancedPrompt,
    });

    return runWhatIfScenario(input, validatedBaseline, validatedScenario);
  }
}
