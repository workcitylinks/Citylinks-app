import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';

export async function seedAll() {
  console.log('[Seed] Starting comprehensive database seeding...');

  // 1. Seed Demo Admin / Customer User if empty
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    const hashedPassword = await bcrypt.hash('Citylinks@123', 10);
    await prisma.user.create({
      data: {
        email: 'demo@citylinks.in',
        password: hashedPassword,
        fullName: 'Sachin Patil',
        firstName: 'Sachin',
        lastName: 'Patil',
        phone: '9449084242',
        address: '5th Cross, Behind LIC, Haveri, Karnataka - 581110',
        role: 'CUSTOMER',
        isVerified: true,
      },
    });
    console.log('[Seed] Created default verified user demo@citylinks.in');
  }

  // 2. Seed Shops & Products
  console.log('[Seed] Checking shops and products...');
  const renuka = await prisma.shop.findFirst({
    where: { name: { contains: 'Renuka Appliances', mode: 'insensitive' } },
  });

  let renukaId = renuka?.id;
  if (!renuka) {
    const createdRenuka = await prisma.shop.create({
      data: {
        name: 'Renuka Appliances',
        category: 'Retail',
        location: 'Haveri',
        phone: '09449084242',
        email: 'sachi.hvr@gmail.com',
        status: 'Approved',
        latitude: 14.7972,
        longitude: 75.4011,
        address: '5th Cross, Behind LIC, Haveri, Karnataka - 581110',
        rating: 4.9,
        reviewCount: 348,
      },
    });
    renukaId = createdRenuka.id;
    console.log('[Seed] Created Renuka Appliances.');
  } else {
    await prisma.shop.update({
      where: { id: renuka.id },
      data: {
        address: '5th Cross, Behind LIC, Haveri, Karnataka - 581110',
        phone: '09449084242',
        email: 'sachi.hvr@gmail.com',
        category: 'Retail',
        rating: 4.9,
        reviewCount: 348,
      },
    });
  }

  // Products for Renuka Appliances
  if (renukaId) {
    const renukaProductsCount = await prisma.product.count({
      where: { shopId: renukaId },
    });
    if (renukaProductsCount === 0) {
      await prisma.product.createMany({
        data: [
          {
            shopId: renukaId,
            name: 'Nut',
            description: 'M8 Stainless Steel Hex Nut with anti-corrosion coating',
            price: 1,
            unit: 'piece',
            stock: 250,
            isActive: true,
          },
          {
            shopId: renukaId,
            name: 'Bolt (M8 Hex)',
            description: 'High tensile steel threaded bolt 40mm',
            price: 3,
            unit: 'piece',
            stock: 200,
            isActive: true,
          },
          {
            shopId: renukaId,
            name: 'Washer Set (Pack of 10)',
            description: 'Corrosion resistant flat steel spring washers',
            price: 10,
            unit: 'pack',
            stock: 120,
            isActive: true,
          },
          {
            shopId: renukaId,
            name: 'Ceiling Fan Regulator',
            description: 'Standard 5-step rotary quiet fan speed regulator',
            price: 85,
            unit: 'piece',
            stock: 60,
            isActive: true,
          },
          {
            shopId: renukaId,
            name: 'Modular Switch 6A',
            description: 'White durable fire-resistant modular electrical switch',
            price: 35,
            unit: 'piece',
            stock: 180,
            isActive: true,
          },
          {
            shopId: renukaId,
            name: 'LED Bulb 9W Cool White',
            description: 'Energy saving long-life B22 daylight LED bulb',
            price: 89,
            unit: 'piece',
            stock: 95,
            isActive: true,
          },
          {
            shopId: renukaId,
            name: 'Insulation Tape 10m',
            description: 'High adhesion fire retardant electrical PVC tape',
            price: 15,
            unit: 'roll',
            stock: 150,
            isActive: true,
          },
          {
            shopId: renukaId,
            name: 'Heavy Duty Extension Cord (3 Pin)',
            description: 'Universal surge protector power strip with 4 sockets',
            price: 249,
            unit: 'piece',
            stock: 40,
            isActive: true,
          },
        ],
      });
      console.log('[Seed] Seeded products for Renuka Appliances.');
    }
  }

  // Other Shops
  const otherShopsData = [
    {
      name: 'Sri Lakshmi Supermarket',
      category: 'Grocery',
      location: 'Haveri Town',
      phone: '9845223344',
      email: 'lakshmi.market@gmail.com',
      status: 'Approved',
      latitude: 14.795,
      longitude: 75.399,
      address: 'PB Road, Near Bus Stand, Haveri - 581110',
      rating: 4.8,
      reviewCount: 290,
      products: [
        { name: 'Sona Masoori Rice (5kg)', description: 'Premium aged polished rice', price: 320, unit: 'bag', stock: 50 },
        { name: 'Toor Dal (1kg)', description: 'Unpolished organic protein pulses', price: 165, unit: 'kg', stock: 40 },
        { name: 'Sunflower Oil (1L)', description: 'Refined healthy cooking oil pouch', price: 135, unit: 'packet', stock: 60 },
        { name: 'Whole Wheat Atta (5kg)', description: '100% stone ground nutritious flour', price: 245, unit: 'bag', stock: 35 },
        { name: 'Tata Salt (1kg)', description: 'Vacuum evaporated iodized salt', price: 28, unit: 'packet', stock: 100 },
      ],
    },
    {
      name: 'City Digital & Mobile Hub',
      category: 'Electronics',
      location: 'Haveri Region',
      phone: '9980112233',
      email: 'citymobiles.hvr@gmail.com',
      status: 'Approved',
      latitude: 14.7965,
      longitude: 75.402,
      address: 'Gandhi Chowk, Haveri - 581110',
      rating: 4.8,
      reviewCount: 215,
      products: [
        { name: 'Fast USB-C Cable (1m)', description: 'Braided nylon 65W fast charging', price: 199, unit: 'piece', stock: 70 },
        { name: 'Tempered Glass Screen Guard', description: '9H hardness scratch protection', price: 99, unit: 'piece', stock: 120 },
        { name: '20W Dual Port Fast Charger', description: 'Type-C and USB-A smart adapter', price: 449, unit: 'piece', stock: 30 },
        { name: 'Wireless Bluetooth Earbuds', description: 'Deep bass, 24hr playback', price: 899, unit: 'piece', stock: 25 },
      ],
    },
    {
      name: 'Shree Balaji Hardware & Paints',
      category: 'Hardware',
      location: 'Haveri Town',
      phone: '9731667788',
      email: 'balaji.hardware@gmail.com',
      status: 'Approved',
      latitude: 14.798,
      longitude: 75.4035,
      address: 'Station Road, Opposite Railway Station, Haveri - 581110',
      rating: 4.7,
      reviewCount: 175,
      products: [
        { name: 'Stainless Steel Scissors', description: 'Multi-purpose kitchen & household scissors', price: 65, unit: 'piece', stock: 40 },
        { name: 'Adhesive Packing Tape 2-inch', description: 'Heavy duty carton sealing tape', price: 45, unit: 'roll', stock: 90 },
        { name: 'Microfiber Cleaning Cloth (Pack of 3)', description: 'Ultra absorbent lint-free wipes', price: 110, unit: 'pack', stock: 60 },
        { name: 'Wall Putty (1kg)', description: 'Water resistant smooth white wall putty', price: 40, unit: 'pack', stock: 80 },
      ],
    },
    {
      name: 'Karnataka Fashion & Textile Mart',
      category: 'Retail',
      location: 'Haveri Town',
      phone: '9845332211',
      email: 'karnataka.fashion@gmail.com',
      status: 'Approved',
      latitude: 14.797,
      longitude: 75.4015,
      address: 'MG Road, Near Gandhi Circle, Haveri - 581110',
      rating: 4.8,
      reviewCount: 260,
      products: [
        { name: 'Pure Cotton Formal Shirt', description: 'Breathable regular fit premium cotton', price: 699, unit: 'piece', stock: 45 },
        { name: 'Mens Slim Fit Denim Jeans', description: 'Stretchable durable indigo denim', price: 999, unit: 'piece', stock: 35 },
        { name: 'Traditional Mysore Silk Saree', description: 'Authentic zari border festive silk saree', price: 1499, unit: 'piece', stock: 20 },
        { name: 'Casual Cotton T-Shirt', description: 'Soft combed cotton round neck tee', price: 299, unit: 'piece', stock: 60 },
      ],
    },
    {
      name: 'Maruthi Automobile Spares & Lubes',
      category: 'Automobile',
      location: 'Haveri Bypass',
      phone: '9980445566',
      email: 'maruthi.spares@gmail.com',
      status: 'Approved',
      latitude: 14.793,
      longitude: 75.405,
      address: 'NH4 Bypass Road, Near APMC, Haveri - 581110',
      rating: 4.7,
      reviewCount: 190,
      products: [
        { name: 'Castrol Engine Oil 20W-40 (1L)', description: 'Superior engine protection for bikes & autos', price: 380, unit: 'bottle', stock: 50 },
        { name: 'Bosch Spark Plug (Pack of 2)', description: 'High performance iridium electrode plugs', price: 240, unit: 'pack', stock: 70 },
        { name: 'Tubeless Tyre Puncture Repair Kit', description: 'Heavy duty strip repair kit with tool', price: 180, unit: 'kit', stock: 40 },
        { name: 'Vehicle Microfiber Wash Sponge', description: 'Non-scratch foam washing pad', price: 75, unit: 'piece', stock: 80 },
      ],
    },
    {
      name: 'Apollo Pharmacy & Healthcare',
      category: 'Retail',
      location: 'Haveri Town',
      phone: '9448112255',
      email: 'apollo.haveri@gmail.com',
      status: 'Approved',
      latitude: 14.7955,
      longitude: 75.4005,
      address: 'Court Circle, PB Road, Haveri - 581110',
      rating: 4.9,
      reviewCount: 410,
      products: [
        { name: 'Digital Infrared Thermometer', description: 'Instant touchless forehead temperature scanner', price: 599, unit: 'piece', stock: 25 },
        { name: 'First Aid Medical Kit Box', description: 'Comprehensive antiseptic, bandage & burnol kit', price: 349, unit: 'kit', stock: 40 },
        { name: 'Hand Sanitizer 500ml (70% Alcohol)', description: 'Germ protection pump bottle', price: 120, unit: 'bottle', stock: 100 },
        { name: 'Omron BP Monitor Cuff', description: 'Accurate digital blood pressure monitor', price: 1499, unit: 'piece', stock: 15 },
      ],
    },
    {
      name: 'Annapoorna Organic Groceries & Spices',
      category: 'Grocery',
      location: 'Haveri Region',
      phone: '9731223344',
      email: 'annapoorna.hvr@gmail.com',
      status: 'Approved',
      latitude: 14.799,
      longitude: 75.3985,
      address: 'Vidyanagar Main Road, Haveri - 581110',
      rating: 4.8,
      reviewCount: 225,
      products: [
        { name: 'Organic Cold Pressed Groundnut Oil (1L)', description: 'Pure wood pressed unrefined cooking oil', price: 220, unit: 'bottle', stock: 40 },
        { name: 'Byadgi Red Chilli Powder (500g)', description: 'Famous vibrant red GI-tagged fragrant chilli', price: 180, unit: 'pack', stock: 75 },
        { name: 'Organic Jaggery Powder (1kg)', description: 'Chemical-free natural sugarcane sweetener', price: 95, unit: 'kg', stock: 60 },
        { name: 'Whole Cashew Nuts (500g)', description: 'Premium W320 grade crunchy whole nuts', price: 420, unit: 'pack', stock: 35 },
      ],
    },
  ];

  for (const shopItem of otherShopsData) {
    const existingShop = await prisma.shop.findFirst({
      where: { name: { contains: shopItem.name, mode: 'insensitive' } },
    });
    let sId = existingShop?.id;
    if (!existingShop) {
      const created = await prisma.shop.create({
        data: {
          name: shopItem.name,
          category: shopItem.category,
          location: shopItem.location,
          phone: shopItem.phone,
          email: shopItem.email,
          status: shopItem.status,
          latitude: shopItem.latitude,
          longitude: shopItem.longitude,
          address: shopItem.address,
          rating: shopItem.rating,
          reviewCount: shopItem.reviewCount,
        },
      });
      sId = created.id;
      console.log(`[Seed] Created shop ${shopItem.name}`);
    } else {
      await prisma.shop.update({
        where: { id: existingShop.id },
        data: {
          rating: shopItem.rating,
          reviewCount: shopItem.reviewCount,
          address: shopItem.address,
        },
      });
    }

    if (sId) {
      const pCount = await prisma.product.count({ where: { shopId: sId } });
      if (pCount === 0) {
        await prisma.product.createMany({
          data: shopItem.products.map((p) => ({
            shopId: sId!,
            name: p.name,
            description: p.description,
            price: p.price,
            unit: p.unit,
            stock: p.stock,
            isActive: true,
          })),
        });
        console.log(`[Seed] Seeded products for ${shopItem.name}`);
      }
    }
  }

  // 3. Seed Services
  console.log('[Seed] Checking Services...');
  const servicesList = [
    {
      title: 'Complete Bathroom & Pipe Leakage Repair',
      category: 'Plumbing',
      providerName: 'Ramesh Plumbing Works',
      phone: '9845112233',
      rating: 4.8,
      reviewCount: 245,
      priceLabel: '₹249 onwards',
      location: 'Haveri Town',
      description: 'Expert leak detection, pipe fixing, and sanitary fittings.',
      isAvailable: true,
    },
    {
      title: 'Home Electrical Rewiring & Short Circuit Fix',
      category: 'Electrician',
      providerName: 'Shiva Electrical Solutions',
      phone: '9980223344',
      rating: 4.9,
      reviewCount: 312,
      priceLabel: '₹199 onwards',
      location: 'Haveri Region',
      description: 'Certified wireman for fast switchboard, fan, and MCB installation.',
      isAvailable: true,
    },
    {
      title: 'Full House Deep Sanitization & Cleaning',
      category: 'Cleaning',
      providerName: 'CleanPro Services',
      phone: '9448334455',
      rating: 4.7,
      reviewCount: 189,
      priceLabel: '₹1,299 onwards',
      location: 'Haveri Region',
      description: 'Kitchen degreasing, bathroom scrubbing, and floor buffing.',
      isAvailable: true,
    },
    {
      title: 'Interior & Exterior Wall Painting',
      category: 'Painting',
      providerName: 'ColorCraft Home Painters',
      phone: '9731445566',
      rating: 4.8,
      reviewCount: 164,
      priceLabel: '₹12/sq.ft',
      location: 'Haveri Region',
      description: 'Waterproofing, putty finish, and premium Asian Paints coats.',
      isAvailable: true,
    },
    {
      title: 'Professional Men & Women Grooming at Home',
      category: 'Salon',
      providerName: 'Glamour Doorstep Salon',
      phone: '9123556677',
      rating: 4.9,
      reviewCount: 280,
      priceLabel: '₹299 onwards',
      location: 'Haveri Town',
      description: 'Haircut, facial, massage, and bridal makeover at your doorstep.',
      isAvailable: true,
    },
    {
      title: 'Custom Furniture Making & Wood Repair',
      category: 'Carpentry',
      providerName: 'Vishwakarma Wood Works',
      phone: '9880667788',
      rating: 4.8,
      reviewCount: 172,
      priceLabel: '₹349 onwards',
      location: 'Haveri Region',
      description: 'Door lock fixing, modular kitchen repair, and new teak furniture.',
      isAvailable: true,
    },
    {
      title: 'Handyman & General Appliance Maintenance',
      category: 'General',
      providerName: 'QuickFix Handyman',
      phone: '9449778899',
      rating: 4.7,
      reviewCount: 198,
      priceLabel: '₹149 onwards',
      location: 'Haveri Region',
      description: 'Drilling, curtain rod fitting, TV mounting, and minor fixes.',
      isAvailable: true,
    },
    {
      title: 'AC Repair, Servicing & Gas Refill',
      category: 'Electrician',
      providerName: 'CoolAir Experts',
      phone: '9448119900',
      rating: 4.9,
      reviewCount: 356,
      priceLabel: '₹399 onwards',
      location: 'Haveri Town',
      description: 'Deep coil jet wash, cooling gas top-up, and outdoor unit installation.',
      isAvailable: true,
    },
    {
      title: 'Water Purifier & RO Filter Maintenance',
      category: 'General',
      providerName: 'AquaPure Solutions',
      phone: '9731558822',
      rating: 4.8,
      reviewCount: 210,
      priceLabel: '₹299 onwards',
      location: 'Haveri Region',
      description: 'Complete filter replacement, TDS level testing, and pump servicing.',
      isAvailable: true,
    },
    {
      title: 'Washing Machine & Refrigerator Repair',
      category: 'General',
      providerName: 'ApplianceCare 24/7',
      phone: '9123447711',
      rating: 4.9,
      reviewCount: 295,
      priceLabel: '₹349 onwards',
      location: 'Haveri Region',
      description: 'PCB diagnosis, motor bearing fix, and cooling coil repair for home appliances.',
      isAvailable: true,
    },
    {
      title: 'Herbal Pest & Termite Control Treatment',
      category: 'Cleaning',
      providerName: 'SafeGuard Pest Pro',
      phone: '9980663322',
      rating: 4.8,
      reviewCount: 182,
      priceLabel: '₹799 onwards',
      location: 'Haveri Region',
      description: 'Eco-friendly odorless spray for cockroaches, bedbugs, termites, and mosquitoes.',
      isAvailable: true,
    },
    {
      title: 'Custom Local & On-Demand Labor Services',
      category: 'Others',
      providerName: 'CityLinks Verified Experts',
      phone: '09449084242',
      rating: 4.9,
      reviewCount: 150,
      priceLabel: 'Custom Quote',
      location: 'Haveri Region',
      description: 'Specialized home & business assistance for any custom request or repair task.',
      isAvailable: true,
    },
  ];

  for (const s of servicesList) {
    const existing = await prisma.service.findFirst({
      where: {
        AND: [
          { title: s.title },
          { providerName: s.providerName },
        ],
      },
    });
    if (!existing) {
      await prisma.service.create({ data: s });
      console.log(`[Seed] Seeded service: ${s.title}`);
    } else {
      await prisma.service.update({
        where: { id: existing.id },
        data: {
          rating: s.rating,
          reviewCount: s.reviewCount,
          priceLabel: s.priceLabel,
        },
      });
    }
  }

  // 4. Seed Transport Providers
  console.log('[Seed] Checking Transport Providers...');
  const transportList = [
    {
      name: 'Karthik R.',
      type: 'passenger',
      vehicleType: 'Normal Car',
      categoryCode: 'normal',
      phone: '9876543210',
      location: 'CityLinks Central Hub',
      fareLabel: '₹22/km + ₹40 base',
      eta: '2 min',
      rating: 4.8,
      ratePerKm: 22.0,
      baseFare: 40.0,
      driverPlate: 'KA 03 AB 1234',
      driverCar: 'White Toyota Corolla',
      isAvailable: true,
    },
    {
      name: 'Ramesh P.',
      type: 'passenger',
      vehicleType: 'Go Mini',
      categoryCode: 'go',
      phone: '9845112233',
      location: 'Haveri Town',
      fareLabel: '₹18/km + ₹30 base',
      eta: '5 min',
      rating: 4.7,
      ratePerKm: 18.0,
      baseFare: 30.0,
      driverPlate: 'KA 27 B 5678',
      driverCar: 'Silver Maruti WagonR',
      isAvailable: true,
    },
    {
      name: 'Suresh Kumar',
      type: 'passenger',
      vehicleType: 'XL SUV',
      categoryCode: 'xl',
      phone: '9988776655',
      location: 'Haveri & Outstation',
      fareLabel: '₹28/km + ₹60 base',
      eta: '8 min',
      rating: 4.9,
      ratePerKm: 28.0,
      baseFare: 60.0,
      driverPlate: 'KA 04 CD 9012',
      driverCar: 'Grey Toyota Innova',
      isAvailable: true,
    },
    {
      name: 'Manjunath H.',
      type: 'passenger',
      vehicleType: 'Auto Rickshaw',
      categoryCode: 'auto',
      phone: '9845114422',
      location: 'Haveri Bus Stand',
      fareLabel: '₹14/km + ₹25 base',
      eta: '6 min',
      rating: 4.8,
      ratePerKm: 14.0,
      baseFare: 25.0,
      driverPlate: 'KA 27 E 3456',
      driverCar: 'Bajaj RE Auto Rickshaw',
      isAvailable: true,
    },
    {
      name: 'Anand S.',
      type: 'passenger',
      vehicleType: 'Bike Taxi',
      categoryCode: 'bike',
      phone: '9980556633',
      location: 'Haveri Town',
      fareLabel: '₹8/km + ₹15 base',
      eta: '3 min',
      rating: 4.9,
      ratePerKm: 8.0,
      baseFare: 15.0,
      driverPlate: 'KA 27 H 7890',
      driverCar: 'Hero Splendor Plus',
      isAvailable: true,
    },
    {
      name: 'Mahalaxmi Logistics (Tata Ace)',
      type: 'commercial',
      vehicleType: 'Tata Ace',
      categoryCode: 'commercial',
      phone: '9731998811',
      location: 'Haveri Industrial Area',
      fareLabel: '₹40/km + ₹200 base',
      eta: '20–45 min',
      rating: 4.8,
      ratePerKm: 40.0,
      baseFare: 200.0,
      driverPlate: 'KA 27 C 8811',
      driverCar: 'Tata Ace Gold',
      isAvailable: true,
    },
    {
      name: 'Karnataka Freight (Pickup Truck)',
      type: 'commercial',
      vehicleType: 'Pickup Truck',
      categoryCode: 'commercial',
      phone: '9123445588',
      location: 'Haveri APMC Yard',
      fareLabel: '₹55/km + ₹300 base',
      eta: '30–60 min',
      rating: 4.7,
      ratePerKm: 55.0,
      baseFare: 300.0,
      driverPlate: 'KA 27 D 5588',
      driverCar: 'Mahindra Bolero Maxi Truck',
      isAvailable: true,
    },
  ];

  for (const t of transportList) {
    const existing = await prisma.transportProvider.findFirst({
      where: {
        name: t.name,
      },
    });
    if (!existing) {
      await prisma.transportProvider.create({ data: t });
      console.log(`[Seed] Seeded transport provider: ${t.name}`);
    } else {
      await prisma.transportProvider.update({
        where: { id: existing.id },
        data: {
          ratePerKm: t.ratePerKm,
          baseFare: t.baseFare,
          driverPlate: t.driverPlate,
          driverCar: t.driverCar,
          categoryCode: t.categoryCode,
          fareLabel: t.fareLabel,
        },
      });
    }
  }

  // 5. Seed Vehicle Categories
  console.log('[Seed] Checking Vehicle Categories...');
  const vehicleCategories = [
    { name: 'Auto Rickshaw', desc: 'Affordable short-distance rides', fare: '₹30–₹150', eta: '5–15 min', type: 'passenger', iconName: 'Car' },
    { name: 'Bike Taxi', desc: 'Quickest single passenger commute', fare: '₹20–₹100', eta: '3–10 min', type: 'passenger', iconName: 'Bike' },
    { name: 'Car', desc: 'Comfortable AC cabs for city & outstation', fare: '₹100–₹500', eta: '10–20 min', type: 'passenger', iconName: 'Car' },
    { name: 'Others', desc: 'Custom passenger requests & rentals', fare: 'Variable', eta: '15–30 min', type: 'passenger', iconName: 'MoreHorizontal' },
    { name: 'Tata Ace', desc: 'Mini truck for cartons, shifting & goods', fare: '₹299–₹999', eta: '20–45 min', type: 'commercial', iconName: 'Truck' },
    { name: 'Pickup Truck', desc: 'Heavy payload for agricultural & business loads', fare: '₹499–₹1,499', eta: '30–60 min', type: 'commercial', iconName: 'Truck' },
    { name: 'Tempo', desc: 'Large cargo truck for house shifting & bulk transport', fare: '₹999–₹2,999', eta: '45–90 min', type: 'commercial', iconName: 'Truck' },
    { name: 'Others', desc: 'Specialized machinery, tractors & custom freight', fare: 'Custom Quote', eta: 'Flexible', type: 'commercial', iconName: 'MoreHorizontal' },
  ];

  for (const vc of vehicleCategories) {
    const existing = await prisma.vehicleCategory.findFirst({
      where: {
        AND: [
          { name: vc.name },
          { type: vc.type },
        ],
      },
    });
    if (!existing) {
      await prisma.vehicleCategory.create({ data: vc });
      console.log(`[Seed] Seeded vehicle category: ${vc.name} (${vc.type})`);
    }
  }

  // 6. Seed Deals
  console.log('[Seed] Checking Deals...');
  const dealsList = [
    {
      title: 'Flat 25% Off on All Grocery & Essentials',
      discount: '25% OFF',
      category: 'Shopping',
      merchantName: 'Sri Lakshmi Supermarket',
      validUntil: 'Valid till end of month',
      linkUrl: '/shops',
      isActive: true,
    },
    {
      title: '50% Off First Home Deep Cleaning Service',
      discount: '50% OFF',
      category: 'Services',
      merchantName: 'CleanPro Services',
      validUntil: 'Limited time offer',
      linkUrl: '/services',
      isActive: true,
    },
    {
      title: 'Buy 1 Get 1 Free on Select Men & Women Salon Packages',
      discount: 'BOGO FREE',
      category: 'Salon',
      merchantName: 'Glamour Doorstep Salon',
      validUntil: 'Weekends only',
      linkUrl: '/services',
      isActive: true,
    },
    {
      title: 'Flat ₹50 Off on Any First Auto or Cab Booking',
      discount: 'FLAT ₹50 OFF',
      category: 'Transport',
      merchantName: 'CityLinks Rides',
      validUntil: 'Use code: FIRST50',
      linkUrl: '/book-transport',
      isActive: true,
    },
    {
      title: 'Up to 40% Off on Home Appliances & Electrical Repairs',
      discount: '40% OFF',
      category: 'Electronics',
      merchantName: 'Renuka Appliances',
      validUntil: 'Festive season deal',
      linkUrl: '/shops',
      isActive: true,
    },
  ];

  for (const d of dealsList) {
    const existing = await prisma.deal.findFirst({
      where: { title: d.title },
    });
    if (!existing) {
      await prisma.deal.create({ data: d });
      console.log(`[Seed] Seeded deal: ${d.title}`);
    }
  }

  // 7. Seed Digital Services
  console.log('[Seed] Checking Digital Services...');
  const digitalServicesList = [
    { name: 'Website Creation', iconName: 'Globe', color: '#2563eb', badge: 'Instant', desc: 'Modern & fast websites' },
    { name: 'Blog & Content writing', iconName: 'FileText', color: '#d97706', badge: 'SEO Ready', desc: 'Articles, blogs & copy' },
    { name: 'Poster & Social media Creatives', iconName: 'Palette', color: '#7c3aed', badge: null, desc: 'Posters, banners & posts' },
    { name: 'Local & Targeted Ads', iconName: 'Target', color: '#059669', badge: 'High ROI', desc: 'Google & Meta local ads' },
    { name: 'website hosting & Support', iconName: 'Server', color: '#0891b2', badge: null, desc: 'Domains, SSL & 24/7 care' },
    { name: 'Ad campaingn setup & management', iconName: 'TrendingUp', color: '#db2777', badge: 'Assisted', desc: 'Turnkey ad campaigns' },
    { name: 'Influencer collaboration', iconName: 'Users', color: '#4f46e5', badge: null, desc: 'Connect with local creators' },
    { name: 'local business promotion', iconName: 'Megaphone', color: '#0d9488', badge: null, desc: 'Boost local visibility' },
    { name: 'Others', iconName: 'MoreHorizontal', color: '#64748b', badge: 'Custom', desc: 'App development, video editing & other digital requests' },
  ];

  for (const ds of digitalServicesList) {
    const existing = await prisma.digitalService.findFirst({
      where: { name: { equals: ds.name, mode: 'insensitive' } },
    });
    if (!existing) {
      await prisma.digitalService.create({ data: { ...ds, isActive: true } });
      console.log(`[Seed] Seeded digital service: ${ds.name}`);
    }
  }

  // 8. Seed Digital Service Providers
  console.log('[Seed] Checking Digital Service Providers...');
  const digitalProvidersList = [
    {
      name: 'Rohit Tech & Web Solutions',
      serviceType: 'Website Creation',
      phone: '9845112244',
      rating: 4.9,
      priceLabel: '₹2,999 onwards',
      location: 'Haveri Town',
      description: 'Full-stack web developer building mobile-first modern business websites & e-commerce.',
      isAvailable: true,
      badge: 'Top Rated',
    },
    {
      name: 'PixelCraft Creatives',
      serviceType: 'Poster & Social media Creatives',
      phone: '9980556677',
      rating: 4.8,
      priceLabel: '₹199 / creative',
      location: 'Haveri Region',
      description: 'Graphic designer delivering eye-catching festive banners, Instagram reels & marketing flyers.',
      isAvailable: true,
      badge: 'Verified',
    },
    {
      name: 'Kiran Content & SEO Studio',
      serviceType: 'Blog & Content writing',
      phone: '9448778899',
      rating: 4.9,
      priceLabel: '₹499 / article',
      location: 'Haveri Region',
      description: 'Expert copywriter specialized in SEO ranking blogs, product reviews & brand storytelling.',
      isAvailable: true,
      badge: 'Popular',
    },
    {
      name: 'CityGrowth Local Ads Agency',
      serviceType: 'Local & Targeted Ads',
      phone: '9731445522',
      rating: 4.8,
      priceLabel: '₹999 setup',
      location: 'Haveri Region',
      description: 'Certified Google & Meta ad specialist driving real walk-in customers and high-ROI leads.',
      isAvailable: true,
      badge: 'High ROI',
    },
    {
      name: 'CloudVibe Hosting & Maintenance',
      serviceType: 'website hosting & Support',
      phone: '9123887766',
      rating: 4.7,
      priceLabel: '₹399 / mo',
      location: 'Haveri Region',
      description: 'Fast cloud server setup, custom domain mapping, free SSL certificate & 24/7 technical monitoring.',
      isAvailable: true,
      badge: '24/7 Care',
    },
    {
      name: 'Apex Brand & Campaign Managers',
      serviceType: 'Ad campaingn setup & management',
      phone: '9632114455',
      rating: 4.8,
      priceLabel: '₹1,499 setup',
      location: 'Haveri Region',
      description: 'End-to-end management for promotional blitzes, sales events, and festive offers.',
      isAvailable: true,
      badge: 'Turnkey',
    },
    {
      name: 'Regional Creator Network',
      serviceType: 'Influencer collaboration',
      phone: '9886332211',
      rating: 4.9,
      priceLabel: '₹1,999 onwards',
      location: 'Karnataka / Haveri',
      description: 'Connecting local retail stores and restaurants with top regional video creators and influencers.',
      isAvailable: true,
      badge: 'Trending',
    },
    {
      name: 'Haveri Local Listing & Review Boost',
      serviceType: 'local business promotion',
      phone: '9741556633',
      rating: 4.9,
      priceLabel: '₹499 one-time',
      location: 'Haveri Town',
      description: 'Google Maps rank booster, 5-star review acquisition strategies, and local business directory setup.',
      isAvailable: true,
      badge: 'Verified',
    },
    {
      name: 'SmartCode Custom IT Solutions',
      serviceType: 'Others',
      phone: '9845998877',
      rating: 4.8,
      priceLabel: 'Custom Quote',
      location: 'Haveri Region',
      description: 'Android/iOS app development, billing software integration, video editing & custom digital tasks.',
      isAvailable: true,
      badge: 'Specialist',
    },
  ];

  for (const dp of digitalProvidersList) {
    const existing = await prisma.digitalServiceProvider.findFirst({
      where: {
        AND: [
          { name: dp.name },
          { serviceType: dp.serviceType },
        ],
      },
    });
    if (!existing) {
      await prisma.digitalServiceProvider.create({ data: dp });
      console.log(`[Seed] Seeded digital provider: ${dp.name}`);
    }
  }

  // 9. Seed Category Tiles
  console.log('[Seed] Checking Category Tiles...');
  const categoryTilesList = [
    { name: 'Transport', type: 'service_tile', color: '#8b5cf6', iconName: 'Car' },
    { name: 'Moving', type: 'service_tile', color: '#14b8a6', iconName: 'Truck' },
    { name: 'Plumbing', type: 'service_tile', color: '#3b82f6', iconName: 'Wrench' },
    { name: 'Electrician', type: 'service_tile', color: '#eab308', iconName: 'Zap' },
    { name: 'Painting', type: 'service_tile', color: '#f97316', iconName: 'PaintBucket' },
    { name: 'Carpentry', type: 'service_tile', color: '#d97706', iconName: 'Home' },
    { name: 'Salon', type: 'service_tile', color: '#ec4899', iconName: 'Scissors' },
    { name: 'Cleaning', type: 'service_tile', color: '#10b981', iconName: 'Sparkles' },
    { name: 'Apparel', type: 'shop_category', color: '#ec4899', iconName: 'Scissors' },
    { name: 'Automobile', type: 'shop_category', color: '#64748b', iconName: 'Car' },
    { name: 'Electronics', type: 'shop_category', color: '#6366f1', iconName: 'Zap' },
    { name: 'Groceries', type: 'shop_category', color: '#22c55e', iconName: 'ShoppingBag' },
  ];

  for (const ct of categoryTilesList) {
    const existing = await prisma.categoryTile.findFirst({
      where: {
        AND: [
          { name: ct.name },
          { type: ct.type },
        ],
      },
    });
    if (!existing) {
      await prisma.categoryTile.create({ data: ct });
      console.log(`[Seed] Seeded category tile: ${ct.name}`);
    }
  }

  // 10. Seed Featured Services (8 items for 2 pages of 4 items each)
  console.log('[Seed] Checking Featured Services...');
  const featuredServicesList = [
    { name: 'AC Repair & Service', provider: 'CoolAir Experts', rating: 4.8, reviews: 234, price: '₹399', emoji: '🧊', tag: 'Top Rated' },
    { name: 'Home Deep Cleaning', provider: 'SparkleClean Pro', rating: 4.7, reviews: 189, price: '₹999', emoji: '✨', tag: 'Popular' },
    { name: 'Electrician Visit', provider: 'PowerFix Hub', rating: 4.9, reviews: 312, price: '₹199', emoji: '⚡', tag: 'Trending' },
    { name: 'Plumbing Repair', provider: 'PipeMaster', rating: 4.6, reviews: 156, price: '₹249', emoji: '🔧', tag: 'Best Value' },
    { name: 'Sofa & Carpet Cleaning', provider: 'FreshHome Living', rating: 4.8, reviews: 145, price: '₹499', emoji: '🛋️', tag: 'Popular' },
    { name: 'Water Purifier Service', provider: 'AquaPure Solutions', rating: 4.7, reviews: 198, price: '₹299', emoji: '💧', tag: 'Verified' },
    { name: 'Washing Machine Repair', provider: 'ApplianceCare 24/7', rating: 4.9, reviews: 210, price: '₹349', emoji: '🧺', tag: 'Top Rated' },
    { name: 'Pest Control Treatment', provider: 'SafeGuard Pest Pro', rating: 4.8, reviews: 167, price: '₹799', emoji: '🛡️', tag: 'Trending' },
  ];

  for (const fs of featuredServicesList) {
    const existing = await prisma.featuredService.findFirst({
      where: { name: fs.name },
    });
    if (!existing) {
      await prisma.featuredService.create({ data: fs });
      console.log(`[Seed] Seeded featured service: ${fs.name}`);
    }
  }

  // 11. Seed Marketplace Items (Popular items - 12 items for 3 pages of 4 items each)
  console.log('[Seed] Checking Marketplace Items...');
  const marketplaceItemsList = [
    {
      entity_type: 'product',
      entity_id: 'nut-bolt-set',
      title: 'M8 Nut & Hex Bolt Set',
      subtitle: 'Corrosion resistant steel hardware from Renuka Appliances',
      link_url: '/shops',
      badge: 'Bestseller',
      price_label: '₹1 onwards',
      popularity: 320,
    },
    {
      entity_type: 'service',
      entity_id: 'serv-1',
      title: 'Full Home Deep Cleaning',
      subtitle: 'Top-rated verified professionals at your doorstep',
      link_url: '/services',
      badge: 'Top Rated',
      price_label: '₹1,499',
      popularity: 290,
    },
    {
      entity_type: 'transport',
      entity_id: 'trans-1',
      title: 'Instant City Auto / Cab',
      subtitle: 'Quick doorstep pickup with zero surge pricing',
      link_url: '/book-transport',
      badge: 'Instant',
      price_label: '₹49 onwards',
      popularity: 280,
    },
    {
      entity_type: 'shop',
      entity_id: 'renuka-appliances',
      title: 'Renuka Appliances',
      subtitle: 'Electricals, hardware, switches & appliances in Haveri',
      link_url: '/shops',
      badge: 'Nearby',
      price_label: null,
      popularity: 275,
    },
    {
      entity_type: 'service',
      entity_id: 'serv-2',
      title: 'Emergency Electrician & Wiring',
      subtitle: 'On-demand certified electrician within 20 mins',
      link_url: '/services',
      badge: 'Fast 20m',
      price_label: '₹199',
      popularity: 240,
    },
    {
      entity_type: 'shop',
      entity_id: 'sri-lakshmi-supermarket',
      title: 'Sri Lakshmi Supermarket',
      subtitle: 'Grocery, daily essentials & organic food staples',
      link_url: '/shops',
      badge: 'Popular',
      price_label: null,
      popularity: 230,
    },
    {
      entity_type: 'product',
      entity_id: 'led-bulb-9w',
      title: 'LED Bulb 9W Cool White',
      subtitle: 'Energy-efficient high lumen bulb from Renuka Appliances',
      link_url: '/shops',
      badge: 'Eco',
      price_label: '₹89',
      popularity: 210,
    },
    {
      entity_type: 'transport',
      entity_id: 'trans-2',
      title: 'Mini Truck Goods Delivery (Tata Ace)',
      subtitle: 'Tata Ace & Pickup for house shifting & cargo freight',
      link_url: '/book-transport',
      badge: 'Heavy',
      price_label: '₹299 onwards',
      popularity: 195,
    },
    {
      entity_type: 'service',
      entity_id: 'digital-web-create',
      title: 'Modern Business Website Creation',
      subtitle: 'Mobile-responsive digital presence for local businesses',
      link_url: '/digital-services',
      badge: 'Digital',
      price_label: '₹2,999',
      popularity: 185,
    },
    {
      entity_type: 'product',
      entity_id: 'fast-usbc-cable',
      title: '65W Fast USB-C Cable (1m)',
      subtitle: 'Braided long-life cable from City Digital Hub',
      link_url: '/shops',
      badge: 'Trending',
      price_label: '₹199',
      popularity: 175,
    },
    {
      entity_type: 'service',
      entity_id: 'pipe-leakage-fix',
      title: 'Bathroom Leakage & Pipe Repair',
      subtitle: 'Certified plumbers from Ramesh Plumbing Works',
      link_url: '/services',
      badge: 'Verified',
      price_label: '₹249',
      popularity: 160,
    },
    {
      entity_type: 'transport',
      entity_id: 'rapid-moto',
      title: 'Rapid Moto Bike Taxi',
      subtitle: 'Beat city traffic with ultra-fast single passenger rides',
      link_url: '/book-transport',
      badge: 'Fast',
      price_label: '₹20 onwards',
      popularity: 155,
    },
  ];

  for (const m of marketplaceItemsList) {
    const existing = await prisma.marketplaceItem.findFirst({
      where: { title: m.title },
    });
    if (!existing) {
      await prisma.marketplaceItem.create({ data: m });
      console.log(`[Seed] Seeded marketplace item: ${m.title}`);
    }
  }

  // 12. Seed Notifications sent by Super Admin
  const sampleNotifications = [
    {
      title: '🎉 Welcome to CityLinks!',
      message: 'Find trusted local stores, book verified home services, and shop products in your neighbourhood with doorstep delivery.',
      type: 'promo',
      isRead: false,
    },
    {
      title: '⚡ Weekend Special: 15% Off Services',
      message: 'Super Admin has approved discount vouchers across all Electrician, AC Repair, and Plumbing services this weekend!',
      type: 'promo',
      isRead: false,
    },
    {
      title: '📦 New Stores Added Near You',
      message: 'Check out Sri Renuka Home Appliances and City Digital Hub for electronics, kitchenware, and daily essentials.',
      type: 'info',
      isRead: false,
    },
    {
      title: '🔔 Live Cart & Orders are Ready',
      message: 'Add items from your favorite neighbourhood stores directly to your cart and track purchases in real-time.',
      type: 'info',
      isRead: false,
    },
  ];

  for (const n of sampleNotifications) {
    const existing = await prisma.notification.findFirst({
      where: { title: n.title },
    });
    if (!existing) {
      await prisma.notification.create({
        data: {
          title: n.title,
          message: n.message,
          type: n.type,
          isRead: n.isRead,
          userId: null, // Broadcast to all users
        },
      });
      console.log(`[Seed] Seeded notification: ${n.title}`);
    }
  }

  console.log('[Seed] Database seeding completed successfully! All data is populated in PostgreSQL.');
}

// Execute directly
seedAll()
  .catch((e) => {
    console.error('[Seed Error]:', e);
    process.exit(1);
  })
  .then(async () => {
    await prisma.$disconnect();
  });
