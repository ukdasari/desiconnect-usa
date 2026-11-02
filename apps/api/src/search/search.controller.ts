import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { searchQuerySchema, type SearchQuery } from "@desiconnect/contracts";
import { CurrentUser, Public } from "../auth/decorators";
import type { AuthUser } from "../auth/auth.types";
import { Paginated } from "../common/envelope";
import { ApiZodQuery, ZodQuery } from "../common/zod";
import { SearchService } from "./search.service";

@ApiTags("search")
@Controller()
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Public()
  @Get("search")
  @ApiOperation({ summary: "Keyword and location search across all published listings" })
  @ApiZodQuery(searchQuerySchema)
  async searchAll(@ZodQuery(searchQuerySchema) query: SearchQuery, @CurrentUser() user: AuthUser | null) {
    return this.run(query, user);
  }

  @Public()
  @Get("listings")
  @ApiOperation({ summary: "Filtered listing results (same filters as /search)" })
  @ApiZodQuery(searchQuerySchema)
  async listings(@ZodQuery(searchQuerySchema) query: SearchQuery, @CurrentUser() user: AuthUser | null) {
    return this.run(query, user);
  }

  @Public()
  @Get("events")
  @ApiOperation({ summary: "Upcoming event discovery" })
  @ApiZodQuery(searchQuerySchema)
  async events(@ZodQuery(searchQuerySchema) query: SearchQuery, @CurrentUser() user: AuthUser | null) {
    return this.run({ ...query, kind: "EVENT" }, user);
  }

  @Public()
  @Get("jobs")
  @ApiOperation({ summary: "Job search" })
  @ApiZodQuery(searchQuerySchema)
  async jobs(@ZodQuery(searchQuerySchema) query: SearchQuery, @CurrentUser() user: AuthUser | null) {
    return this.run({ ...query, kind: "JOB" }, user);
  }

  @Public()
  @Get("properties")
  @ApiOperation({ summary: "Property search (rentals, sales, roommates)" })
  @ApiZodQuery(searchQuerySchema)
  async properties(@ZodQuery(searchQuerySchema) query: SearchQuery, @CurrentUser() user: AuthUser | null) {
    return this.run({ ...query, kind: "PROPERTY" }, user);
  }

  private async run(query: SearchQuery, user: AuthUser | null) {
    const result = await this.search.search(query, user?.id);
    return Paginated.of(result.items, result.total, query.page, query.pageSize, {
      locationNote: result.locationNote,
      center: result.center ? { city: result.center.city, state: result.center.state, label: result.center.label } : null,
    });
  }
}
