import { Module } from "@nestjs/common";
import { CorporateService } from "./corporate.service";
import { CorporateController } from "./corporate.controller";
import { InvoicesModule } from "../invoices/invoices.module";

@Module({
  imports: [InvoicesModule],
  controllers: [CorporateController],
  providers: [CorporateService],
  exports: [CorporateService],
})
export class CorporateModule {}
