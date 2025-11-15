import { Logger, Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { ConnectionOptions } from 'bullmq'
import { ConfigModule, ConfigService } from '@nestjs/config'

import { AppController } from './app.controller'
import { AppService } from './app.service'
import { MetricsModule } from './metrics/metrics.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (
        config: ConfigService<{
          REDIS_MODE: string
          REDIS_HOST: string
          REDIS_PORT: number
          REDIS_MASTER_NAME: string
          REDIS_SENTINEL_1_HOST: string
          REDIS_SENTINEL_1_PORT: number
          REDIS_SENTINEL_2_HOST: string
          REDIS_SENTINEL_2_PORT: number
          REDIS_SENTINEL_3_HOST: string
          REDIS_SENTINEL_3_PORT: number
        }>
      ) => {
        const logger = new Logger(AppModule.name)
        const redisMode = config.get<string>('REDIS_MODE', 'standalone', {
          infer: true
        })

        let connection: ConnectionOptions = {
          host: config.get<string>('REDIS_HOST', { infer: true }),
          port: config.get<number>('REDIS_PORT', { infer: true }),
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          retryStrategy: (times: number) => {
            // Don't retry connection - fail gracefully
            if (times > 1) {
              logger.warn('Redis connection failed, metrics will be disabled')
              return null
            }
            return Math.min(times * 50, 2000)
          }
        }

        if (redisMode === 'sentinel') {
          const name = config.get<string>('REDIS_MASTER_NAME', { infer: true })
          const sentinels = [
            {
              host: config.get<string>('REDIS_SENTINEL_1_HOST', {
                infer: true
              }),
              port: config.get<number>('REDIS_SENTINEL_1_PORT', {
                infer: true
              })
            },
            {
              host: config.get<string>('REDIS_SENTINEL_2_HOST', {
                infer: true
              }),
              port: config.get<number>('REDIS_SENTINEL_2_PORT', {
                infer: true
              })
            },
            {
              host: config.get<string>('REDIS_SENTINEL_3_HOST', {
                infer: true
              }),
              port: config.get<number>('REDIS_SENTINEL_3_PORT', {
                infer: true
              })
            }
          ]
          connection = { 
            sentinels, 
            name,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            retryStrategy: (times: number) => {
              if (times > 1) {
                logger.warn('Redis connection failed, metrics will be disabled')
                return null
              }
              return Math.min(times * 50, 2000)
            }
          }
        }

        logger.log(`Connecting to Redis with mode ${redisMode}`)
        logger.log(`Connection: ${JSON.stringify(connection)}`)

        return { connection }
      }
    }),
    BullModule.registerQueue({
      name: 'search-metrics'
    }),
    MetricsModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
