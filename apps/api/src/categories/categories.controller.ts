import { Controller, Get, Module, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { CategoryDto } from "@desiconnect/contracts";
import { Public } from "../auth/decorators";
import { notFound } from "../common/errors";
import { PrismaService } from "../common/prisma.service";

@ApiTags("categories")
@Controller("categories")
export class CategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "All active categories with subcategories and published listing counts" })
  async list(): Promise<CategoryDto[]> {
    const [categories, counts] = await Promise.all([
      this.prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
      this.prisma.listing.groupBy({ by: ["categoryId"], where: { status: "PUBLISHED", deletedAt: null }, _count: { _all: true } }),
    ]);
    const countBy = new Map(counts.map((c) => [c.categoryId, c._count._all]));
    const parents = categories.filter((c) => !c.parentId);
    return parents.map((p) => {
      const children = categories.filter((c) => c.parentId === p.id);
      const childDtos = children.map((c) => ({
        id: c.id, slug: c.slug, name: c.name, tagline: c.tagline, icon: c.icon, kind: c.kind, regulated: c.regulated,
        parentSlug: p.slug, listingCount: countBy.get(c.id) ?? 0,
      }));
      return {
        id: p.id, slug: p.slug, name: p.name, tagline: p.tagline, icon: p.icon, kind: p.kind, regulated: p.regulated, parentSlug: null,
        listingCount: (countBy.get(p.id) ?? 0) + childDtos.reduce((sum, c) => sum + c.listingCount, 0),
        children: childDtos,
      };
    });
  }

  @Public()
  @Get(":slug")
  @ApiOperation({ summary: "A single category (top-level or subcategory)" })
  async get(@Param("slug") slug: string): Promise<CategoryDto> {
    const all = await this.list();
    for (const c of all) {
      if (c.slug === slug) return c;
      const child = c.children.find((ch) => ch.slug === slug);
      if (child) return { ...child, children: [] };
    }
    throw notFound("Category");
  }
}

@Module({ controllers: [CategoriesController] })
export class CategoriesModule {}
