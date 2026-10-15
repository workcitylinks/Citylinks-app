import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { Role } from '@prisma/client';
import { createAndSendNotification } from '../services/notificationService';

const router = Router();

// Allowed roles for joining: Shop Keeper (MERCHANT), Manual Service Provider, Digital Service Provider, Transport (TRANSPORT)
// SUPER_ADMIN and DEVELOPER are strictly disallowed
const ALLOWED_JOIN_ROLES: Role[] = [
  Role.MERCHANT,
  Role.MANUAL_SERVICE_PROVIDER,
  Role.DIGITAL_SERVICE_PROVIDER,
  Role.TRANSPORT,
];

// Helper function for role display name
const getRoleDisplayName = (r: Role) => {
  switch (r) {
    case Role.MERCHANT:
      return 'Shop Keeper';
    case Role.MANUAL_SERVICE_PROVIDER:
      return 'Manual Service Provider';
    case Role.DIGITAL_SERVICE_PROVIDER:
      return 'Digital Service Provider';
    case Role.TRANSPORT:
      return 'Transport';
    default:
      return String(r);
  }
};

/**
 * POST /api/join-requests
 * Submit a request to join CityLinks
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Please sign in to submit a join request.' });
    }

    const {
      shopName,
      description,
      role,
      serviceType,
      customService,
      location,
      phone,
      email,
      imageUrl,
      drivingLicense,
      drivingLicensePhoto,
      aadhaarNumber,
      aadhaarPhoto,
      vehiclePlate,
      vehicleModel,
      vehicleType,
      ratePerKm,
      baseFare,
      vehicles,
      vehiclesJson,
    } = req.body;

    if (!shopName || !shopName.trim()) {
      return res.status(400).json({
        error: role === Role.TRANSPORT ? 'Please enter driver full name.' : 'Please enter the name of the shop or business.',
      });
    }

    const effectiveDesc = (description && description.trim()) 
      ? description.trim() 
      : (role === Role.TRANSPORT ? `Transport & taxi service operator based in ${location || 'Haveri'}` : '');

    if (!effectiveDesc) {
      return res.status(400).json({ error: 'Please provide a description of your services or goods.' });
    }

    if (!role || !ALLOWED_JOIN_ROLES.includes(role as Role)) {
      return res.status(400).json({
        error: 'Invalid role selected. Allowed choices: Shop Keeper, Manual Service Provider, Digital Service Provider, or Transport.',
      });
    }

    if (!location || !location.trim()) {
      return res.status(400).json({ error: 'Please specify your location or address.' });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'Please provide a valid contact phone number.' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Please provide a valid contact email.' });
    }

    const roleEnum = role as Role;
    const roleName = getRoleDisplayName(roleEnum);

    // 1. Check if user is already verified/active in this role
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (currentUser?.role === roleEnum) {
      return res.status(400).json({
        error: `Your account is already active as a ${roleName}. You cannot apply for the same position again.`,
      });
    }

    // 2. Check if this user already applied for this opening/role (PENDING or APPROVED)
    const existingUserRoleRequest = await prisma.joinRequest.findFirst({
      where: {
        userId,
        role: roleEnum,
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });
    if (existingUserRoleRequest) {
      const statusDesc = existingUserRoleRequest.status === 'APPROVED' ? 'already approved' : 'currently pending review';
      return res.status(400).json({
        error: `You already have an application for the "${roleName}" opening that is ${statusDesc}. A single provider cannot apply for the same position more than once.`,
      });
    }

    // 3. Check if a company or shop with the same name has already applied for this opening (case-insensitive)
    const existingShopRequest = await prisma.joinRequest.findFirst({
      where: {
        shopName: { equals: shopName.trim(), mode: 'insensitive' },
        role: roleEnum,
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });
    if (existingShopRequest) {
      const statusDesc = existingShopRequest.status === 'APPROVED' ? 'already approved' : 'currently pending review';
      return res.status(400).json({
        error: `An application for "${shopName.trim()}" for the "${roleName}" opening is ${statusDesc}. A single company, shop, or service provider cannot apply for the same position more than once.`,
      });
    }

    // 4. Check if the contact phone or email has already applied for this opening
    const existingContact = await prisma.joinRequest.findFirst({
      where: {
        role: roleEnum,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          { phone: phone.trim() },
          { email: { equals: email.trim(), mode: 'insensitive' } },
        ],
      },
    });
    if (existingContact) {
      const statusDesc = existingContact.status === 'APPROVED' ? 'already approved' : 'currently pending review';
      return res.status(400).json({
        error: `An application using this contact phone or email for the "${roleName}" position is ${statusDesc}. Duplicate applications for the same opening are strictly not permitted.`,
      });
    }

    // If Service Provider, validate service type
    const isServiceProvider =
      role === Role.MANUAL_SERVICE_PROVIDER ||
      role === Role.DIGITAL_SERVICE_PROVIDER;

    if (isServiceProvider && !serviceType) {
      return res.status(400).json({
        error: 'Please select the type of service you provide.',
      });
    }

    // If Shop Keeper (MERCHANT), validate and register category
    const finalCategory = (serviceType || 'Retail').trim();
    if (role === Role.MERCHANT) {
      if (customService && customService.trim()) {
        const customCat = customService.trim();
        // Register custom category in CategoryTile if not exists
        const existingTile = await prisma.categoryTile.findFirst({
          where: {
            name: { equals: customCat, mode: 'insensitive' },
            type: 'shop_category',
          },
        });
        if (!existingTile) {
          await prisma.categoryTile.create({
            data: {
              name: customCat,
              type: 'shop_category',
              color: '#ea580c',
              iconName: 'Store',
            },
          });
        }
      }
    }

    // Process transport multi-vehicle data if applicable
    let finalVehiclesJson: string | null = null;
    let primaryType = vehicleType ? String(vehicleType).trim() : null;
    let primaryModel = vehicleModel ? String(vehicleModel).trim() : null;
    let primaryPlate = vehiclePlate ? String(vehiclePlate).trim().toUpperCase() : null;
    let primaryRate = ratePerKm ? parseFloat(ratePerKm) : null;
    let primaryBase = baseFare ? parseFloat(baseFare) : null;

    if (role === Role.TRANSPORT) {
      if (Array.isArray(vehicles) && vehicles.length > 0) {
        const cleanVehicles = vehicles.slice(0, 3).map((v: any, index: number) => ({
          vehicleType: (v.vehicleType === 'Other' && v.customVehicleType ? v.customVehicleType : v.vehicleType) || 'Car',
          modelName: v.modelName || `Commercial Vehicle ${index + 1}`,
          plateNumber: (v.plateNumber || '').toUpperCase().trim(),
          ratePerKm: parseFloat(v.ratePerKm) || 20.0,
          baseFare: parseFloat(v.baseFare) || 30.0,
          isPrimary: index === 0,
        }));
        finalVehiclesJson = JSON.stringify(cleanVehicles);
        const v1 = cleanVehicles[0];
        primaryType = v1.vehicleType;
        primaryModel = v1.modelName;
        primaryPlate = v1.plateNumber;
        primaryRate = v1.ratePerKm;
        primaryBase = v1.baseFare;
      } else if (vehiclesJson) {
        finalVehiclesJson = typeof vehiclesJson === 'string' ? vehiclesJson : JSON.stringify(vehiclesJson);
      }
    }

    // Create the join request
    const joinRequest = await prisma.joinRequest.create({
      data: {
        userId,
        shopName: shopName.trim(),
        description: effectiveDesc,
        role: role as Role,
        serviceType: role === Role.MERCHANT 
          ? (customService && customService.trim() ? customService.trim() : finalCategory)
          : (serviceType ? serviceType.trim() : null),
        customService: customService ? customService.trim() : null,
        location: location.trim(),
        phone: phone.trim(),
        email: email.trim(),
        imageUrl: imageUrl ? imageUrl.trim() : null,
        drivingLicense: drivingLicense ? String(drivingLicense).trim().toUpperCase() : null,
        drivingLicensePhoto: drivingLicensePhoto ? String(drivingLicensePhoto).trim() : null,
        aadhaarNumber: aadhaarNumber ? String(aadhaarNumber).trim() : null,
        aadhaarPhoto: aadhaarPhoto ? String(aadhaarPhoto).trim() : null,
        vehiclePlate: primaryPlate,
        vehicleModel: primaryModel,
        vehicleType: primaryType,
        ratePerKm: primaryRate,
        baseFare: primaryBase,
        vehiclesJson: finalVehiclesJson,
        status: 'PENDING',
      },
    });

    // Notify Super Admins with real-time Push Notification
    await createAndSendNotification({
      userId: null,
      department: 'SUPER_ADMIN',
      title: '📥 New Join Request Received',
      message: `${shopName} requested to join as ${roleName}. Please review in the Super Admin Dashboard.`,
      type: 'admin_only',
      route: '/admin-approvals',
    });

    return res.status(201).json({
      success: true,
      message: 'Join request submitted successfully. Awaiting Super Admin approval.',
      joinRequest,
    });
  } catch (error: any) {
    console.error('Error submitting join request:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit join request.' });
  }
});

/**
 * GET /api/join-requests/my-status
 * Check current user's join requests & applied roles
 */
