import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Prisma, ScheduledRun, ScheduledRunStatus, ScheduledTask,
} from '@prisma/client';
import { AnswerSyncService } from '../crm/answer-sync.service';
import { LeadsFactoryService } from '../leads-factory/leads-factory.service';
import { PrismaService } from '../prisma/prisma.service';
import { SourcesService } from '../sources/sources.service';
import { hasAvailableBalance } from '../finance/balance-availability';
import { providerScriptToText } from '../leads-factory/script-text';
import { ProviderException } from '../leads-factory/provider.exception';
import { isActiveNextDay, isActiveToday } from './schedule-day';

const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000;
// docs-agent.md 2.3 говорит "18:00" для TAG_AUTOMATION — продуктовое решение
// перенесло его на 21:24 МСК, независимо от текста ТЗ.
const SLOTS: Array<{ hour: number; minute?: number; task: ScheduledTask }> = [
  { hour: 9, task: ScheduledTask.SOURCES_SYNC },
  { hour: 21, minute: 24, task: ScheduledTask.TAG_AUTOMATION },
  { hour: 20, task: ScheduledTask.APPLY_SCHEDULE },
  { hour: 20, task: ScheduledTask.SCRIPT_SYNC },
];

@Injectable()
export class SchedulerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(SchedulerService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly answers: AnswerSyncService,
    private readonly sources: SourcesService,
    private readonly provider: LeadsFactoryService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap() {
    const configured = Number(this.config.get('SCHEDULER_POLL_MS') ?? 60_000);
    const interval = Number.isFinite(configured) && configured >= 1_000 ? configured : 60_000;
    this.timer = setInterval(() => void this.runOnce(), interval);
    this.timer.unref();
    void this.runOnce();
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }

  async runOnce(now = new Date()) {
    if (this.running) return;
    this.running = true;
    try {
      await this.recoverStaleRuns(now);
      await this.enqueueDueRuns(now);
      for (let processed = 0; processed < 50; processed += 1) {
        const run = await this.claimNext();
        if (!run) break;
        await this.execute(run);
      }
    } finally {
      this.running = false;
    }
  }

  async enqueueDueRuns(now: Date) {
    const cabinets = await this.prisma.cabinet.findMany({
      where: { providerProjectId: { not: null } }, select: { id: true, isActive: true },
    });
    if (!cabinets.length) return 0;
    const slots = this.dueSlots(now);
    if (!slots.length) return 0;
    const result = await this.prisma.scheduledRun.createMany({
      data: cabinets.flatMap((cabinet) => slots
        .filter((slot) => cabinet.isActive || slot.task === ScheduledTask.SCRIPT_SYNC)
        .map((slot) => ({
        cabinetId: cabinet.id, task: slot.task, scheduledFor: slot.at, nextAttemptAt: slot.at,
      }))),
      skipDuplicates: true,
    });
    return result.count;
  }

  listRuns(cabinetId: string) {
    return this.prisma.scheduledRun.findMany({
      where: { cabinetId }, orderBy: { scheduledFor: 'desc' }, take: 100,
    });
  }

  private dueSlots(now: Date) {
    const localNow = new Date(now.getTime() + MOSCOW_OFFSET_MS);
    const dates = [0, -1].map((offset) => new Date(Date.UTC(
      localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate() + offset,
    )));
    const cutoff = now.getTime() - 24 * 60 * 60 * 1000;
    const daily = dates.flatMap((date) => SLOTS.map((slot) => ({
      task: slot.task,
      at: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), slot.hour - 3, slot.minute ?? 0)),
    }))).filter((slot) => slot.at <= now && slot.at.getTime() >= cutoff);
    const configured = Number(this.config.get('CONTACTS_POLL_MS') ?? 2 * 60_000);
    const interval = Number.isFinite(configured) && configured >= 60_000 ? configured : 2 * 60_000;
    const contactAt = new Date(Math.floor(now.getTime() / interval) * interval);
    return [...daily, { task: ScheduledTask.CONTACTS_SYNC, at: contactAt }];
  }

  private async claimNext(): Promise<ScheduledRun | null> {
    const runs = await this.prisma.$queryRaw<ScheduledRun[]>(Prisma.sql`
      UPDATE "ScheduledRun"
      SET "status" = 'RUNNING', "attempts" = "attempts" + 1,
          "startedAt" = NOW(), "updatedAt" = NOW()
      WHERE "id" = (
        SELECT "id" FROM "ScheduledRun"
        WHERE "status" = 'PENDING' AND "nextAttemptAt" <= NOW()
        ORDER BY "scheduledFor" ASC
        FOR UPDATE SKIP LOCKED LIMIT 1
      )
      RETURNING *
    `);
    return runs[0] ?? null;
  }

  private recoverStaleRuns(now: Date) {
    return this.prisma.scheduledRun.updateMany({
      where: { status: ScheduledRunStatus.RUNNING, startedAt: { lt: new Date(now.getTime() - 30 * 60_000) } },
      data: { status: ScheduledRunStatus.PENDING, nextAttemptAt: now, startedAt: null },
    });
  }

  private async execute(run: ScheduledRun) {
    try {
      const result = await this.dispatch(run);
      await this.prisma.scheduledRun.update({
        where: { id: run.id },
        data: {
          status: ScheduledRunStatus.COMPLETED, finishedAt: new Date(), lastError: null,
          result: result as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      const finalFailure = run.attempts >= 3;
      const message = this.errorMessage(error);
      await this.prisma.scheduledRun.update({
        where: { id: run.id },
        data: {
          status: finalFailure ? ScheduledRunStatus.FAILED : ScheduledRunStatus.PENDING,
          nextAttemptAt: finalFailure ? run.nextAttemptAt : new Date(Date.now() + 2 ** run.attempts * 60_000),
          finishedAt: finalFailure ? new Date() : null, lastError: message,
        },
      });
      this.logger.error(`Scheduled run ${run.id} (${run.task}) failed: ${message}`);
    }
  }

  private errorMessage(error: unknown) {
    if (!(error instanceof ProviderException)) {
      return error instanceof Error ? error.message.slice(0, 2000) : 'Unknown error';
    }
    let details = '';
    if (error.providerBody !== undefined) {
      try {
        details = JSON.stringify(error.providerBody, (key, value) =>
          /token|authorization|password|secret|cookie/i.test(key) ? '[REDACTED]' : value).slice(0, 1200);
      } catch { details = '[unserializable provider response]'; }
    }
    return (`[Leads Factory ${error.providerStatus}] ${error.message}${details ? `: ${details}` : ''}`).slice(0, 2000);
  }

  private async dispatch(run: ScheduledRun): Promise<unknown> {
    if (run.task === ScheduledTask.SOURCES_SYNC) return this.sources.sync(run.cabinetId, {});
    if (run.task === ScheduledTask.CONTACTS_SYNC) return this.answers.sync(run.cabinetId);
    if (run.task === ScheduledTask.TAG_AUTOMATION) return this.sources.automate(run.cabinetId);

    const cabinet = await this.prisma.cabinet.findUniqueOrThrow({ where: { id: run.cabinetId } });
    if (!cabinet.providerProjectId) throw new Error('У кабинета не указан providerProjectId');
    if (run.task === ScheduledTask.APPLY_SCHEDULE) {
      const active = cabinet.isActive && hasAvailableBalance(cabinet)
        && isActiveNextDay(cabinet.scheduleDays, run.scheduledFor);
      await this.provider.updateProjectSchedule(cabinet.providerProjectId, active, {
        uploadsEnabled: cabinet.uploadsEnabled, callsEnabled: cabinet.callsEnabled,
      });
      return { active, scheduleDays: cabinet.scheduleDays };
    }
    if (run.task === ScheduledTask.APPLY_SETTINGS) {
      const effectiveIsActive = cabinet.isActive && hasAvailableBalance(cabinet);
      await this.provider.updateProjectSettings(cabinet.providerProjectId, {
        isActive: effectiveIsActive, timezoneOffset: cabinet.timezoneOffset,
        uploadsEnabled: cabinet.uploadsEnabled, callsEnabled: cabinet.callsEnabled,
        activeToday: isActiveToday(cabinet.scheduleDays, run.scheduledFor),
      });
      return { effectiveIsActive };
    }
    if (run.task === ScheduledTask.SCRIPT_SYNC) {
      const script = await this.provider.getProjectScript(cabinet.providerProjectId);
      await this.prisma.cabinet.update({ where: { id: cabinet.id }, data: {
        operatorScript: providerScriptToText(script.script),
        operatorScriptName: script.name,
        operatorScriptLevel: script.script_lvl, scriptSyncedAt: new Date(),
      } });
      return { scriptLevel: script.script_lvl };
    }
    throw new Error(`Unsupported scheduled task: ${run.task}`);
  }
}
