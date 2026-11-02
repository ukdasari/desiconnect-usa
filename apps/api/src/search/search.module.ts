import { Global, Module } from "@nestjs/common";
import { GeoService } from "./geo.service";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Global()
@Module({
  controllers: [SearchController],
  providers: [GeoService, SearchService],
  exports: [GeoService, SearchService],
})
export class SearchModule {}
