import type { Category, CategoryTreeNode } from "@/lib/types";

const now = "2026-07-01T10:00:00.000Z";

export const mockCategories: Category[] = [
  {
    id: 1,
    name: "Men",
    slug: "men",
    description: "Men's fashion and essentials",
    image_url: "https://picsum.photos/seed/cat-men/200/200",
    parent_id: null,
    is_active: true,
    sort_order: 1,
    created_at: now,
    updated_at: now,
  },
  {
    id: 2,
    name: "Women",
    slug: "women",
    description: "Women's apparel and accessories",
    image_url: "https://picsum.photos/seed/cat-women/200/200",
    parent_id: null,
    is_active: true,
    sort_order: 2,
    created_at: now,
    updated_at: now,
  },
  {
    id: 3,
    name: "Kids",
    slug: "kids",
    description: "Kids wear and school essentials",
    image_url: "https://picsum.photos/seed/cat-kids/200/200",
    parent_id: null,
    is_active: true,
    sort_order: 3,
    created_at: now,
    updated_at: now,
  },
  {
    id: 4,
    name: "T-Shirts",
    slug: "men-tshirts",
    description: "Casual and graphic tees",
    image_url: "https://picsum.photos/seed/cat-tees/200/200",
    parent_id: 1,
    is_active: true,
    sort_order: 1,
    created_at: now,
    updated_at: now,
  },
  {
    id: 5,
    name: "Shirts",
    slug: "men-shirts",
    description: "Formal and casual shirts",
    image_url: "https://picsum.photos/seed/cat-shirts/200/200",
    parent_id: 1,
    is_active: true,
    sort_order: 2,
    created_at: now,
    updated_at: now,
  },
  {
    id: 6,
    name: "Sweatshirts",
    slug: "men-sweatshirts",
    description: "Hoodies and sweatshirts",
    image_url: "https://picsum.photos/seed/cat-sweat/200/200",
    parent_id: 1,
    is_active: true,
    sort_order: 3,
    created_at: now,
    updated_at: now,
  },
  {
    id: 7,
    name: "Kurtis",
    slug: "women-kurtis",
    description: "Everyday and festive kurtis",
    image_url: "https://picsum.photos/seed/cat-kurtis/200/200",
    parent_id: 2,
    is_active: true,
    sort_order: 1,
    created_at: now,
    updated_at: now,
  },
  {
    id: 8,
    name: "Dresses",
    slug: "women-dresses",
    description: "Casual and party dresses",
    image_url: "https://picsum.photos/seed/cat-dresses/200/200",
    parent_id: 2,
    is_active: true,
    sort_order: 2,
    created_at: now,
    updated_at: now,
  },
  {
    id: 9,
    name: "Tops",
    slug: "women-tops",
    description: "Tops and blouses",
    image_url: "https://picsum.photos/seed/cat-tops/200/200",
    parent_id: 2,
    is_active: true,
    sort_order: 3,
    created_at: now,
    updated_at: now,
  },
  {
    id: 10,
    name: "Boys",
    slug: "kids-boys",
    description: "Boys clothing",
    image_url: "https://picsum.photos/seed/cat-boys/200/200",
    parent_id: 3,
    is_active: true,
    sort_order: 1,
    created_at: now,
    updated_at: now,
  },
  {
    id: 11,
    name: "Girls",
    slug: "kids-girls",
    description: "Girls clothing",
    image_url: "https://picsum.photos/seed/cat-girls/200/200",
    parent_id: 3,
    is_active: true,
    sort_order: 2,
    created_at: now,
    updated_at: now,
  },
  {
    id: 12,
    name: "Accessories",
    slug: "accessories",
    description: "Bags, belts, and more",
    image_url: "https://picsum.photos/seed/cat-acc/200/200",
    parent_id: null,
    is_active: true,
    sort_order: 4,
    created_at: now,
    updated_at: now,
  },
  {
    id: 13,
    name: "Footwear",
    slug: "footwear",
    description: "Shoes and sandals",
    image_url: "https://picsum.photos/seed/cat-foot/200/200",
    parent_id: null,
    is_active: false,
    sort_order: 5,
    created_at: now,
    updated_at: now,
  },
  {
    id: 14,
    name: "Jeans",
    slug: "men-jeans",
    description: "Denim fits for men",
    image_url: "https://picsum.photos/seed/cat-jeans/200/200",
    parent_id: 1,
    is_active: true,
    sort_order: 4,
    created_at: now,
    updated_at: now,
  },
  {
    id: 15,
    name: "Sarees",
    slug: "women-sarees",
    description: "Silk and cotton sarees",
    image_url: "https://picsum.photos/seed/cat-sarees/200/200",
    parent_id: 2,
    is_active: true,
    sort_order: 4,
    created_at: now,
    updated_at: now,
  },
];

export function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  const map = new Map<number, CategoryTreeNode>();
  categories.forEach((category) => {
    map.set(category.id, { ...category, children: [] });
  });
  const roots: CategoryTreeNode[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortNodes = (nodes: CategoryTreeNode[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    nodes.forEach((node) => sortNodes(node.children));
  };
  sortNodes(roots);
  return roots;
}

export const mockCategoryTree = buildCategoryTree(mockCategories);
