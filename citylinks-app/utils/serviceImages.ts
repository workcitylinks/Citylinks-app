/**
 * Curated high-resolution visual imagery for Manual Services and Digital Specialists.
 * If user uploaded custom image (imageUrl or image), use that.
 * If user forgot to upload or image is absent, automatically fallback to category demo image.
 */

export const DEMO_MANUAL_SERVICE_FALLBACK =
  'https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=1000&q=80';

export const DEMO_DIGITAL_SERVICE_FALLBACK =
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1000&q=80';

export const getManualServiceCoverImage = (service?: {
  category?: string | null;
  title?: string | null;
  image?: string | null;
  imageUrl?: string | null;
}): string => {
  // 1. If provider uploaded custom image, prioritize it
  const customImg = (service?.imageUrl || service?.image || '').trim();
  if (customImg.length > 0) {
    return customImg;
  }

  const cat = (service?.category || '').toLowerCase();
  const title = (service?.title || '').toLowerCase();

  // Water Purifier, RO Filter, Aqua systems
  if (
    cat.includes('purif') ||
    cat.includes('water') ||
    cat.includes('filter') ||
    title.includes('purif') ||
    title.includes('water') ||
    title.includes('ro ') ||
    title.includes('ro-') ||
    title.includes('filter') ||
    title.includes('aqua')
  ) {
    return 'https://images.unsplash.com/photo-1542013936693-884638332954?w=1000&q=80';
  }

  // Plumbing & Sanitary
  if (
    cat.includes('plumb') ||
    title.includes('plumb') ||
    title.includes('pipe') ||
    title.includes('tap') ||
    title.includes('leak') ||
    title.includes('drain')
  ) {
    return 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=1000&q=80';
  }

  // Electrician & Wiring
  if (
    cat.includes('elect') ||
    title.includes('elect') ||
    title.includes('wir') ||
    title.includes('fuse') ||
    title.includes('light') ||
    title.includes('switch') ||
    title.includes('inverter')
  ) {
    return 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1000&q=80';
  }

  // Cleaning, Washing & Pest Control
  if (
    cat.includes('clean') ||
    cat.includes('pest') ||
    title.includes('clean') ||
    title.includes('pest') ||
    title.includes('wash') ||
    title.includes('deep clean')
  ) {
    return 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1000&q=80';
  }

  // Painting & Whitewash
  if (
    cat.includes('paint') ||
    title.includes('paint') ||
    title.includes('color') ||
    title.includes('wall') ||
    title.includes('texture')
  ) {
    return 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=1000&q=80';
  }

  // Carpentry & Furniture Woodwork
  if (
    cat.includes('carpent') ||
    title.includes('carpent') ||
    title.includes('wood') ||
    title.includes('furnitur') ||
    title.includes('door') ||
    title.includes('cupboard')
  ) {
    return 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1000&q=80';
  }

  // Salon, Grooming & Beauty
  if (
    cat.includes('salon') ||
    cat.includes('beauty') ||
    title.includes('hair') ||
    title.includes('salon') ||
    title.includes('makeup') ||
    title.includes('spa') ||
    title.includes('facial')
  ) {
    return 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1000&q=80';
  }

  // Home Appliances (Fridge, AC, Washing Machine, Microwave)
  if (
    cat.includes('appliance') ||
    title.includes('fridge') ||
    title.includes('refrigerator') ||
    title.includes('washing') ||
    title.includes('ac ') ||
    title.includes('air conditioner') ||
    title.includes('cooler') ||
    title.includes('tv') ||
    title.includes('microwave') ||
    title.includes('oven')
  ) {
    return 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1000&q=80';
  }

  // Mechanics, Bikes & Automotive Repair
  if (
    cat.includes('mechanic') ||
    cat.includes('vehicle') ||
    title.includes('bike') ||
    title.includes('car') ||
    title.includes('auto') ||
    title.includes('repair') ||
    title.includes('motor')
  ) {
    return 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=1000&q=80';
  }

  // Default verified general service demo image
  return DEMO_MANUAL_SERVICE_FALLBACK;
};

export const getDigitalServiceCoverImage = (provider?: {
  serviceType?: string | null;
  name?: string | null;
  image?: string | null;
  imageUrl?: string | null;
}): string => {
  // 1. If provider uploaded custom image, prioritize it
  const customImg = (provider?.imageUrl || provider?.image || '').trim();
  if (customImg.length > 0) {
    return customImg;
  }

  const type = (provider?.serviceType || '').toLowerCase();
  const name = (provider?.name || '').toLowerCase();

  if (type.includes('web') || type.includes('site') || name.includes('web') || name.includes('dev')) {
    return 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1000&q=80';
  }
  if (type.includes('poster') || type.includes('social') || type.includes('creative') || type.includes('graphic') || name.includes('design')) {
    return 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=1000&q=80';
  }
  if (type.includes('blog') || type.includes('content') || type.includes('writing') || type.includes('article')) {
    return 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1000&q=80';
  }
  if (type.includes('ad') || type.includes('marketing') || type.includes('seo') || type.includes('targeted')) {
    return 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1000&q=80';
  }
  if (type.includes('host') || type.includes('server') || type.includes('cloud') || type.includes('support')) {
    return 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1000&q=80';
  }
  if (type.includes('app') || type.includes('android') || type.includes('ios') || type.includes('mobile')) {
    return 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=1000&q=80';
  }
  if (type.includes('video') || type.includes('edit') || type.includes('animation') || type.includes('film')) {
    return 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=1000&q=80';
  }
  if (type.includes('tax') || type.includes('ca') || type.includes('consult') || type.includes('gst') || type.includes('audit')) {
    return 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1000&q=80';
  }

  // Default digital specialist demo image
  return DEMO_DIGITAL_SERVICE_FALLBACK;
};
