import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/prisma';

async function importAll() {
  const jsonPath = path.resolve(__dirname, '../prisma/full_data_sync.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Data file not found at ${jsonPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(raw);

  console.log('📥 Importing full dataset into target database...');

  // 1. Users
  if (data.User?.length) {
    for (const u of data.User) {
      await prisma.user.upsert({
        where: { id: u.id },
        update: u,
        create: u,
      });
    }
    console.log(`  ✓ Synced ${data.User.length} Users`);
  }

  // 2. Shops
  if (data.Shop?.length) {
    for (const s of data.Shop) {
      await prisma.shop.upsert({
        where: { id: s.id },
        update: s,
        create: s,
      });
    }
    console.log(`  ✓ Synced ${data.Shop.length} Shops (including sponsored statuses)`);
  }

  // 3. Products
  if (data.Product?.length) {
    for (const p of data.Product) {
      await prisma.product.upsert({
        where: { id: p.id },
        update: p,
        create: p,
      });
    }
    console.log(`  ✓ Synced ${data.Product.length} Products`);
  }

  // 4. Services
  if (data.Service?.length) {
    for (const s of data.Service) {
      await prisma.service.upsert({
        where: { id: s.id },
        update: s,
        create: s,
      });
    }
    console.log(`  ✓ Synced ${data.Service.length} Services`);
  }

  // 5. Featured Services
  if (data.FeaturedService?.length) {
    for (const fsItem of data.FeaturedService) {
      await prisma.featuredService.upsert({
        where: { id: fsItem.id },
        update: fsItem,
        create: fsItem,
      });
    }
    console.log(`  ✓ Synced ${data.FeaturedService.length} Featured Services`);
  }

  // 6. Deals
  if (data.Deal?.length) {
    for (const d of data.Deal) {
      await prisma.deal.upsert({
        where: { id: d.id },
        update: d,
        create: d,
      });
    }
    console.log(`  ✓ Synced ${data.Deal.length} Deals`);
  }

  // 7. Category Tiles
  if (data.CategoryTile?.length) {
    for (const ct of data.CategoryTile) {
      await prisma.categoryTile.upsert({
        where: { id: ct.id },
        update: ct,
        create: ct,
      });
    }
    console.log(`  ✓ Synced ${data.CategoryTile.length} Category Tiles`);
  }

  // 8. Digital Services
  if (data.DigitalService?.length) {
    for (const ds of data.DigitalService) {
      await prisma.digitalService.upsert({
        where: { id: ds.id },
        update: ds,
        create: ds,
      });
    }
    console.log(`  ✓ Synced ${data.DigitalService.length} Digital Services`);
  }

  // 9. Digital Service Providers
  if (data.DigitalServiceProvider?.length) {
    for (const dsp of data.DigitalServiceProvider) {
      await prisma.digitalServiceProvider.upsert({
        where: { id: dsp.id },
        update: dsp,
        create: dsp,
      });
    }
    console.log(`  ✓ Synced ${data.DigitalServiceProvider.length} Digital Service Providers`);
  }

  // 10. Vehicle Categories & Transport Providers
  if (data.VehicleCategory?.length) {
    for (const vc of data.VehicleCategory) {
      await prisma.vehicleCategory.upsert({
        where: { id: vc.id },
        update: vc,
        create: vc,
      });
    }
  }

  if (data.TransportProvider?.length) {
    for (const tp of data.TransportProvider) {
      await prisma.transportProvider.upsert({
        where: { id: tp.id },
        update: tp,
        create: tp,
      });
    }
  }

  if (data.DriverVehicle?.length) {
    for (const dv of data.DriverVehicle) {
      await prisma.driverVehicle.upsert({
        where: { id: dv.id },
        update: dv,
        create: dv,
      });
    }
  }

  // 11. Marketplace Items
  if (data.MarketplaceItem?.length) {
    for (const mi of data.MarketplaceItem) {
      await prisma.marketplaceItem.upsert({
        where: { id: mi.id },
        update: mi,
        create: mi,
      });
    }
  }

  console.log('🎉 Full dataset sync to target database completed successfully!');
}

importAll()
  .catch((e) => {
    console.error('❌ Import failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
