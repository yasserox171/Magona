import { Module } from "@nestjs/common";
import { FleetsService } from "./fleets.service";
import { FleetsController } from "./fleets.controller";

@Module({
  controllers: [FleetsController],
  providers: [FleetsService],
  exports: [FleetsService],
})
export class FleetsModule {}
