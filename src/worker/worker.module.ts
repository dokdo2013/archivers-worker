import { Module } from '@nestjs/common';
import { WorkerProcessor } from './worker.processor';
import { WorkerService } from './worker.service';
import { BullModule } from '@nestjs/bull';
import { SequelizeModule } from '@nestjs/sequelize';
import { Segment } from './entities/segment.entity';

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'worker',
    }),
    SequelizeModule.forFeature([Segment]),
  ],
  providers: [WorkerService, WorkerProcessor],
})
export class WorkerModule {}
