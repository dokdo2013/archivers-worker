import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Segment } from './entities/segment.entity';
import axios from 'axios';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { WorkerDto } from './dto/worker.dto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { unlink } from 'fs/promises';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class WorkerService {
  constructor(
    @InjectModel(Segment) private readonly segmentModel: typeof Segment,
    private sequelize: Sequelize,
  ) {
    this.sequelize.addModels([Segment]);
  }

  async processSegment(data: WorkerDto): Promise<void> {
    // const tsFileName = path.basename(data.segmentUri);
    const uuidFileName = uuidv4();
    const uploadFileName = `${uuidFileName}.ts`;

    const response = await axios.get(data.segmentUri, {
      responseType: 'stream',
    });
    const writer = fs.createWriteStream(uploadFileName);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: data.s3Url,
      credentials: {
        accessKeyId: data.s3AccessKeyId,
        secretAccessKey: data.s3SecretAccessKey,
      },
    });
    const uploadStream = fs.createReadStream(uploadFileName);
    const params = {
      Bucket: data.s3BucketName,
      Key: `${data.streamId}/${uploadFileName}`,
      Body: uploadStream,
    };
    await s3Client.send(new PutObjectCommand(params));

    const convertedDate = new Date(data.date);
    const currentDate = new Date();

    await this.segmentModel.create({
      streamId: data.streamId,
      segmentId: uuidFileName,
      segmentLength: parseFloat(data.segmentDuration),
      link: `${data.cdnBaseUrl}/${data.streamId}/${uploadFileName}`,
      createdAt: convertedDate,
      updatedAt: currentDate,
    });

    try {
      await unlink(uploadFileName);
      console.log(`Successfully deleted local file ${uploadFileName}`);
    } catch (error) {
      console.error(
        `Error deleting file ${uploadFileName}. Error: ${error.message}`,
      );
    }

    console.log(`[Worker] ${data.segmentUri} is processed.`);
  }
}