router.get('/my-status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const allRequests = await prisma.joinRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const latest = allRequests[0] || null;
    const appliedRoles = allRequests
      .filter((r) => r.status === 'PENDING' || r.status === 'APPROVED')
      .map((r) => r.role);

    return res.json({
      joinRequest: latest,
      allRequests,
      appliedRoles,
    });
  } catch (error: any) {
    console.error('Error fetching my join request status:', error);
    return res.status(500).json({ error: 'Failed to fetch status.' });
  }
});

/**
 * GET /api/join-requests
 * Retrieve all join requests (for Super Admin dashboard)
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = req.query.status as string | undefined;

    const whereClause: any = {};
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    const requests = await prisma.joinRequest.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(requests);
  } catch (error: any) {
    console.error('Error fetching join requests:', error);
    return res.status(500).json({ error: 'Failed to fetch join requests.' });
  }
});

/**
 * PATCH /api/join-requests/:id/approve
 * Super admin approves a join request.
 * Converts the user to the requested role!
 */
router.patch('/:id/approve', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const request = await prisma.joinRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!request) {
      return res.status(404).json({ error: 'Join request not found.' });
    }

    if (request.status === 'APPROVED') {
      return res.status(400).json({ error: 'This request is already approved.' });
    }

    // 1. Update JoinRequest status
    const updatedRequest = await prisma.joinRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
      },
    });

    // 2. CONVERT THE USER TO THE REQUESTED ROLE IN DB
    const updatedUser = await prisma.user.update({
      where: { id: request.userId },
      data: {
        role: request.role,
      },
    });

    // 3. If role is MERCHANT, ensure Shop is created/listed with the chosen category
    if (request.role === Role.MERCHANT) {
      const existingShop = await prisma.shop.findFirst({
        where: { name: request.shopName },
      });

      const shopCategory = request.serviceType || 'Retail';

      // Also ensure CategoryTile exists so it appears in filters
      const existingTile = await prisma.categoryTile.findFirst({
        where: {
          name: { equals: shopCategory, mode: 'insensitive' },
          type: 'shop_category',
        },
      });
      if (!existingTile) {
        await prisma.categoryTile.create({
          data: {
            name: shopCategory,
            type: 'shop_category',
            color: '#ea580c',
            iconName: 'Store',
          },
        });
      }

      if (!existingShop) {
        await prisma.shop.create({
          data: {
            name: request.shopName,
            category: shopCategory,
            location: request.location,
            phone: request.phone,
            email: request.email,
            status: 'Approved',
            address: request.location,
            imageUrl: request.imageUrl || null,
            isPopular: true,
            isFeatured: false,
          },
        });
      } else {
        await prisma.shop.update({
          where: { id: existingShop.id },
          data: {
            category: shopCategory,
            location: request.location,
            address: request.location,
            phone: request.phone,
            email: request.email,
            status: 'Approved',
            imageUrl: request.imageUrl || existingShop.imageUrl,
          },
        });
      }
    }

    // 3b. If role is TRANSPORT, create or activate TransportProvider & up to 3 registered vehicles
    if (request.role === Role.TRANSPORT) {
      if (request.aadhaarNumber) {
        await prisma.user.updateMany({
          where: { id: request.userId },
          data: { aadhaarNumber: request.aadhaarNumber },
        });
      }

      const existingDriver = await prisma.transportProvider.findFirst({
        where: { OR: [{ userId: request.userId }, { phone: request.phone }] },
      });

      const vehicleType = request.vehicleType || 'Car';
      const vehicleModel = request.vehicleModel || request.shopName || 'White Toyota Corolla';
      const vehiclePlate = request.vehiclePlate || 'KA 27 M 4589';
      const ratePerKm = request.ratePerKm || 20.0;
      const baseFare = request.baseFare || 30.0;

      let driverRecord = existingDriver;
      if (!driverRecord) {
        driverRecord = await prisma.transportProvider.create({
          data: {
            userId: request.userId,
            name: request.shopName,
            phone: request.phone,
            location: request.location,
            drivingLicense: request.drivingLicense || null,
            drivingLicensePhoto: request.drivingLicensePhoto || null,
            aadhaarNumber: request.aadhaarNumber || null,
            aadhaarPhoto: request.aadhaarPhoto || null,
            vehicleType,
            driverCar: vehicleModel,
            driverPlate: vehiclePlate,
            categoryCode: 'normal',
            ratePerKm,
            baseFare,
            type: 'passenger',
            fareLabel: `₹${ratePerKm}/km + ₹${baseFare} base`,
            eta: '2–5 min',
            isAvailable: true,
            latitude: 14.7968,
            longitude: 75.401,
          },
        });
      } else {
        await prisma.transportProvider.update({
          where: { id: driverRecord.id },
          data: {
            userId: request.userId,
            name: request.shopName,
            isAvailable: true,
            drivingLicense: request.drivingLicense || driverRecord.drivingLicense,
            drivingLicensePhoto: request.drivingLicensePhoto || driverRecord.drivingLicensePhoto,
            aadhaarNumber: request.aadhaarNumber || driverRecord.aadhaarNumber,
            aadhaarPhoto: request.aadhaarPhoto || driverRecord.aadhaarPhoto,
            vehicleType,
            driverCar: vehicleModel,
            driverPlate: vehiclePlate,
            ratePerKm,
            baseFare,
          },
        });
      }

      // Parse and register all submitted vehicles (min 1, max 3)
      let vehiclesToRegister: Array<any> = [];
      if (request.vehiclesJson) {
        try {
          const parsed = JSON.parse(request.vehiclesJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            vehiclesToRegister = parsed.slice(0, 3);
          }
        } catch (e) {
          console.warn('Failed to parse vehiclesJson on approval:', e);
        }
      }

      if (vehiclesToRegister.length === 0) {
        vehiclesToRegister = [{
          vehicleType,
          modelName: vehicleModel,
          plateNumber: vehiclePlate,
          ratePerKm,
          baseFare,
          isPrimary: true,
        }];
      }

      for (let i = 0; i < vehiclesToRegister.length; i++) {
        const v = vehiclesToRegister[i];
        const cleanP = (v.plateNumber || '').toUpperCase().trim();
        const existingV = await prisma.driverVehicle.findFirst({
          where: { driverId: driverRecord.id, plateNumber: cleanP },
        });
        if (!existingV) {
          const vType = v.vehicleType || 'Car';
          const vt = vType.toLowerCase();
          const cat = vt.includes('auto') ? 'auto' : vt.includes('bike') ? 'bike' : (vt.includes('truck') || vt.includes('tempo')) ? 'commercial' : 'normal';

          await prisma.driverVehicle.create({
            data: {
              driverId: driverRecord.id,
              userId: request.userId,
              vehicleType: vType,
              modelName: v.modelName || 'Commercial Vehicle',
              plateNumber: cleanP,
              ratePerKm: parseFloat(String(v.ratePerKm)) || 20.0,
              baseFare: parseFloat(String(v.baseFare)) || 30.0,
              categoryCode: cat,
              isPrimary: i === 0,
              isActive: true,
            },
          });
        }
      }
    }

    // 4. Send targeted celebration notification to the approved user
    const roleFriendlyName =
      request.role === Role.MERCHANT
        ? 'Shop Keeper'
        : request.role === Role.DIGITAL_SERVICE_PROVIDER
        ? 'Digital Service Provider'
        : request.role === Role.MANUAL_SERVICE_PROVIDER
        ? 'Manual Service Provider'
        : 'Transport Operator';

    // 4. Send celebration push notification to the approved user
    await createAndSendNotification({
      userId: request.userId,
      title: '🎉 Application Approved!',
      message: `Congratulations! Your request to join CityLinks as a ${roleFriendlyName} has been approved. Your dashboard is now active!`,
      type: 'alert',
      route: '/dashboard',
    });

    // 5. Broadcast new store/service/driver to ALL citizens mobile notifications
    if (request.role === Role.MERCHANT) {
      await createAndSendNotification({
        userId: null,
        title: `🏪 New Store Open: ${request.shopName}!`,
        message: `${request.shopName} (${request.serviceType || 'Local Store'}) is now open in ${request.location || 'Haveri'}! Explore their storefront in Near by Shops.`,
        type: 'shop',
        route: '/shops',
      });
    } else if (request.role === Role.MANUAL_SERVICE_PROVIDER) {
      await createAndSendNotification({
        userId: null,
        title: `🛠️ New Service Partner: ${request.shopName}!`,
        message: `${request.shopName} (${request.serviceType || 'Home Services'}) is now available in Book Services.`,
        type: 'service',
        route: '/services',
      });
    } else if (request.role === Role.DIGITAL_SERVICE_PROVIDER) {
      await createAndSendNotification({
        userId: null,
        title: `💻 New Digital Specialist: ${request.shopName}!`,
        message: `${request.shopName} (${request.serviceType || 'Digital Services'}) is now available on CityLinks for digital projects.`,
        type: 'service',
        route: '/digital-services',
      });
    } else if (request.role === Role.TRANSPORT) {
      await createAndSendNotification({
        userId: null,
        title: `🚖 New Driver Partner: ${request.shopName}!`,
        message: `${request.shopName} is now accepting ride bookings in CityLinks Transport.`,
        type: 'transport',
        route: '/book-transport',
      });
    }

    return res.json({
      success: true,
      message: `User ${updatedUser.fullName || updatedUser.email} has been approved and upgraded to ${roleFriendlyName}.`,
      joinRequest: updatedRequest,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        role: updatedUser.role,
      },
    });
  } catch (error: any) {
    console.error('Error approving join request:', error);
    return res.status(500).json({ error: error.message || 'Failed to approve join request.' });
  }
});

/**
 * PATCH /api/join-requests/:id/reject
 * Super admin rejects a join request
 */
router.patch('/:id/reject', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { reason } = req.body;

    const request = await prisma.joinRequest.findUnique({
      where: { id },
    });

    if (!request) {
      return res.status(404).json({ error: 'Join request not found.' });
    }

    const updated = await prisma.joinRequest.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    // Notify user with Push Notification
    await createAndSendNotification({
      userId: request.userId,
      title: 'Join Request Status Update',
      message: `Your application for ${request.shopName} was not approved at this time. ${
        reason ? `Reason: ${reason}` : 'Please contact support for further details.'
      }`,
      type: 'info',
      route: '/join-us',
    });

    return res.json({
      success: true,
      message: 'Join request rejected.',
      joinRequest: updated,
    });
  } catch (error: any) {
    console.error('Error rejecting join request:', error);
    return res.status(500).json({ error: error.message || 'Failed to reject join request.' });
  }
});

export default router;
