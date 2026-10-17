import { prisma } from '../lib/prisma';

export interface DeduplicationReport {
  categoryTilesRemoved: number;
  digitalServicesRemoved: number;
  digitalProvidersRemoved: number;
  featuredServicesRemoved: number;
  servicesRemoved: number;
  dealsRemoved: number;
  vehicleCategoriesRemoved: number;
  transportProvidersRemoved: number;
  shopsRemoved: number;
  productsRemoved: number;
  marketplaceItemsRemoved: number;
}

/**
 * Scans the database and cleans up duplicate records created by duplicate imports or seeds.
 * Preserves the best/richest records and cascades product associations cleanly.
 */
export async function deduplicateDatabase(): Promise<DeduplicationReport> {
  const report: DeduplicationReport = {
    categoryTilesRemoved: 0,
    digitalServicesRemoved: 0,
    digitalProvidersRemoved: 0,
    featuredServicesRemoved: 0,
    servicesRemoved: 0,
    dealsRemoved: 0,
    vehicleCategoriesRemoved: 0,
    transportProvidersRemoved: 0,
    shopsRemoved: 0,
    productsRemoved: 0,
    marketplaceItemsRemoved: 0,
  };

  try {
    console.log('[Deduplication] Starting automated database cleanup...');

    // 1. Category Tiles (type + name)
    const tiles = await prisma.categoryTile.findMany({ orderBy: { createdAt: 'asc' } });
    const seenTiles = new Map<string, string>();
    const tileIdsToDelete: string[] = [];

    for (const t of tiles) {
      const key = `${t.type.trim().toLowerCase()}:${t.name.trim().toLowerCase()}`;
      if (seenTiles.has(key)) {
        tileIdsToDelete.push(t.id);
      } else {
        seenTiles.set(key, t.id);
      }
    }

    if (tileIdsToDelete.length > 0) {
      const res = await prisma.categoryTile.deleteMany({
        where: { id: { in: tileIdsToDelete } },
      });
      report.categoryTilesRemoved = res.count;
      console.log(`[Deduplication] Removed ${res.count} duplicate CategoryTiles.`);
    }

    // 2. Digital Services (name)
    const digitalServices = await prisma.digitalService.findMany({ orderBy: { createdAt: 'asc' } });
    const seenDigital = new Map<string, string>();
    const digitalIdsToDelete: string[] = [];

    for (const ds of digitalServices) {
      const key = ds.name.trim().toLowerCase();
      if (seenDigital.has(key)) {
        digitalIdsToDelete.push(ds.id);
      } else {
        seenDigital.set(key, ds.id);
      }
    }

    if (digitalIdsToDelete.length > 0) {
      const res = await prisma.digitalService.deleteMany({
        where: { id: { in: digitalIdsToDelete } },
      });
      report.digitalServicesRemoved = res.count;
      console.log(`[Deduplication] Removed ${res.count} duplicate DigitalServices.`);
    }

    // 3. Digital Service Providers (serviceType + name)
    const digitalProviders = await prisma.digitalServiceProvider.findMany({ orderBy: { createdAt: 'asc' } });
    const seenProviders = new Map<string, string>();
    const providerIdsToDelete: string[] = [];

    for (const dp of digitalProviders) {
      const key = `${dp.serviceType.trim().toLowerCase()}:${dp.name.trim().toLowerCase()}`;
      if (seenProviders.has(key)) {
        providerIdsToDelete.push(dp.id);
      } else {
        seenProviders.set(key, dp.id);
      }
    }

    if (providerIdsToDelete.length > 0) {
      const res = await prisma.digitalServiceProvider.deleteMany({
        where: { id: { in: providerIdsToDelete } },
      });
      report.digitalProvidersRemoved = res.count;
      console.log(`[Deduplication] Removed ${res.count} duplicate DigitalServiceProviders.`);
    }

    // 4. Featured Services (name + provider)
    const featuredServices = await prisma.featuredService.findMany({ orderBy: { createdAt: 'asc' } });
    const seenFeatured = new Map<string, string>();
    const featuredIdsToDelete: string[] = [];

    for (const fsItem of featuredServices) {
      const key = `${fsItem.name.trim().toLowerCase()}:${fsItem.provider.trim().toLowerCase()}`;
      if (seenFeatured.has(key)) {
        featuredIdsToDelete.push(fsItem.id);
      } else {
        seenFeatured.set(key, fsItem.id);
      }
    }

    if (featuredIdsToDelete.length > 0) {
      const res = await prisma.featuredService.deleteMany({
        where: { id: { in: featuredIdsToDelete } },
      });
      report.featuredServicesRemoved = res.count;
      console.log(`[Deduplication] Removed ${res.count} duplicate FeaturedServices.`);
    }

    // 5. Services (title + providerName)
    const services = await prisma.service.findMany({ orderBy: { createdAt: 'asc' } });
    const seenServices = new Map<string, any>();
    const serviceIdsToDelete: string[] = [];

    for (const s of services) {
      const key = `${s.title.trim().toLowerCase()}:${(s.providerName || '').trim().toLowerCase()}`;
      if (seenServices.has(key)) {
        const primary = seenServices.get(key);
        // If the duplicate has isFeatured, ensure primary is featured
        if (s.isFeatured && !primary.isFeatured) {
          await prisma.service.update({
            where: { id: primary.id },
            data: { isFeatured: true },
          });
          primary.isFeatured = true;
        }
        serviceIdsToDelete.push(s.id);
      } else {
        seenServices.set(key, s);
      }
    }

    if (serviceIdsToDelete.length > 0) {
      const res = await prisma.service.deleteMany({
        where: { id: { in: serviceIdsToDelete } },
      });
      report.servicesRemoved = res.count;
      console.log(`[Deduplication] Removed ${res.count} duplicate Services.`);
    }

    // 6. Deals (title + merchantName)
    const deals = await prisma.deal.findMany({ orderBy: { createdAt: 'asc' } });
    const seenDeals = new Map<string, string>();
    const dealIdsToDelete: string[] = [];

    for (const d of deals) {
      const key = `${d.title.trim().toLowerCase()}:${d.merchantName.trim().toLowerCase()}`;
      if (seenDeals.has(key)) {
        dealIdsToDelete.push(d.id);
      } else {
        seenDeals.set(key, d.id);
      }
    }

    if (dealIdsToDelete.length > 0) {
      const res = await prisma.deal.deleteMany({
        where: { id: { in: dealIdsToDelete } },
      });
      report.dealsRemoved = res.count;
      console.log(`[Deduplication] Removed ${res.count} duplicate Deals.`);
    }

    // 7. Vehicle Categories (type + name)
    const vehicleCategories = await prisma.vehicleCategory.findMany({ orderBy: { createdAt: 'asc' } });
    const seenVehCats = new Map<string, string>();
    const vehCatIdsToDelete: string[] = [];

    for (const vc of vehicleCategories) {
      const key = `${vc.type.trim().toLowerCase()}:${vc.name.trim().toLowerCase()}`;
      if (seenVehCats.has(key)) {
        vehCatIdsToDelete.push(vc.id);
      } else {
        seenVehCats.set(key, vc.id);
      }
    }

    if (vehCatIdsToDelete.length > 0) {
      const res = await prisma.vehicleCategory.deleteMany({
        where: { id: { in: vehCatIdsToDelete } },
      });
      report.vehicleCategoriesRemoved = res.count;
      console.log(`[Deduplication] Removed ${res.count} duplicate VehicleCategories.`);
    }

    // 8. Transport Providers (type + name)
    const transportProviders = await prisma.transportProvider.findMany({
      include: { vehicles: true },
      orderBy: { createdAt: 'asc' },
    });
    const seenTransport = new Map<string, any>();
    const transportIdsToDelete: string[] = [];

    for (const tp of transportProviders) {
      const key = `${tp.type.trim().toLowerCase()}:${tp.name.trim().toLowerCase()}`;
      if (seenTransport.has(key)) {
        const primary = seenTransport.get(key);
        // Move any unique vehicles to primary provider
        for (const v of tp.vehicles) {
          const vExists = primary.vehicles.some((pv: any) => pv.plateNumber === v.plateNumber);
          if (!vExists) {
            await prisma.driverVehicle.update({
              where: { id: v.id },
              data: { driverId: primary.id },
            });
          }
        }
        transportIdsToDelete.push(tp.id);
      } else {
        seenTransport.set(key, tp);
      }
    }

    if (transportIdsToDelete.length > 0) {
      const res = await prisma.transportProvider.deleteMany({
        where: { id: { in: transportIdsToDelete } },
      });
      report.transportProvidersRemoved = res.count;
      console.log(`[Deduplication] Removed ${res.count} duplicate TransportProviders.`);
    }

    // 9. MarketplaceItems (entity_type + title)
    const marketplaceItems = await prisma.marketplaceItem.findMany({ orderBy: { createdAt: 'asc' } });
    const seenMarketplace = new Map<string, string>();
    const mpIdsToDelete: string[] = [];

    for (const mi of marketplaceItems) {
      const key = `${mi.entity_type.trim().toLowerCase()}:${mi.title.trim().toLowerCase()}`;
      if (seenMarketplace.has(key)) {
        mpIdsToDelete.push(mi.id);
      } else {
        seenMarketplace.set(key, mi.id);
      }
    }

    if (mpIdsToDelete.length > 0) {
      const res = await prisma.marketplaceItem.deleteMany({
        where: { id: { in: mpIdsToDelete } },
      });
      report.marketplaceItemsRemoved = res.count;
      console.log(`[Deduplication] Removed ${res.count} duplicate MarketplaceItems.`);
    }

    // 10. Shops & Products Deduplication
    const shops = await prisma.shop.findMany({
      include: { products: true },
      orderBy: { createdAt: 'asc' },
    });

    const shopGroups = new Map<string, any[]>();
    for (const shop of shops) {
      const key = shop.name.trim().toLowerCase();
      if (!shopGroups.has(key)) {
        shopGroups.set(key, []);
      }
      shopGroups.get(key)!.push(shop);
    }

    for (const [name, shopList] of shopGroups.entries()) {
      // Pick the primary shop (the one with the most products or newest data)
      shopList.sort((a, b) => b.products.length - a.products.length);
      const primaryShop = shopList[0];
      const duplicateShops = shopList.slice(1);

      // Clean duplicate products within the primary shop itself
      const existingProductMap = new Map<string, any>();
      const prodIdsToDelete: string[] = [];

      for (const prod of primaryShop.products) {
        const prodKey = prod.name.trim().toLowerCase();
        if (existingProductMap.has(prodKey)) {
          prodIdsToDelete.push(prod.id);
        } else {
          existingProductMap.set(prodKey, prod);
        }
      }

      if (prodIdsToDelete.length > 0) {
        await prisma.product.deleteMany({
          where: { id: { in: prodIdsToDelete } },
        });
        report.productsRemoved += prodIdsToDelete.length;
      }

      // Reassign or delete products from duplicate shops
      for (const dupShop of duplicateShops) {
        // If duplicate has isSponsored or isFeatured, reflect on primary
        if (dupShop.isSponsored && !primaryShop.isSponsored) {
          await prisma.shop.update({
            where: { id: primaryShop.id },
            data: { isSponsored: true },
          });
          primaryShop.isSponsored = true;
        }

        for (const dupProd of dupShop.products) {
          const prodKey = dupProd.name.trim().toLowerCase();
          if (existingProductMap.has(prodKey)) {
            // Already present in primary shop, safe to delete duplicate
            await prisma.product.delete({ where: { id: dupProd.id } }).catch(() => {});
            report.productsRemoved++;
          } else {
            // Migrate to primary shop
            await prisma.product.update({
              where: { id: dupProd.id },
              data: { shopId: primaryShop.id },
            }).catch(() => {});
            existingProductMap.set(prodKey, dupProd);
          }
        }

        // Delete the duplicate shop
        await prisma.shop.delete({ where: { id: dupShop.id } }).catch(() => {});
        report.shopsRemoved++;
      }
    }

    // 11. Final pass: clean any remaining duplicate products in any shop
    const allRemainingShops = await prisma.shop.findMany({
      include: { products: true },
    });
    for (const s of allRemainingShops) {
      const pMap = new Map<string, string>();
      const delProds: string[] = [];
      for (const p of s.products) {
        const k = p.name.trim().toLowerCase();
        if (pMap.has(k)) {
          delProds.push(p.id);
        } else {
          pMap.set(k, p.id);
        }
      }
      if (delProds.length > 0) {
        await prisma.product.deleteMany({ where: { id: { in: delProds } } });
        report.productsRemoved += delProds.length;
      }
    }

    console.log('[Deduplication] Cleanup complete:', report);
    return report;
  } catch (err) {
    console.error('[Deduplication Error]:', err);
    return report;
  }
}
