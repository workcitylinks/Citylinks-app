import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/prisma';

async function exportAll() {
  console.log('📦 Exporting data from active database...');

  const data: Record<string, any> = {};

  data.User = await prisma.user.findMany();
  data.Shop = await prisma.shop.findMany();
  data.Product = await prisma.product.findMany();
  data.Service = await prisma.service.findMany();
  data.FeaturedService = await prisma.featuredService.findMany();
  data.Deal = await prisma.deal.findMany();
  data.CategoryTile = await prisma.categoryTile.findMany();
  data.DigitalService = await prisma.digitalService.findMany();
  data.DigitalServiceProvider = await prisma.digitalServiceProvider.findMany();
  data.TransportProvider = await prisma.transportProvider.findMany();
  data.DriverVehicle = await prisma.driverVehicle.findMany();
  data.VehicleCategory = await prisma.vehicleCategory.findMany();
  data.MarketplaceItem = await prisma.marketplaceItem.findMany();
  data.Order = await prisma.order.findMany();

  const exportPath = path.resolve(__dirname, '../prisma/full_data_sync.json');
  fs.writeFileSync(exportPath, JSON.stringify(data, null, 2), 'utf-8');

  console.log(`✅ Export completed successfully to ${exportPath}!`);
  console.log(`Summary:`);
  console.log(`  Shops: ${data.Shop.length} (Sponsored: ${data.Shop.filter((s: any) => s.isSponsored).length})`);
  console.log(`  Products: ${data.Product.length}`);
  console.log(`  Services: ${data.Service.length}`);
  console.log(`  Featured Services: ${data.FeaturedService.length}`);
  console.log(`  Deals: ${data.Deal.length}`);
  console.log(`  Users: ${data.User.length}`);
}

exportAll()
  .catch((e) => {
    console.error('❌ Export failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
