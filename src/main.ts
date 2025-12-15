import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      skipMissingProperties: true,
      forbidNonWhitelisted: false
    })
  )

  app.enableCors({
    origin: process.env.CORS_DOMAINS ?? '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
  })
  await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
  .then(() => {
    console.log(`Wuzzy Search is running on port ${process.env.PORT ?? 3000}`)
  })
  .catch((error) => {
    console.error('Error starting Wuzzy Search:', error)
    process.exit(1)
  })
