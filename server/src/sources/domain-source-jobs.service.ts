import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainJobStatus, DomainSourceJob, Prisma } from '@prisma/client';
import { LeadsFactoryService } from '../leads-factory/leads-factory.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DomainSourceJobsService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(DomainSourceJobsService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: LeadsFactoryService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap() {
    const interval = this.config.get<number>('DOMAIN_JOB_POLL_MS') ?? 60_000;
    this.timer = setInterval(() => void this.runOnce(), interval);
    this.timer.unref();
    void this.runOnce();
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }

  enqueue(cabinetId: string) {
    return this.prisma.domainSourceJob.create({
      data: { cabinetId, scheduledAt: new Date(Date.now() + 5 * 60_000) },
    });
  }

  async runOnce() {
    if (this.running) return;
    this.running = true;
    try {
      await this.recoverStaleJobs();
      for (let processed = 0; processed < 20; processed += 1) {
        const job = await this.claimNext();
        if (!job) break;
        await this.execute(job);
      }
    } finally {
      this.running = false;
    }
  }

  async processDomainSources(cabinetId: string) {
    const cabinet = await this.prisma.cabinet.findUniqueOrThrow({ where: { id: cabinetId } });
    if (!cabinet.providerProjectId) throw new Error('У кабинета не указан providerProjectId');

    const sourceIds: number[] = [];
    for (let page = 1; ; page += 1) {
      const result = await this.provider.getSources(cabinet.providerProjectId, page, 'domain');
      sourceIds.push(...result.items.map((source) => source.id));
      if (page * 5000 >= result.total || result.items.length === 0) break;
    }
    if (sourceIds.length) await this.provider.updateSourceSettings(sourceIds);

    const tagIds: number[] = [];
    const startDate = '2026-06-01';
    const endDate = new Date().toISOString().slice(0, 10);
    for (let page = 1; ; page += 1) {
      const result = await this.provider.getTags(cabinet.providerProjectId, { page, startDate, endDate, sourceType: 'domain' });
      tagIds.push(...result.items.map((tag) => tag.id));
      if (page * 5000 >= result.total || result.items.length === 0) break;
    }
    if (tagIds.length) {
      await this.provider.updateTags(tagIds, false);
      await this.prisma.sourceTag.updateMany({
        where: { cabinetId, providerTagId: { in: tagIds } }, data: { normWork: false, limit: 0 },
      });
    }
    return { sourcesUpdated: sourceIds.length, tagsDisabled: tagIds.length };
  }

  private async claimNext(): Promise<DomainSourceJob | null> {
    const jobs = await this.prisma.$queryRaw<DomainSourceJob[]>(Prisma.sql`
      UPDATE "DomainSourceJob"
      SET "status" = 'RUNNING', "attempts" = "attempts" + 1,
          "startedAt" = NOW(), "updatedAt" = NOW()
      WHERE "id" = (
        SELECT "id" FROM "DomainSourceJob"
        WHERE "status" = 'PENDING' AND "scheduledAt" <= NOW()
        ORDER BY "scheduledAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING *
    `);
    return jobs[0] ?? null;
  }

  private recoverStaleJobs() {
    return this.prisma.domainSourceJob.updateMany({
      where: { status: DomainJobStatus.RUNNING, startedAt: { lt: new Date(Date.now() - 10 * 60_000) } },
      data: { status: DomainJobStatus.PENDING, scheduledAt: new Date(), startedAt: null },
    });
  }

  private async execute(job: DomainSourceJob) {
    try {
      await this.processDomainSources(job.cabinetId);
      await this.prisma.domainSourceJob.update({
        where: { id: job.id },
        data: { status: DomainJobStatus.COMPLETED, finishedAt: new Date(), lastError: null },
      });
    } catch (error) {
      const finalFailure = job.attempts >= 3;
      const message = error instanceof Error ? error.message.slice(0, 2000) : 'Unknown error';
      await this.prisma.domainSourceJob.update({
        where: { id: job.id },
        data: {
          status: finalFailure ? DomainJobStatus.FAILED : DomainJobStatus.PENDING,
          scheduledAt: finalFailure ? job.scheduledAt : new Date(Date.now() + 2 ** job.attempts * 60_000),
          finishedAt: finalFailure ? new Date() : null,
          lastError: message,
        },
      });
      this.logger.error(`Domain source job ${job.id} failed: ${message}`);
    }
  }
}
