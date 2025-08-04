import { z } from 'zod';
import { prisma } from '~/lib/prisma';

const querySchema = z.object({
  type: z.enum(['brands', 'names']).optional(),
  query: z.string().optional(),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive().max(50))
    .optional()
    .default('10'),
});

export default defineEventHandler(async (event) => {
  try {
    // Only allow GET method
    assertMethod(event, 'GET');

    // Parse and validate query parameters
    const query = getQuery(event);
    const { type, query: searchQuery, limit } = querySchema.parse(query);

    let suggestions: string[] = [];

    if (type === 'brands') {
      // Get unique brands from database
      const brands = await prisma.food.findMany({
        where: {
          brand: {
            not: null,
            ...(searchQuery && {
              contains: searchQuery,
            }),
          },
        },
        select: {
          brand: true,
        },
        distinct: ['brand'],
        take: limit,
        orderBy: {
          brand: 'asc',
        },
      });

      suggestions = brands
        .map(food => food.brand)
        .filter((brand): brand is string => brand !== null);
    }
    else if (type === 'names') {
      // Get unique food names from database
      const names = await prisma.food.findMany({
        where: searchQuery
          ? {
              name: {
                contains: searchQuery,
              },
            }
          : {},
        select: {
          name: true,
        },
        distinct: ['name'],
        take: limit,
        orderBy: {
          name: 'asc',
        },
      });

      suggestions = names.map(food => food.name);
    }
    else {
      // Return both brands and names if no type specified
      const [brands, names] = await Promise.all([
        prisma.food.findMany({
          where: {
            brand: {
              not: null,
              ...(searchQuery && {
                contains: searchQuery,
              }),
            },
          },
          select: {
            brand: true,
          },
          distinct: ['brand'],
          take: Math.floor(limit / 2),
          orderBy: {
            brand: 'asc',
          },
        }),
        prisma.food.findMany({
          where: searchQuery
            ? {
                name: {
                  contains: searchQuery,
                },
              }
            : {},
          select: {
            name: true,
          },
          distinct: ['name'],
          take: Math.floor(limit / 2),
          orderBy: {
            name: 'asc',
          },
        }),
      ]);

      const brandSuggestions = brands
        .map(food => food.brand)
        .filter((brand): brand is string => brand !== null);
      const nameSuggestions = names.map(food => food.name);

      return {
        brands: brandSuggestions,
        names: nameSuggestions,
      };
    }

    // Add caching headers for suggestions (changes less frequently)
    setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=600');

    return suggestions;
  }
  catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid query parameters',
        data: error.errors,
      });
    }

    // Handle unexpected errors
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
