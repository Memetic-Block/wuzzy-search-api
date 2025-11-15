import { Injectable, Logger } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import * as crypto from 'crypto'

import { SearchMetricsEvent } from '../schema/interfaces'

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name)

  constructor(
    @InjectQueue('search-metrics') private readonly metricsQueue: Queue
  ) {}

  /**
   * Publishes search metrics to the queue with fire-and-forget pattern.
   * Errors are logged but don't throw to prevent search failures.
   */
  async publishSearchMetrics(event: SearchMetricsEvent): Promise<void> {
    try {
      // Generate deterministic job ID from query, offset, and rounded timestamp
      // This ensures deduplication of identical queries within the same second
      const timestampRounded = Math.floor(
        new Date(event.timestamp).getTime() / 1000
      )
      const jobIdInput = `${event.query}|${event.offset}|${timestampRounded}|${event.requestId}`
      const jobId = crypto
        .createHash('sha256')
        .update(jobIdInput)
        .digest('hex')

      await this.metricsQueue.add(
        'search-event',
        event,
        {
          jobId,
          removeOnComplete: true,
          removeOnFail: 100,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000
          }
        }
      )

      this.logger.debug(
        `Published search metrics for query="${event.query}" ` +
          `with requestId=${event.requestId}`
      )
    } catch (error) {
      this.logger.error(
        `Failed to publish search metrics: ${error.message}`,
        error.stack
      )
      // Don't throw - this is fire-and-forget
    }
  }
}
