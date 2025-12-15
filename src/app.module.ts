import { Logger, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { BullModule } from '@nestjs/bullmq'
import type { ConnectionOptions } from 'bullmq'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { RewardsQueueModule } from './rewards-queue/rewards-queue.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (
        config: ConfigService<{
          REWARDS_REDIS_MODE: string
          REWARDS_REDIS_HOST: string
          REWARDS_REDIS_PORT: number
          REWARDS_REDIS_MASTER_NAME: string
          REWARDS_REDIS_SENTINEL_1_HOST: string
          REWARDS_REDIS_SENTINEL_1_PORT: number
          REWARDS_REDIS_SENTINEL_2_HOST: string
          REWARDS_REDIS_SENTINEL_2_PORT: number
          REWARDS_REDIS_SENTINEL_3_HOST: string
          REWARDS_REDIS_SENTINEL_3_PORT: number
        }>
      ) => {
        const logger = new Logger(AppModule.name)
        const redisMode =
          config.get('REWARDS_REDIS_MODE', { infer: true }) ?? 'standalone'

        let connection: ConnectionOptions = {
          host: config.get('REWARDS_REDIS_HOST', { infer: true }) as string,
          port: config.get('REWARDS_REDIS_PORT', { infer: true }) as number
        }

        if (redisMode === 'sentinel') {
          const name = config.get('REWARDS_REDIS_MASTER_NAME', {
            infer: true
          }) as string
          const sentinels = [
            {
              host: config.get('REWARDS_REDIS_SENTINEL_1_HOST', {
                infer: true
              }) as string,
              port: config.get('REWARDS_REDIS_SENTINEL_1_PORT', {
                infer: true
              }) as number
            },
            {
              host: config.get('REWARDS_REDIS_SENTINEL_2_HOST', {
                infer: true
              }) as string,
              port: config.get('REWARDS_REDIS_SENTINEL_2_PORT', {
                infer: true
              }) as number
            },
            {
              host: config.get('REWARDS_REDIS_SENTINEL_3_HOST', {
                infer: true
              }) as string,
              port: config.get('REWARDS_REDIS_SENTINEL_3_PORT', {
                infer: true
              }) as number
            }
          ]
          connection = { sentinels, name }
        }

        logger.log(`Connecting to Redis with mode ${redisMode}`)
        logger.log(`Connection: ${JSON.stringify(connection)}`)

        return { connection }
      }
    }),
    RewardsQueueModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
