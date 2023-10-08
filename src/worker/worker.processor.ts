import { Process, Processor } from '@nestjs/bull';
import { WorkerService } from './worker.service';

@Processor('worker')
export class WorkerProcessor {
  constructor(private readonly workerService: WorkerService) {}

  @Process({
    name: 'processSegment',
    concurrency: 10,
  })
  async processSegment(job) {
    console.log(job.data);

    await this.workerService.processSegment(job.data);
  }
}
