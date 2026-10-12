import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import CustomerDashboard from "./pages/customer/CustomerDashboard.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import NotFound from "./pages/NotFound.tsx";
import LaborDashboard from "./pages/labor/LaborDashboard.tsx";
import LaborOnboarding from "./pages/labor/LaborOnboarding.tsx";
import LaborJobs from "./pages/labor/LaborJobs.tsx";
import LaborAvailability from "./pages/labor/LaborAvailability.tsx";
import LaborServices from "./pages/labor/LaborServices.tsx";
import LaborProfile from "./pages/labor/LaborProfile.tsx";
import MerchantDashboard from "./pages/merchant/MerchantDashboard.tsx";
import MerchantOnboarding from "./pages/merchant/MerchantOnboarding.tsx";
import MerchantBilling from "./pages/merchant/MerchantBilling.tsx";
import MerchantInventory from "./pages/merchant/MerchantInventory.tsx";
import MerchantBills from "./pages/merchant/MerchantBills.tsx";
import MerchantAnalytics from "./pages/merchant/MerchantAnalytics.tsx";
import MerchantProfile from "./pages/merchant/MerchantProfile.tsx";
import MerchantOrders from "./pages/merchant/MerchantOrders.tsx";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard.tsx";
import EmployeeApprovals from "./pages/employee/EmployeeApprovals.tsx";
import EmployeeSupport from "./pages/employee/EmployeeSupport.tsx";
import EmployeeLocations from "./pages/employee/EmployeeLocations.tsx";
import EmployeeAudit from "./pages/employee/EmployeeAudit.tsx";
import EmployeeProfile from "./pages/employee/EmployeeProfile.tsx";
import EmployeeCreateUser from "./pages/employee/EmployeeCreateUser.tsx";
import EmployeeOrders from "./pages/employee/EmployeeOrders.tsx";
import EmployeeAds from "./pages/employee/EmployeeAds.tsx";
import TransportationDashboard from "./pages/transportation/TransportationDashboard.tsx";
import TransportationOnboarding from "./pages/transportation/TransportationOnboarding.tsx";
import TransportationVehicles from "./pages/transportation/TransportationVehicles.tsx";
import TransportationRides from "./pages/transportation/TransportationRides.tsx";
import TransportationEarnings from "./pages/transportation/TransportationEarnings.tsx";
import TransportationProfile from "./pages/transportation/TransportationProfile.tsx";
import CustomerOrders from "./pages/customer/CustomerOrders.tsx";
import NearbyShops from "./pages/customer/NearbyShops.tsx";
import ShopsPage from "./pages/customer/ShopsPage.tsx";
import TransportationPage from "./pages/customer/TransportationPage.tsx";
import ServicesPage from "./pages/customer/ServicesPage.tsx";
import BookTransportPage from "./pages/customer/BookTransportPage.tsx";
import ShopDetailPage from "./pages/customer/ShopDetailPage.tsx";
import SearchPage from "./pages/customer/SearchPage.tsx";
import DealsPage from "./pages/customer/DealsPage.tsx";
import DigitalServicesPage from "./pages/customer/DigitalServicesPage.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<CustomerDashboard />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/shops" element={<ShopsPage />} />
              <Route path="/nearby-shops" element={<NearbyShops />} />
              <Route path="/orders" element={<CustomerOrders />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/labor" element={<LaborDashboard />} />
              <Route path="/labor/onboarding" element={<LaborOnboarding />} />
              <Route path="/labor/jobs" element={<LaborJobs />} />
              <Route path="/labor/availability" element={<LaborAvailability />} />
              <Route path="/labor/services" element={<LaborServices />} />
              <Route path="/labor/profile" element={<LaborProfile />} />
              <Route path="/merchant" element={<MerchantDashboard />} />
              <Route path="/merchant/onboarding" element={<MerchantOnboarding />} />
              <Route path="/merchant/billing" element={<MerchantBilling />} />
              <Route path="/merchant/inventory" element={<MerchantInventory />} />
              <Route path="/merchant/bills" element={<MerchantBills />} />
              <Route path="/merchant/analytics" element={<MerchantAnalytics />} />
              <Route path="/merchant/profile" element={<MerchantProfile />} />
              <Route path="/merchant/orders" element={<MerchantOrders />} />
              <Route path="/employee" element={<EmployeeDashboard />} />
              <Route path="/employee/approvals" element={<EmployeeApprovals />} />
              <Route path="/employee/support" element={<EmployeeSupport />} />
              <Route path="/employee/locations" element={<EmployeeLocations />} />
              <Route path="/employee/audit" element={<EmployeeAudit />} />
              <Route path="/employee/profile" element={<EmployeeProfile />} />
              <Route path="/employee/create-user" element={<EmployeeCreateUser />} />
              <Route path="/employee/orders" element={<EmployeeOrders />} />
              <Route path="/employee/ads" element={<EmployeeAds />} />
              <Route path="/transportation" element={<TransportationDashboard />} />
              <Route path="/transportation/onboarding" element={<TransportationOnboarding />} />
              <Route path="/transportation/vehicles" element={<TransportationVehicles />} />
              <Route path="/transportation/rides" element={<TransportationRides />} />
              <Route path="/transportation/earnings" element={<TransportationEarnings />} />
              <Route path="/transportation/profile" element={<TransportationProfile />} />
              <Route path="/deals" element={<DealsPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/digital-services" element={<DigitalServicesPage />} />
              <Route path="/digital" element={<DigitalServicesPage />} />
              <Route path="/book-transport" element={<BookTransportPage />} />
              <Route path="/transport" element={<TransportationPage />} />
              <Route path="/shop/:id" element={<ShopDetailPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/login" element={<AuthPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
