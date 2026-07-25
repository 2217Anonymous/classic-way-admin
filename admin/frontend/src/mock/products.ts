import type { Product } from "@/lib/types";

const now = "2026-07-10T12:00:00.000Z";

function product(
  partial: Omit<
    Product,
    | "created_at"
    | "updated_at"
    | "visibility"
    | "is_active"
    | "exchangeable"
    | "refundable"
    | "sort_order"
  > &
    Partial<
      Pick<
        Product,
        | "created_at"
        | "updated_at"
        | "visibility"
        | "is_active"
        | "exchangeable"
        | "refundable"
        | "sort_order"
      >
    >,
): Product {
  return {
    visibility: "public",
    is_active: true,
    exchangeable: false,
    refundable: true,
    sort_order: 0,
    created_at: now,
    updated_at: now,
    ...partial,
  };
}

const names = [
  "Full Sleeve Sweatshirt for Men (Pink)",
  "Classic Cotton Tee - Navy",
  "Slim Fit Formal Shirt",
  "Relaxed Linen Kurti",
  "Printed Summer Dress",
  "Kids Graphic Hoodie",
  "Denim Straight Jeans",
  "Embroidered Party Top",
  "Everyday Polo Shirt",
  "Soft Touch Joggers",
  "Checked Casual Shirt",
  "Floral Anarkali Kurti",
  "Sport Mesh Tee",
  "Wool Blend Cardigan",
  "Cargo Utility Shorts",
  "Silk Blend Saree",
  "Boys School Uniform Set",
  "Girls Twirl Skirt",
];

export const mockProducts: Product[] = names.map((name, index) => {
  const id = index + 1;
  const price = 39.99 + index * 12.5;
  const categoryId = [6, 4, 5, 7, 8, 10, 14, 9, 4, 6, 5, 7, 4, 6, 14, 15, 10, 11][
    index
  ];
  const categoryName = [
    "Sweatshirts",
    "T-Shirts",
    "Shirts",
    "Kurtis",
    "Dresses",
    "Boys",
    "Jeans",
    "Tops",
    "T-Shirts",
    "Sweatshirts",
    "Shirts",
    "Kurtis",
    "T-Shirts",
    "Sweatshirts",
    "Jeans",
    "Sarees",
    "Boys",
    "Girls",
  ][index];
  const primary = `https://picsum.photos/seed/cw-product-${id}/480/480`;
  const colors = ["Pink", "Navy", "Blue", "Red", "Green", "Black", "White"];
  const sizes = ["S", "M", "L", "XL"];

  return product({
    id,
    name,
    slug: name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, ""),
    description: `${name} from Classic Way. Soft hand-feel fabric with durable stitching for everyday wear. Designed for comfort and a refined silhouette.`,
    short_description:
      "Premium Classic Way apparel crafted for comfort, durability, and everyday style. Soft fabric with a refined finish customers love.",
    price,
    compare_at_price: price + 20,
    discount_percent: 10 + (index % 5),
    sku: `CW-${1000 + id}`,
    manufacturer_name: "Classic Way Retail",
    manufacturer_brand: index % 2 === 0 ? "Classic Way" : "Tommy Hilfiger",
    stock: 80 + index * 35,
    tags: "cotton, casual, classic-way, summer",
    published_at: index % 4 === 0 ? null : now,
    category_id: categoryId,
    category_name: categoryName,
    brand_id: (index % 3) + 1,
    is_published: index % 4 !== 0,
    is_featured: index % 5 === 0,
    is_trending: index % 4 === 1,
    is_best_seller: index % 6 === 0,
    exchangeable: index % 3 === 0,
    refundable: index % 5 !== 0,
    primary_image_url: primary,
    media: [
      {
        id: id * 10,
        product_id: id,
        url: primary,
        alt_text: name,
        sort_order: 0,
        is_primary: true,
        created_at: now,
      },
      {
        id: id * 10 + 1,
        product_id: id,
        url: `https://picsum.photos/seed/cw-product-${id}-b/480/480`,
        alt_text: `${name} alternate`,
        sort_order: 1,
        is_primary: false,
        created_at: now,
      },
      {
        id: id * 10 + 2,
        product_id: id,
        url: `https://picsum.photos/seed/cw-product-${id}-c/480/480`,
        alt_text: `${name} detail`,
        sort_order: 2,
        is_primary: false,
        created_at: now,
      },
    ],
    attributes: [
      {
        id: id * 100,
        product_id: id,
        name: "Size",
        values: sizes,
        sort_order: 0,
        created_at: now,
      },
      {
        id: id * 100 + 1,
        product_id: id,
        name: "Color",
        values: colors.slice(0, 4 + (index % 3)),
        sort_order: 1,
        created_at: now,
      },
    ],
    variants: [
      {
        id: id * 1000,
        product_id: id,
        sku: `CW-${1000 + id}-S`,
        price: price,
        stock: 20 + index,
        options: { Size: "S", Color: colors[0] },
        is_active: true,
        sort_order: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: id * 1000 + 1,
        product_id: id,
        sku: `CW-${1000 + id}-M`,
        price: price,
        stock: 30 + index,
        options: { Size: "M", Color: colors[1] },
        is_active: true,
        sort_order: 1,
        created_at: now,
        updated_at: now,
      },
    ],
  });
});
